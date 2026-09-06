/**
 * Taste contradictions — meaningful gaps between browse / start / complete.
 * Requires minimum evidence; never invents explicit stated preference.
 */

import type { WatchlistEntry } from "@/lib/types";
import { recentEvents } from "@/lib/behaviour-events";
import {
  buildAnimePreferenceFingerprint,
  emptyFingerprintVector,
  fingerprintToVector,
  type FingerprintVector,
} from "@/lib/intelligence/items";
import { humanizeDimKey } from "@/lib/intelligence/items/fingerprint-similarity";
import { buildCompletionProfile } from "@/lib/intelligence/outcomes/completion-profile";

export const TASTE_CONTRADICTIONS_VERSION = "contradictions_v1";

export type ContradictionEvidence = {
  kind: string;
  detail: string;
  count: number;
};

export type TasteContradiction = {
  id: string;
  claim: string;
  confidence: number;
  evidenceCount: number;
  supportingEvidence: ContradictionEvidence[];
};

function entryTags(e: WatchlistEntry): string[] {
  return (e.genres || e.tags || []).map((t) => String(t).toLowerCase());
}

function freqMap(items: string[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const t of items) {
    if (!t) continue;
    m[t] = (m[t] || 0) + 1;
  }
  return m;
}

function topKeys(m: Record<string, number>, limit = 5): string[] {
  return Object.entries(m)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k);
}

function share(m: Record<string, number>, key: string): number {
  const total = Object.values(m).reduce((a, b) => a + b, 0);
  if (total <= 0) return 0;
  return (m[key] || 0) / total;
}

export function detectTasteContradictions(
  entries: WatchlistEntry[],
  opts?: { minEvidence?: number; maxResults?: number },
): TasteContradiction[] {
  const minEvidence = opts?.minEvidence ?? 4;
  const maxResults = opts?.maxResults ?? 5;
  const out: TasteContradiction[] = [];

  const completed = entries.filter((e) => e.watchStatus === "completed");
  const planning = entries.filter((e) => e.watchStatus === "planning");
  const dropped = entries.filter((e) => e.watchStatus === "dropped");

  if (entries.length < minEvidence) return [];

  const planTags = freqMap(planning.flatMap(entryTags));
  const completeTags = freqMap(completed.flatMap(entryTags));
  const planTop = topKeys(planTags, 6);
  const completeTop = topKeys(completeTags, 6);

  for (const g of planTop) {
    const ps = share(planTags, g);
    const cs = share(completeTags, g);
    const planN = planTags[g] || 0;
    const completeN = completeTags[g] || 0;
    if (planN >= 3 && ps >= 0.12 && cs < ps - 0.12 && completeN <= planN * 0.4) {
      out.push({
        id: `plan_vs_complete_${g}`,
        claim: `You add ${g} titles often, but they show up less among finished shows.`,
        confidence: Math.min(0.85, 0.4 + planN * 0.06 + (ps - cs)),
        evidenceCount: planN + completeN,
        supportingEvidence: [
          { kind: "planning", detail: `${g} on shelf`, count: planN },
          { kind: "completed", detail: `${g} finished`, count: completeN },
        ],
      });
    }
  }

  for (const g of completeTop) {
    const cs = share(completeTags, g);
    const ps = share(planTags, g);
    const completeN = completeTags[g] || 0;
    const planN = planTags[g] || 0;
    if (completeN >= 3 && cs >= 0.15 && ps < cs - 0.1) {
      out.push({
        id: `complete_vs_plan_${g}`,
        claim: `You finish ${g} more often than you add it to planning — completion rate runs ahead of browse interest.`,
        confidence: Math.min(0.85, 0.4 + completeN * 0.05 + (cs - ps)),
        evidenceCount: completeN + planN,
        supportingEvidence: [
          { kind: "completed", detail: `${g} finished`, count: completeN },
          { kind: "planning", detail: `${g} planned`, count: planN },
        ],
      });
    }
  }

  const profile = buildCompletionProfile(entries);
  const short = profile.byLength.find((b) => b.key === "1-13");
  const long =
    profile.byLength.find((b) => b.key === "51+") ||
    profile.byLength.find((b) => b.key === "27-50");
  if (
    short &&
    long &&
    short.started >= 3 &&
    long.started >= 3 &&
    short.rate >= long.rate + 0.25
  ) {
    out.push({
      id: "length_completion_gap",
      claim:
        "You start longer series, but completion stays higher on shorter cours.",
      confidence: Math.min(
        0.88,
        0.45 +
          (short.rate - long.rate) * 0.5 +
          Math.min(0.2, profile.evidenceCount * 0.02),
      ),
      evidenceCount: short.started + long.started,
      supportingEvidence: [
        {
          kind: "length",
          detail: `1–13 eps finish rate ${(short.rate * 100).toFixed(0)}%`,
          count: short.started,
        },
        {
          kind: "length",
          detail: `${long.key} finish rate ${(long.rate * 100).toFixed(0)}%`,
          count: long.started,
        },
      ],
    });
  }

  try {
    const events = recentEvents(120);
    const browseIds = new Set<number>();
    for (const ev of events) {
      if (
        (ev.kind === "detail_open" ||
          ev.kind === "detail_revisit" ||
          ev.kind === "search") &&
        ev.animeId
      ) {
        browseIds.add(ev.animeId);
      }
    }
    const byId = new Map(entries.map((e) => [e.id, e]));
    const browseEntries = [...browseIds]
      .map((id) => byId.get(id))
      .filter(Boolean) as WatchlistEntry[];

    if (browseEntries.length >= 4 && completed.length >= 3) {
      const browseTags = freqMap(browseEntries.flatMap(entryTags));
      for (const g of topKeys(browseTags, 5)) {
        const bs = share(browseTags, g);
        const cs = share(completeTags, g);
        const bN = browseTags[g] || 0;
        const cN = completeTags[g] || 0;
        if (bN >= 3 && bs >= 0.12 && cs < bs - 0.14) {
          out.push({
            id: `browse_vs_complete_${g}`,
            claim: `You open ${g} pages often, but finished titles lean elsewhere.`,
            confidence: Math.min(0.8, 0.38 + bN * 0.05 + (bs - cs)),
            evidenceCount: bN + cN,
            supportingEvidence: [
              { kind: "browse", detail: `${g} opens`, count: bN },
              { kind: "completed", detail: `${g} finished`, count: cN },
            ],
          });
        }
      }
    }
  } catch {
    /* soft */
  }

  const dropTags = freqMap(dropped.flatMap(entryTags));
  for (const g of topKeys(dropTags, 4)) {
    const dN = dropTags[g] || 0;
    const cN = completeTags[g] || 0;
    if (dN >= 3 && dN > cN + 1) {
      out.push({
        id: `drop_heavy_${g}`,
        claim: `${g} shows up more in drops than in completions.`,
        confidence: Math.min(0.82, 0.4 + dN * 0.07),
        evidenceCount: dN + cN,
        supportingEvidence: [
          { kind: "dropped", detail: `${g} dropped`, count: dN },
          { kind: "completed", detail: `${g} finished`, count: cN },
        ],
      });
    }
  }

  const seen = new Set<string>();
  const unique = out.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return c.evidenceCount >= minEvidence || c.confidence >= 0.55;
  });
  unique.sort((a, b) => b.confidence - a.confidence);
  return unique.slice(0, maxResults);
}

