// Edge function: send a receipt page image to the Microsoft Foundry agent
// and return structured line items.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const FOUNDRY_ENDPOINT = 'https://az-ai-resource.services.ai.azure.com/api/projects/az-ai-gateway';
const API_VERSION = '2024-12-01-preview';

interface ExtractRequest {
  pageId: string;
}

interface FoundryItem {
  item_index?: number;
  description?: string;
  unit?: string;
  quantity?: number | string;
  unit_price?: number | string;
  total?: number | string;
}

interface FoundryPayload {
  receipt_code?: string;
  branch?: string;
  supplier?: string;
  invoice_number?: string;
  receipt_date?: string;
  items?: FoundryItem[];
}

const SYSTEM_INSTRUCTIONS = `أنت وكيل متخصص في قراءة إذون استلام أعمال الصيانة المكتوبة بالعربية (يدوية أو مطبوعة).
مهمتك: من صورة إذن استلام واحد، استخرج:
- receipt_code: رقم الإذن كما هو مكتوب أعلى المستند (لو غير موجود ضع "").
- branch: اسم الفرع أو الموقع.
- supplier: اسم المورد/الشركة.
- invoice_number: رقم الفاتورة.
- receipt_date: التاريخ بصيغة YYYY-MM-DD إن أمكن.
- items: قائمة البنود، كل بند فيه: item_index (رقم البند بالترتيب من 1)، description (نص وصف الصيانة كما هو)، unit، quantity، unit_price، total.

قواعد صارمة:
1. اقرأ الكتابة اليدوية بأقصى دقة ممكنة حتى لو غير واضحة. استعن بالسياق (نوع الأعمال، المفردات المتكررة).
2. لا تخترع بنوداً. لو خانة فارغة اتركها null.
3. أرجع JSON فقط بدون أي شرح أو نص إضافي.
4. الأرقام كأرقام (لا نصوص)، النصوص العربية كما هي.

مثال الشكل:
{"receipt_code":"5-02","branch":"مول طنطا","supplier":"ابو عوف","invoice_number":"123","receipt_date":"2025-11-03","items":[{"item_index":1,"description":"تركيب مفصلة بابية","unit":"عدد","quantity":1,"unit_price":null,"total":null}]}`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (claimsErr || !claims?.claims) return json({ error: 'Unauthorized' }, 401);

    const body = (await req.json()) as ExtractRequest;
    if (!body?.pageId) return json({ error: 'pageId is required' }, 400);

    // Fetch page + owner check via RLS
    const { data: page, error: pageErr } = await supabase
      .from('receipt_pages')
      .select('id, session_id, image_path, page_index, document_id')
      .eq('id', body.pageId)
      .maybeSingle();
    if (pageErr || !page) return json({ error: 'Page not found', details: pageErr }, 404);

    // Signed URL for the image
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: signed, error: signErr } = await admin.storage
      .from('maintenance-receipts')
      .createSignedUrl(page.image_path, 60 * 10);
    if (signErr || !signed?.signedUrl) return json({ error: 'Cannot sign image', details: signErr }, 500);

    // Fetch image bytes and base64-encode for Foundry
    const imgRes = await fetch(signed.signedUrl);
    if (!imgRes.ok) return json({ error: 'Cannot fetch page image' }, 500);
    const imgBuf = new Uint8Array(await imgRes.arrayBuffer());
    const b64 = base64Encode(imgBuf);
    const mime = imgRes.headers.get('content-type') || 'image/png';

    // Mark processing
    await admin.from('receipt_pages').update({ extraction_status: 'processing', extraction_error: null }).eq('id', page.id);

    const apiKey = Deno.env.get('AZURE_FOUNDRY_API_KEY');
    const agentId = Deno.env.get('AZURE_FOUNDRY_AGENT_ID');
    if (!apiKey || !agentId) {
      await admin.from('receipt_pages').update({ extraction_status: 'failed', extraction_error: 'Foundry credentials missing' }).eq('id', page.id);
      return json({ error: 'Foundry credentials missing' }, 500);
    }

    // 1. Create thread
    const thread = await foundry(`/threads?api-version=${API_VERSION}`, apiKey, 'POST', {});
    if (!thread.ok) return failPage(admin, page.id, `thread: ${thread.status} ${thread.text}`);

    // 2. Add message with image
    const msg = await foundry(`/threads/${thread.data.id}/messages?api-version=${API_VERSION}`, apiKey, 'POST', {
      role: 'user',
      content: [
        { type: 'text', text: SYSTEM_INSTRUCTIONS + '\n\nحلل الصورة المرفقة وأرجع JSON فقط.' },
        { type: 'image_url', image_url: { url: `data:${mime};base64,${b64}` } },
      ],
    });
    if (!msg.ok) return failPage(admin, page.id, `message: ${msg.status} ${msg.text}`);

    // 3. Run agent
    const run = await foundry(`/threads/${thread.data.id}/runs?api-version=${API_VERSION}`, apiKey, 'POST', {
      assistant_id: agentId,
    });
    if (!run.ok) return failPage(admin, page.id, `run: ${run.status} ${run.text}`);

    // 4. Poll status
    let status = run.data.status;
    let runId = run.data.id;
    const deadline = Date.now() + 90_000;
    while (['queued', 'in_progress', 'requires_action'].includes(status) && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 1500));
      const poll = await foundry(`/threads/${thread.data.id}/runs/${runId}?api-version=${API_VERSION}`, apiKey, 'GET');
      if (!poll.ok) return failPage(admin, page.id, `poll: ${poll.status} ${poll.text}`);
      status = poll.data.status;
    }
    if (status !== 'completed') return failPage(admin, page.id, `run status: ${status}`);

    // 5. List messages, pick latest assistant
    const list = await foundry(`/threads/${thread.data.id}/messages?api-version=${API_VERSION}&order=desc&limit=5`, apiKey, 'GET');
    if (!list.ok) return failPage(admin, page.id, `list: ${list.status} ${list.text}`);

    const assistantMsg = list.data.data?.find((m: any) => m.role === 'assistant');
    const text = assistantMsg?.content?.map((c: any) => c.text?.value ?? '').join('\n') ?? '';
    const parsed = parseJson(text);
    if (!parsed) return failPage(admin, page.id, `parse failed: ${text.slice(0, 200)}`);

    // Persist page fields + items
    const pageUpdate: Record<string, unknown> = {
      extraction_status: 'done',
      extraction_error: null,
    };
    if (parsed.receipt_code && !/^page-\d+$/i.test(parsed.receipt_code)) pageUpdate.receipt_code = parsed.receipt_code;
    if (parsed.branch) pageUpdate.branch = parsed.branch;
    if (parsed.supplier) pageUpdate.supplier = parsed.supplier;
    if (parsed.invoice_number) pageUpdate.invoice_number = parsed.invoice_number;
    if (parsed.receipt_date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.receipt_date)) pageUpdate.receipt_date = parsed.receipt_date;
    await admin.from('receipt_pages').update(pageUpdate).eq('id', page.id);

    // Clear existing items and reinsert
    await admin.from('receipt_items').delete().eq('page_id', page.id);
    const receiptCode = String(pageUpdate.receipt_code ?? '');
    const rowsToInsert = (parsed.items ?? []).map((it, idx) => ({
      session_id: page.session_id,
      page_id: page.id,
      item_index: it.item_index ?? idx + 1,
      item_code: receiptCode ? `${receiptCode}-${String(it.item_index ?? idx + 1).padStart(2, '0')}` : `${page.page_index}-${String(idx + 1).padStart(2, '0')}`,
      description: (it.description ?? '').toString().slice(0, 1000),
      unit: it.unit ?? null,
      quantity: toNum(it.quantity),
      unit_price: toNum(it.unit_price),
      total: toNum(it.total),
      match_status: 'unmatched',
      ai_raw: it,
    }));
    if (rowsToInsert.length) {
      const { error: insErr } = await admin.from('receipt_items').insert(rowsToInsert);
      if (insErr) return failPage(admin, page.id, `insert items: ${insErr.message}`);
    }

    return json({ ok: true, items: rowsToInsert.length, extracted: parsed });
  } catch (e) {
    console.error('extract error', e);
    return json({ error: (e as Error).message }, 500);
  }
});

async function foundry(path: string, apiKey: string, method: string, body?: unknown) {
  const res = await fetch(`${FOUNDRY_ENDPOINT}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'OpenAI-Beta': 'assistants=v2',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* keep raw */ }
  return { ok: res.ok, status: res.status, text, data };
}

async function failPage(admin: any, pageId: string, msg: string) {
  console.error('foundry-extract failed', pageId, msg);
  await admin.from('receipt_pages').update({ extraction_status: 'failed', extraction_error: msg.slice(0, 500) }).eq('id', pageId);
  return json({ error: msg }, 502);
}

function parseJson(txt: string): FoundryPayload | null {
  if (!txt) return null;
  const cleaned = txt.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  try { return JSON.parse(cleaned); } catch { /* try to find first {...} */ }
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return isFinite(n) ? n : null;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function base64Encode(bytes: Uint8Array): string {
  let s = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any);
  }
  return btoa(s);
}
