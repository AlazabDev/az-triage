import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, Sheet as SheetIcon, FileText } from "lucide-react";

interface Props {
  fileKind: "excel" | "pdf";
  filename?: string | null;
  rows: Record<string, any>[];
  pdfUrl?: string | null;
  /** نص للبحث السريع يُملأ تلقائيًا من البند المحدد */
  highlight?: string;
}

/** عارض الملف المرجعي: جدول الإكسيل قابل للبحث، أو ملف PDF بتمرير حر. */
export function ReferencePane({ fileKind, filename, rows, pdfUrl, highlight }: Props) {
  const [q, setQ] = useState("");
  const term = (q || "").trim();

  const columns = useMemo(() => (rows.length ? Object.keys(rows[0]) : []), [rows]);
  const filtered = useMemo(() => {
    const t = (term || highlight || "").trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(t)));
  }, [rows, term, highlight]);

  if (fileKind === "pdf") {
    return (
      <div className="h-full flex flex-col bg-background" dir="rtl">
        <div className="flex items-center gap-2 border-b px-3 py-2 text-xs">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="truncate">{filename ?? "الملف المرجعي"}</span>
        </div>
        {pdfUrl ? (
          <iframe title="الملف المرجعي" src={pdfUrl} className="flex-1 w-full" />
        ) : (
          <div className="flex-1 grid place-items-center text-sm text-muted-foreground">لا يوجد ملف مرجعي</div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background" dir="rtl">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <SheetIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs truncate max-w-[40%]">{filename ?? "مستخلص Excel"}</span>
        <div className="relative flex-1">
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={highlight ? `بحث (مرشّح: ${highlight.slice(0, 20)}…)` : "بحث في المستخلص..."}
            className="h-7 pr-7 text-xs"
          />
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0">{filtered.length} صف</span>
      </div>

      {rows.length === 0 ? (
        <div className="flex-1 grid place-items-center text-sm text-muted-foreground p-4 text-center">
          لا يوجد ملف مرجعي في هذه الجلسة. أضف ملف Excel أو PDF عند إنشاء الجلسة.
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-muted">
              <tr>
                <th className="px-2 py-1 text-right font-semibold border-b">#</th>
                {columns.map((c) => (
                  <th key={c} className="px-2 py-1 text-right font-semibold border-b whitespace-nowrap">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 500).map((r, i) => (
                <tr key={i} className="odd:bg-muted/20 hover:bg-primary/5">
                  <td className="px-2 py-1 border-b text-muted-foreground">{i + 1}</td>
                  {columns.map((c) => (
                    <td key={c} className="px-2 py-1 border-b align-top">
                      {String(r[c] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
