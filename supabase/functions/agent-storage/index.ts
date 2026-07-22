// Edge function: expose az-storage-maint contents to the Foundry agent.
// Auth via X-Agent-Key header matching AGENT_STORAGE_KEY secret.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const BUCKET = 'az-storage-maint';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-key',
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-key',
      },
    });
  }

  const expected = Deno.env.get('AGENT_STORAGE_KEY');
  const url = new URL(req.url);
  const provided = req.headers.get('x-agent-key') || url.searchParams.get('key');
  if (!expected || provided !== expected) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const action = url.searchParams.get('action') || 'list';

  try {
    if (action === 'list') {
      const prefix = url.searchParams.get('prefix') || '';
      const { data, error } = await admin.storage.from(BUCKET).list(prefix, {
        limit: 500,
        sortBy: { column: 'created_at', order: 'desc' },
      });
      if (error) return json({ error: error.message }, 500);
      return json({
        bucket: BUCKET,
        count: data?.length ?? 0,
        files: (data ?? [])
          .filter((f) => f.name && !f.name.startsWith('.'))
          .map((f) => ({
            name: f.name,
            size: f.metadata?.size,
            mimetype: f.metadata?.mimetype,
            created_at: f.created_at,
            updated_at: f.updated_at,
          })),
      });
    }

    if (action === 'url') {
      const name = url.searchParams.get('name');
      if (!name) return json({ error: 'name required' }, 400);
      const expires = parseInt(url.searchParams.get('expires') || '3600', 10);
      const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(name, expires);
      if (error) return json({ error: error.message }, 500);
      return json({ name, signed_url: data.signedUrl, expires_in: expires });
    }

    if (action === 'get') {
      const name = url.searchParams.get('name');
      if (!name) return json({ error: 'name required' }, 400);
      const { data, error } = await admin.storage.from(BUCKET).download(name);
      if (error || !data) return json({ error: error?.message || 'not found' }, 404);
      const ext = name.split('.').pop()?.toLowerCase();
      const text = await data.text();
      if (ext === 'json' || ext === 'jsonl') {
        try {
          return json({ name, format: ext, content: JSON.parse(text) });
        } catch {
          return json({ name, format: ext, raw: text });
        }
      }
      return json({ name, format: ext, content: text });
    }

    if (action === 'delete' && req.method === 'DELETE') {
      const name = url.searchParams.get('name');
      if (!name) return json({ error: 'name required' }, 400);
      const { error } = await admin.storage.from(BUCKET).remove([name]);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, deleted: name });
    }

    return json({ error: `Unknown action: ${action}`, supported: ['list', 'get', 'url', 'delete'] }, 400);
  } catch (e) {
    console.error('agent-storage error', e);
    return json({ error: (e as Error).message }, 500);
  }
});
