/**
 * Fan-zone confessions — shared via Supabase when configured,
 * otherwise localStorage (offline / dev without env).
 */

import { getSupabaseBrowser, isSupabaseConfigured } from "./client";

const CONFESS_KEY = "anime_nexus_confessions_v1";
const MAX_LEN = 280;
const MAX_LIST = 40;

export type Confession = {
  id: string;
  text: string;
  at: string;
};

function readLocal(): Confession[] {
  if (typeof window === "undefined") return [];
  try {
    const j = JSON.parse(localStorage.getItem(CONFESS_KEY) || "[]");
    return Array.isArray(j) ? j : [];
  } catch {
    return [];
  }
}

function writeLocal(list: Confession[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONFESS_KEY, JSON.stringify(list.slice(0, MAX_LIST)));
}

function mapRow(row: { id: string; text: string; created_at: string }): Confession {
  return { id: row.id, text: row.text, at: row.created_at };
}

/** Load confessions (Supabase first, else local). */
export async function fetchConfessions(): Promise<{
  items: Confession[];
  source: "supabase" | "local";
}> {
  if (isSupabaseConfigured()) {
    const sb = getSupabaseBrowser();
    if (sb) {
      const { data, error } = await sb
        .from("confessions")
        .select("id, text, created_at")
        .order("created_at", { ascending: false })
        .limit(MAX_LIST);
      if (!error && data) {
        return {
          items: data.map(mapRow),
          source: "supabase",
        };
      }
      console.warn("[confessions] supabase read failed", error?.message);
    }
  }
  return { items: readLocal(), source: "local" };
}

/** Post a confession. Returns updated list when possible. */
export async function postConfession(text: string): Promise<{
  items: Confession[];
  source: "supabase" | "local";
  error?: string;
}> {
  const t = text.trim().slice(0, MAX_LEN);
  if (!t) {
    const cur = await fetchConfessions();
    return { ...cur, error: "Empty" };
  }

  if (isSupabaseConfigured()) {
    const sb = getSupabaseBrowser();
    if (sb) {
      const { error } = await sb.from("confessions").insert({ text: t });
      if (!error) {
        const refreshed = await fetchConfessions();
        return refreshed;
      }
      console.warn("[confessions] supabase insert failed", error.message);
      return {
        items: readLocal(),
        source: "local",
        error: error.message,
      };
    }
  }

  // Local fallback
  const next: Confession[] = [
    { id: `${Date.now()}`, text: t, at: new Date().toISOString() },
    ...readLocal(),
  ].slice(0, MAX_LIST);
  writeLocal(next);
  return { items: next, source: "local" };
}

export { isSupabaseConfigured, MAX_LEN };
