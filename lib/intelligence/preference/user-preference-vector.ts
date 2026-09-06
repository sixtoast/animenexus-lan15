/**
 * User Preference Vector V2 — aggregate fingerprints by interaction strength + recency.
 * Additive for V3 rank path; does not replace legacy preference-engine yet.
 */

import type { Anime, WatchlistEntry } from "@/lib/types";
import {
  buildAnimePreferenceFingerprint,
  emptyFingerprintVector,
  fingerprintToVector,
  type AnimePreferenceFingerprint,
  type FingerprintVector,
} from "@/lib/intelligence/items";
import { withSessionAnime } from "./session-signals";

export const PREFERENCE_MODEL_VERSION = "preference_v3";

export type UserPreferenceVector = {
  version: string;
  stable: FingerprintVector;
  mediumTerm: FingerprintVector;
  recent: FingerprintVector;
  session: FingerprintVector;
  confidence: number;
  evidenceCount: number;
};

function daysSince(iso?: string): number {
  if (!iso) return 9999;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 9999;
  return (Date.now() - t) / (24 * 60 * 60 * 1000);
}

export function interactionStrength(e: WatchlistEntry): number {
  const status = e.watchStatus;
  const eps =
    typeof e.episodes === "number"
      ? e.episodes
      : parseInt(String(e.episodes || ""), 10) || 0;
  const progress = e.progress || 0;
  const ratio = eps > 0 ? progress / eps : 0;

  if (status === "completed") return 1.0;
  if (status === "watching") return 0.55 + Math.min(0.35, ratio * 0.4);
  if (status === "paused" && progress > 0) return 0.45;
  if (status === "planning") return 0.25;
  if (status === "dropped") {
    return -0.35 * (ratio < 0.25 ? 1 : 0.5);
  }
  return 0.2;
}

function recencyWeight(days: number, halfLife: number): number {
  return Math.exp((-Math.LN2 * days) / halfLife);
}

function accumulate(
  target: FingerprintVector,
  fp: AnimePreferenceFingerprint,
  weight: number,
  counts: Record<string, number>,
) {
  if (Math.abs(weight) < 1e-6) return;
  const vec = fingerprintToVector(fp);
  for (const [k, val] of Object.entries(vec)) {
    const pull = val - 0.5;
    target[k] = (target[k] ?? 0.5) + pull * weight;
    counts[k] = (counts[k] || 0) + Math.abs(weight);
  }
}

function normalizeAccum(
  target: FingerprintVector,
  counts: Record<string, number>,
): FingerprintVector {
  const out = emptyFingerprintVector();
  for (const k of Object.keys(out)) {
    const c = counts[k] || 0;
    if (c < 1e-6) {
      out[k] = 0.5;
      continue;
    }
    const raw = target[k] ?? 0.5;
    const pullSum = raw - 0.5;
    const avgPull = pullSum / c;
    out[k] = Math.max(0, Math.min(1, 0.5 + avgPull));
  }
  return out;
}

export function buildUserPreferenceVector(
  entries: WatchlistEntry[],
  opts?: {
    fingerprints?: Map<number, AnimePreferenceFingerprint>;
    sessionAnime?: Anime[];
    /** When true (default on client), merge behaviour-session opens into sessionAnime */
    autoSession?: boolean;
  },
): UserPreferenceVector {
  const stableRaw = emptyFingerprintVector();
  const mediumRaw = emptyFingerprintVector();
  const recentRaw = emptyFingerprintVector();
  const sessionRaw = emptyFingerprintVector();
  const sc: Record<string, number> = {};
  const mc: Record<string, number> = {};
  const rc: Record<string, number> = {};
  const sesc: Record<string, number> = {};

  let evidence = 0;

  for (const e of entries) {
    let fp = opts?.fingerprints?.get(e.id);
    if (!fp) {
      fp = buildAnimePreferenceFingerprint({
        id: e.id,
        title: e.title,
        description: "",
        genre: (e.genres || e.tags || [])[0] || "",
        tags: e.genres || e.tags || [],
        status: "FINISHED",
        format: (e.format as never) || "TV",
        year: e.year || "",
        score: e.score || 0,
        popularity: 0,
        image: e.image,
        anilist_id: e.id,
        episodes: e.episodes ?? "",
        duration: e.duration || 24,
      });
    }
    const strength = interactionStrength(e);
    if (strength === 0) continue;
    evidence += Math.abs(strength);
    const days = daysSince(e.updatedAt);

    accumulate(stableRaw, fp, strength * recencyWeight(days, 365), sc);
    accumulate(mediumRaw, fp, strength * recencyWeight(days, 90), mc);
    accumulate(recentRaw, fp, strength * recencyWeight(days, 30), rc);
  }

  let sessionList = opts?.sessionAnime || [];
  if (
    opts?.autoSession !== false &&
    typeof window !== "undefined" &&
    sessionList.length < 12
  ) {
    try {
      sessionList = withSessionAnime(entries, sessionList);
    } catch {
      /* soft */
    }
  }

  for (const a of sessionList) {
    if (!a?.id) continue;
    const fp =
      opts?.fingerprints?.get(a.id) || buildAnimePreferenceFingerprint(a);
    const onShelf = entries.some((e) => e.id === a.id);
    const w = onShelf ? 0.28 : 0.42;
    accumulate(sessionRaw, fp, w, sesc);
    evidence += onShelf ? 0.15 : 0.28;
  }

  const confidence = Math.min(0.92, 0.15 + evidence * 0.08);

  return {
    version: PREFERENCE_MODEL_VERSION,
    stable: normalizeAccum(stableRaw, sc),
    mediumTerm: normalizeAccum(mediumRaw, mc),
    recent: normalizeAccum(recentRaw, rc),
    session: normalizeAccum(sessionRaw, sesc),
    confidence,
    evidenceCount: Math.round(evidence * 10) / 10,
  };
}

export function blendUserVector(
  u: UserPreferenceVector,
  weights?: {
    stable?: number;
    mediumTerm?: number;
    recent?: number;
    session?: number;
  },
): FingerprintVector {
  const w = {
    stable: weights?.stable ?? 0.45,
    mediumTerm: weights?.mediumTerm ?? 0.25,
    recent: weights?.recent ?? 0.2,
    session: weights?.session ?? 0.1,
  };
  const out = emptyFingerprintVector();
  const total = w.stable + w.mediumTerm + w.recent + w.session;
  for (const k of Object.keys(out)) {
    out[k] =
      ((u.stable[k] ?? 0.5) * w.stable +
        (u.mediumTerm[k] ?? 0.5) * w.mediumTerm +
        (u.recent[k] ?? 0.5) * w.recent +
        (u.session[k] ?? 0.5) * w.session) /
      total;
  }
  return out;
}
