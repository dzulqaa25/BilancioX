import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const rawUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const rawKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

/**
 * Jika pengguna tidak sengaja mengisi NEXT_PUBLIC_SUPABASE_URL dengan publishable key
 * (bukan https://xxx.supabase.co), ekstrak project ref otomatis dari JWT anon key.
 */
function resolveSupabaseUrl(urlInput: string, jwtKey: string): string | null {
  if (/^https?:\/\//i.test(urlInput)) return urlInput;
  if (/^[a-z0-9]{20}$/i.test(urlInput)) return `https://${urlInput}.supabase.co`;
  try {
    const parts = jwtKey.split(".");
    if (parts.length === 3) {
      const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const json = JSON.parse(atob(b64)) as { ref?: string };
      if (json.ref) return `https://${json.ref}.supabase.co`;
    }
  } catch {
    /* abaikan jika bukan JWT */
  }
  return null;
}

const resolvedUrl = resolveSupabaseUrl(rawUrl, rawKey);
const resolvedKey = rawKey || (rawUrl.startsWith("sb_publishable_") ? rawUrl : "");

/** true jika URL dan kunci Supabase valid & siap dipakai. */
export const isSupabaseConfigured = Boolean(resolvedUrl && resolvedKey);

let client: SupabaseClient | null = null;

/** Klien Supabase untuk browser (sesi login disimpan di localStorage). */
export function getSupabase(): SupabaseClient {
  if (!resolvedUrl || !resolvedKey) {
    throw new Error("Supabase belum dikonfigurasi dengan benar.");
  }
  if (!client) {
    client = createClient(resolvedUrl, resolvedKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return client;
}
