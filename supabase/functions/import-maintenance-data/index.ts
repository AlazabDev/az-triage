import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const DATA_URL =
  'https://az-triage.lovable.app/__l5e/assets-v1/a6c23b66-e420-449d-af40-1f3ca7c10648/maint-data.json';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(`fetch data failed [${res.status}]`);
    const { receipts, items } = await res.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { error: rErr } = await supabase
      .from('maintenance_receipts')
      .upsert(receipts, { onConflict: 'receipt_code' });
    if (rErr) throw rErr;

    await supabase.from('maintenance_items').delete().neq('receipt_code', '');

    for (let i = 0; i < items.length; i += 200) {
      const { error } = await supabase.from('maintenance_items').insert(items.slice(i, i + 200));
      if (error) throw error;
    }

    return new Response(
      JSON.stringify({ ok: true, receipts: receipts.length, items: items.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