export function dimensionContradictionHints(
  entries: WatchlistEntry[],
): {
  dimension: string;
  label: string;
  completeMean: number;
  planMean: number;
}[] {
  const completed = entries.filter((e) => e.watchStatus === "completed");
  const planning = entries.filter((e) => e.watchStatus === "planning");
  if (completed.length < 3 || planning.length < 3) return [];

  function meanVec(list: WatchlistEntry[]): FingerprintVector {
    const acc = emptyFingerprintVector();
    const counts: Record<string, number> = {};
    for (const e of list) {
      const fp = buildAnimePreferenceFingerprint({
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
      const v = fingerprintToVector(fp);
      for (const [k, val] of Object.entries(v)) {
        acc[k] = (acc[k] ?? 0) + val;
        counts[k] = (counts[k] || 0) + 1;
      }
    }
    for (const k of Object.keys(acc)) {
      acc[k] = counts[k] ? acc[k]! / counts[k]! : 0.5;
    }
    return acc;
  }

  const c = meanVec(completed);
  const p = meanVec(planning);
  const rows: {
    dimension: string;
    label: string;
    completeMean: number;
    planMean: number;
  }[] = [];
  for (const k of Object.keys(c)) {
    const cv = c[k] ?? 0.5;
    const pv = p[k] ?? 0.5;
    if (Math.abs(cv - pv) < 0.15) continue;
    rows.push({
      dimension: k,
      label: humanizeDimKey(k),
      completeMean: cv,
      planMean: pv,
    });
  }
  rows.sort(
    (a, b) =>
      Math.abs(b.completeMean - b.planMean) -
      Math.abs(a.completeMean - a.planMean),
  );
  return rows.slice(0, 6);
}
