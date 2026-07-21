// Local fuzzy matching between extracted receipt items and Excel rows.
export interface ExcelRow {
  [key: string]: string | number | null;
}

export interface ItemForMatch {
  id: string;
  description: string;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
}

export interface MatchResult {
  status: 'confirmed' | 'partial' | 'needs_review' | 'not_in_receipt' | 'unmatched';
  score: number;
  row: ExcelRow | null;
}

function normalize(s: string): string {
  return s
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[ًٌٍَُِّْـ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function tokens(s: string): Set<string> {
  return new Set(normalize(s).split(/\s+/).filter((t) => t.length > 1));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  a.forEach((t) => { if (b.has(t)) inter++; });
  return inter / (a.size + b.size - inter);
}

export function reconcileItem(
  item: ItemForMatch,
  rows: ExcelRow[],
  descKey: string,
  qtyKey?: string,
): MatchResult {
  if (!rows.length) return { status: 'unmatched', score: 0, row: null };
  const itemToks = tokens(item.description);
  let best: { score: number; row: ExcelRow } | null = null;
  for (const row of rows) {
    const rDesc = String(row[descKey] ?? '');
    if (!rDesc) continue;
    const score = jaccard(itemToks, tokens(rDesc));
    if (!best || score > best.score) best = { score, row };
  }
  if (!best || best.score < 0.2) return { status: 'unmatched', score: best?.score ?? 0, row: null };
  const qtyOk = qtyKey && item.quantity != null
    ? Math.abs(Number(best.row[qtyKey] ?? NaN) - item.quantity) < 0.001
    : true;
  if (best.score >= 0.75 && qtyOk) return { status: 'confirmed', score: best.score, row: best.row };
  if (best.score >= 0.5) return { status: 'partial', score: best.score, row: best.row };
  return { status: 'needs_review', score: best.score, row: best.row };
}
