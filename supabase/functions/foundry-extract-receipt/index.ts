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
      .select('id, session_id, image_path, page_index, document_id, receipt_code')
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

    let parsed: FoundryPayload | null = null;
    const problems: string[] = [];

    if (apiKey && agentId) {
      try {
        parsed = await runFoundry(apiKey, agentId, mime, b64);
      } catch (e) {
        problems.push(`foundry: ${(e as Error).message}`);
      }
    } else {
      problems.push('foundry: credentials missing');
    }

    // Fallback: Lovable AI (multimodal) so the pipeline always produces items.
    if (!parsed) {
      try {
        parsed = await runLovableAi(mime, b64);
      } catch (e) {
        problems.push(`lovable-ai: ${(e as Error).message}`);
      }
    }

    if (!parsed) return failPage(admin, page.id, problems.join(' | '));

    const receiptCode = (parsed.receipt_code && !/^page-\d+$/i.test(parsed.receipt_code))
      ? parsed.receipt_code
      : (page as any).receipt_code ?? String(page.page_index);


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

    const aiEndpoint = Deno.env.get('AZURE_COGNITIVE_ENDPOINT');
    const aiKey = Deno.env.get('AZURE_COGNITIVE_KEY1');

    // Generate Embeddings
    let docEmbedding: number[] | null = null;
    const pageText = parsed.items?.map(it => it.description).join('\n') || parsed.branch || 'Receipt Page';
    if (aiEndpoint && aiKey) {
      docEmbedding = await generateEmbedding(pageText, aiEndpoint, aiKey);
    }

    if (docEmbedding) {
      await admin.from('document_embeddings').insert({
        session_id: page.session_id,
        document_id: page.document_id,
        content: pageText,
        embedding: `[${docEmbedding.join(',')}]`,
        metadata: { page_id: page.id, receipt_code: receiptCode }
      });
    }

    // Clear existing items and reinsert
    await admin.from('receipt_items').delete().eq('page_id', page.id);
    const rowsToInsert = [];
    const itemEmbeddingsToInsert = [];
    
    for (let idx = 0; idx < (parsed.items ?? []).length; idx++) {
      const it = parsed.items![idx];
      const itemCode = receiptCode ? `${receiptCode}-${String(it.item_index ?? idx + 1).padStart(2, '0')}` : `${page.page_index}-${String(idx + 1).padStart(2, '0')}`;
      const description = (it.description ?? '').toString().slice(0, 1000);
      
      const itemRow = {
        session_id: page.session_id,
        page_id: page.id,
        item_index: it.item_index ?? idx + 1,
        item_code: itemCode,
        description: description,
        unit: it.unit ?? null,
        quantity: toNum(it.quantity),
        unit_price: toNum(it.unit_price),
        total: toNum(it.total),
        match_status: 'unmatched',
        ai_raw: it,
      };
      
      const { data: insertedItem, error: insErr } = await admin.from('receipt_items').insert(itemRow).select('id').single();
      if (!insErr && insertedItem && description && aiEndpoint && aiKey) {
        const itemEmb = await generateEmbedding(description, aiEndpoint, aiKey);
        if (itemEmb) {
          itemEmbeddingsToInsert.push({
            item_id: insertedItem.id,
            session_id: page.session_id,
            content: description,
            embedding: `[${itemEmb.join(',')}]`,
            metadata: { item_code: itemCode }
          });
        }
      }
      rowsToInsert.push(itemRow);
    }
    
    if (itemEmbeddingsToInsert.length > 0) {
      await admin.from('item_embeddings').insert(itemEmbeddingsToInsert);
    }

    return json({ ok: true, items: rowsToInsert.length, extracted: parsed });
  } catch (e) {
    console.error('extract error', e);
    return json({ error: (e as Error).message }, 500);
  }
});

