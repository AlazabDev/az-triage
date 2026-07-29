// يقدّم بيانات جلسة المشاركة لحاملي الرابط فقط: يتحقق من share_token هنا
// بصلاحية service_role، فمفيش أي صلاحية قراءة مباشرة للـ anon على الجداول.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const shareToken = typeof body?.shareToken === 'string' ? body.shareToken.trim() : '';

    if (!shareToken || shareToken.length < 8 || shareToken.length > 128) {
      return new Response(JSON.stringify({ error: 'shareToken غير صالح' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: session, error } = await supabase
      .from('reconciliation_sessions')
      .select('id, name, branch, session_date, status, notes, client_approved_at, client_approved_by, is_public')
      .eq('share_token', shareToken)
      .eq('is_public', true)
      .maybeSingle();

    if (error) throw error;
    if (!session) {
      return new Response(JSON.stringify({ error: 'الرابط غير صالح أو غير مفعّل' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const [{ data: pages }, { data: items }] = await Promise.all([
      supabase.from('receipt_pages').select('*').eq('session_id', session.id).order('page_index'),
      supabase.from('receipt_items').select('*').eq('session_id', session.id),
    ]);

    const imageUrls: Record<string, string> = {};
    for (const pg of pages ?? []) {
      const { data: signed } = await supabase.storage
        .from('maintenance-receipts')
        .createSignedUrl(pg.image_path, 3600);
      if (signed?.signedUrl) imageUrls[pg.id] = signed.signedUrl;
    }

    return new Response(JSON.stringify({ session, pages: pages ?? [], items: items ?? [], imageUrls }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('get-shared-session error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'خطأ غير متوقع' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
