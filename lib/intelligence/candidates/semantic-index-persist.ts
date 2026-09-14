/**
 * Optional Supabase write-through for the in-memory semantic neighbour index.
 * Soft-fails when Supabase is not configured — memory index remains authoritative
 * for the process lifetime.
 */
import type { AnimePreferenceFingerprint } from "@/lib/intelligence/items/anime-preference-fingerprint";
import {
  indexFingerprint,
  seedSemanticIndex,
  type SemanticIndexEntry,
} from "./semantic-index";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const TABLE = "anime_semantic_index";

export type PersistResult = {
  ok: boolean;
  source: "supabase" | "skipped" | "error";
  error?: string;
};

/** Upsert one fingerprint into Supabase (server-only). */
export async function persistSemanticEntry(
  nexusId: string,
  fingerprint: AnimePreferenceFingerprint,
): Promise<PersistResult> {
  if (!nexusId || !fingerprint) {
    return { ok: false, source: "skipped", error: "missing args" };
  }
  const conf = fingerprint.confidence?.overall ?? 0;
  const sb = getSupabaseServerClient();
  if (!sb) return { ok: true, source: "skipped" };

  try {
    const { error } = await sb.from(TABLE).upsert(
      {
        nexus_id: nexusId,
        fingerprint: fingerprint as unknown as Record<string, unknown>,
        confidence: conf,
        fingerprint_source: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "nexus_id" },
    );
    if (error) {
      return { ok: false, source: "error", error: error.message };
    }
    return { ok: true, source: "supabase" };
  } catch (e) {
    return {
      ok: false,
      source: "error",
      error: e instanceof Error ? e.message : "persist failed",
    };
  }
}

/** Load recent high-confidence rows into the in-memory index (cold start). */
export async function loadSemanticIndexFromStore(opts?: {
  limit?: number;
  minConfidence?: number;
}): Promise<{ loaded: number; source: "supabase" | "skipped" | "error"; error?: string }> {
  const limit = opts?.limit ?? 200;
  const minConf = opts?.minConfidence ?? 0.35;
  const sb = getSupabaseServerClient();
  if (!sb) return { loaded: 0, source: "skipped" };

  try {
    const { data, error } = await sb
      .from(TABLE)
      .select("nexus_id, fingerprint, confidence")
      .gte("confidence", minConf)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) {
      return { loaded: 0, source: "error", error: error.message };
    }
    if (!data?.length) return { loaded: 0, source: "supabase" };

    const items: { nexusId: string; fingerprint: AnimePreferenceFingerprint }[] =
      [];
    for (const row of data) {
      const fp = row.fingerprint as AnimePreferenceFingerprint | null;
      if (!row.nexus_id || !fp) continue;
      items.push({ nexusId: row.nexus_id, fingerprint: fp });
    }
    const n = seedSemanticIndex(items);
    return { loaded: n, source: "supabase" };
  } catch (e) {
    return {
      loaded: 0,
      source: "error",
      error: e instanceof Error ? e.message : "load failed",
    };
  }
}

/**
 * Index in memory and best-effort persist.
 * Safe to call from retrieve / compare / fusion paths.
 */
export async function indexAndPersistFingerprint(
  nexusId: string,
  fingerprint: AnimePreferenceFingerprint,
): Promise<PersistResult> {
  indexFingerprint(nexusId, fingerprint);
  return persistSemanticEntry(nexusId, fingerprint);
}

/** Map a DB row shape to SemanticIndexEntry (for tests / debug). */
export function rowToEntry(row: {
  nexus_id: string;
  fingerprint: AnimePreferenceFingerprint;
  confidence: number;
  updated_at?: string;
}): SemanticIndexEntry {
  return {
    nexusId: row.nexus_id,
    animeId: row.fingerprint?.animeId ?? 0,
    fingerprint: row.fingerprint,
    confidence: row.confidence,
    updatedAt: row.updated_at ? Date.parse(row.updated_at) : Date.now(),
  };
}
