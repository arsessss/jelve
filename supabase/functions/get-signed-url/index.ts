import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_BUCKETS = new Set(['profile-pictures', 'chat-files', 'jozveh-files']);
const DEFAULT_EXPIRES_IN = 60 * 60; // 1 hour

interface Req {
  token: string;
  items: Array<{ bucket: string; path: string }>;
  expires_in?: number;
}

function extractPath(bucket: string, value: string): string {
  if (!value) return value;
  // If it's a full Supabase public URL, extract the object path
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = value.indexOf(marker);
  if (idx !== -1) return value.substring(idx + marker.length);
  const marker2 = `/storage/v1/object/sign/${bucket}/`;
  const idx2 = value.indexOf(marker2);
  if (idx2 !== -1) {
    const rest = value.substring(idx2 + marker2.length);
    return rest.split('?')[0];
  }
  return value.replace(/^\/+/, '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Req;
    const { token, items } = body;
    const expiresIn = Math.min(Math.max(body.expires_in ?? DEFAULT_EXPIRES_IN, 60), 60 * 60 * 24);

    if (!token || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: 'token and items required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (items.length > 100) {
      return new Response(JSON.stringify({ error: 'too many items' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Validate session
    const { data: session } = await supabase
      .from('user_sessions')
      .select('user_id, expires_at')
      .eq('token', token)
      .maybeSingle();

    if (!session || new Date(session.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'نشست شما منقضی شده است' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: Array<{ bucket: string; path: string; signedUrl: string | null; error?: string }> = [];
    for (const it of items) {
      if (!ALLOWED_BUCKETS.has(it.bucket)) {
        results.push({ bucket: it.bucket, path: it.path, signedUrl: null, error: 'bucket not allowed' });
        continue;
      }
      const cleanPath = extractPath(it.bucket, it.path);
      if (!cleanPath) {
        results.push({ bucket: it.bucket, path: it.path, signedUrl: null, error: 'invalid path' });
        continue;
      }
      const { data, error } = await supabase.storage.from(it.bucket).createSignedUrl(cleanPath, expiresIn);
      if (error || !data) {
        results.push({ bucket: it.bucket, path: it.path, signedUrl: null, error: error?.message ?? 'failed' });
      } else {
        results.push({ bucket: it.bucket, path: it.path, signedUrl: data.signedUrl });
      }
    }

    return new Response(JSON.stringify({ results, expires_in: expiresIn }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});