async function runFoundry(apiKey: string, agentId: string, mime: string, b64: string): Promise<FoundryPayload | null> {
  const thread = await foundry(`/threads?api-version=${API_VERSION}`, apiKey, 'POST', {});
  if (!thread.ok) throw new Error(`thread ${thread.status} ${thread.text.slice(0, 200)}`);

  const msg = await foundry(`/threads/${thread.data.id}/messages?api-version=${API_VERSION}`, apiKey, 'POST', {
    role: 'user',
    content: [
      { type: 'text', text: SYSTEM_INSTRUCTIONS + '\n\nحلل الصورة المرفقة وأرجع JSON فقط.' },
      { type: 'image_url', image_url: { url: `data:${mime};base64,${b64}` } },
    ],
  });
  if (!msg.ok) throw new Error(`message ${msg.status} ${msg.text.slice(0, 200)}`);

  const run = await foundry(`/threads/${thread.data.id}/runs?api-version=${API_VERSION}`, apiKey, 'POST', { assistant_id: agentId });
  if (!run.ok) throw new Error(`run ${run.status} ${run.text.slice(0, 200)}`);

  let status = run.data.status;
  const deadline = Date.now() + 90_000;
  while (['queued', 'in_progress', 'requires_action'].includes(status) && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500));
    const poll = await foundry(`/threads/${thread.data.id}/runs/${run.data.id}?api-version=${API_VERSION}`, apiKey, 'GET');
    if (!poll.ok) throw new Error(`poll ${poll.status}`);
    status = poll.data.status;
  }
  if (status !== 'completed') throw new Error(`run status ${status}`);

  const list = await foundry(`/threads/${thread.data.id}/messages?api-version=${API_VERSION}&order=desc&limit=5`, apiKey, 'GET');
  if (!list.ok) throw new Error(`list ${list.status}`);
  const assistantMsg = list.data.data?.find((m: any) => m.role === 'assistant');
  const text = assistantMsg?.content?.map((c: any) => c.text?.value ?? '').join('\n') ?? '';
  const parsed = parseJson(text);
  if (!parsed) throw new Error(`parse failed: ${text.slice(0, 200)}`);
  return parsed;
}

async function runLovableAi(mime: string, b64: string): Promise<FoundryPayload | null> {
  const key = Deno.env.get('LOVABLE_API_KEY');
  if (!key) throw new Error('LOVABLE_API_KEY missing');
  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Lovable-API-Key': key },
    body: JSON.stringify({
      model: 'openai/gpt-5.6-sol',
      reasoning_effort: 'none',
      messages: [
        { role: 'system', content: SYSTEM_INSTRUCTIONS },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'حلل صورة إذن الاستلام وأرجع JSON فقط.' },
            { type: 'image_url', image_url: { url: `data:${mime};base64,${b64}` } },
          ],
        },
      ],
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`gateway ${res.status} ${text.slice(0, 300)}`);
  let content = '';
  try { content = JSON.parse(text)?.choices?.[0]?.message?.content ?? ''; } catch { content = text; }
  const parsed = parseJson(content);
  if (!parsed) throw new Error(`parse failed: ${content.slice(0, 200)}`);
  return parsed;
}

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

async function generateEmbedding(text: string, endpoint: string, apiKey: string): Promise<number[] | null> {
  if (!text) return null;
  try {
    const deployment = Deno.env.get('AZURE_EMBEDDING_DEPLOYMENT') || 'text-embedding-3-large';
    const apiVersion = '2023-05-15'; 
    
    let baseUrl = endpoint;
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
    
    const url = `${baseUrl}/openai/deployments/${deployment}/embeddings?api-version=${apiVersion}`;
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({ input: text })
    });
    
    if (!res.ok) {
      console.error('Embedding failed', res.status, await res.text());
      return null;
    }
    const json = await res.json();
    return json.data?.[0]?.embedding ?? null;
  } catch(e) {
    console.error('embedding error', e);
    return null;
  }
}

