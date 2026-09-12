import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseProjectUrl,
  isSupabaseUrlConfigured,
} from "./config";

let browserClient: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return !!(
    isSupabaseUrlConfigured() &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

/** Browser / client-component Supabase client (anon key). */
export function getSupabaseBrowser(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (browserClient) return browserClient;

  const url = getSupabaseProjectUrl();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;

  browserClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return browserClient;
}
