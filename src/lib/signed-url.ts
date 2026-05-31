import { supabase } from "@/integrations/supabase/client";
import { customAuth } from "./auth";
import { withRetry, extractErrorBody } from "./network-resilience";

type Bucket = "profile-pictures" | "chat-files" | "jozveh-files";

interface CacheEntry { url: string; expiresAt: number; }
const cache = new Map<string, CacheEntry>();
const pending = new Map<string, Promise<string | null>>();
const TTL_MS = 50 * 60 * 1000;

function cacheKey(bucket: string, value: string) { return `${bucket}::${value}`; }

async function fetchSigned(items: Array<{ bucket: Bucket; path: string }>): Promise<Record<string, string | null>> {
  const session = customAuth.getSession();
  if (!session) {
    const out: Record<string, string | null> = {};
    for (const it of items) out[cacheKey(it.bucket, it.path)] = null;
    return out;
  }
  try {
    const data = await withRetry(async () => {
      const { data, error } = await supabase.functions.invoke("get-signed-url", {
        body: { token: session.token, items },
      });
      if (error) {
        const body = await extractErrorBody(error);
        if (body) return body;
        throw error;
      }
      return data;
    });
    const out: Record<string, string | null> = {};
    const now = Date.now();
    for (const r of (data?.results || []) as Array<{ bucket: string; path: string; signedUrl: string | null }>) {
      const k = cacheKey(r.bucket, r.path);
      out[k] = r.signedUrl;
      if (r.signedUrl) cache.set(k, { url: r.signedUrl, expiresAt: now + TTL_MS });
    }
    return out;
  } catch {
    const out: Record<string, string | null> = {};
    for (const it of items) out[cacheKey(it.bucket, it.path)] = null;
    return out;
  }
}

export async function getSignedUrl(bucket: Bucket, value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  const k = cacheKey(bucket, value);
  const cached = cache.get(k);
  if (cached && cached.expiresAt > Date.now()) return cached.url;
  if (pending.has(k)) return pending.get(k)!;
  const p = fetchSigned([{ bucket, path: value }]).then((m) => m[k] ?? null).finally(() => pending.delete(k));
  pending.set(k, p);
  return p;
}

export function clearSignedUrlCache() { cache.clear(); }