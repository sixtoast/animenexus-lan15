/**
 * Server-side Supabase client (API routes / Node).
 * Always uses validated project origin from lib/supabase/config.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseProjectUrl } from "./config";

/**
 * Service or anon client for server routes.
 * Returns null when URL/key missing or URL is malformed (never passes prose to fetch).
 */
export function getSupabaseServerClient(): SupabaseClient | null {
  let url: string | null;
  try {
    url = getSupabaseProjectUrl();
  } catch {
    // Misconfigured env (e.g. dashboard copy-paste) — soft-disable, do not fetch.
    return null;
  }

  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
