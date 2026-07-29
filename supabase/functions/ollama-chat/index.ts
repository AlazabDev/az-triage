// وسيط آمن لنموذج Ollama: بيانات الاعتماد تبقى على الخادم فقط
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    // التحقق من جلسة المستخدم
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return json({ error: 'غير مصرح' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: 'غير مصرح' }, 401);

    const body = await req.json().catch(() => null);
    const messages = body?.messages;
    const tools = body?.tools;
    const model = typeof body?.model === 'string' ? body.model : 'qwen3.6:27b';

    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 100) {
      return json({ error: 'messages غير صالحة' }, 400);
    }
    if (tools !== undefined && !Array.isArray(tools)) {
      return json({ error: 'tools غير صالحة' }, 400);
    }

    const baseUrl = Deno.env.get('OLLAMA_BASE_URL');
    const basic = Deno.env.get('OLLAMA_BASIC_AUTH');
    if (!baseUrl || !basic) return json({ error: 'إعدادات الخادم ناقصة' }, 500);

    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + btoa(basic),
      },
      body: JSON.stringify({ model, messages, ...(tools ? { tools } : {}) }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('ollama error', res.status, text.slice(0, 500));
      return json({ error: 'فشل الاتصال بالنموذج' }, 502);
    }

    return json(await res.json());
  } catch (e) {
    console.error('ollama-chat error:', e);
    return json({ error: e instanceof Error ? e.message : 'خطأ غير متوقع' }, 500);
  }
});
