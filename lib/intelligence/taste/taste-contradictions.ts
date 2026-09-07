/**
 * Taste contradictions — gaps across the behaviour funnel:
 * browse/exposure → detail open → start → complete (or drop).
 */

import type { WatchlistEntry } from "@/lib/types";
import {
  recentEvents,
  type BehaviourEvent,
} from "@/lib/behaviour-events";
import {
  buildAnimePreferenceFingerprint,
  emptyFingerprintVector,
  fingerprintToVector,
  type FingerprintVector,
} from "@/lib/intelligence/items";
import { humanizeDimKey } from "@/lib/intelligence/items/fingerprint-similarity";
import { buildCompletionProfile } from "@/lib/intelligence/outcomes/completion-profile";

export const TASTE_CONTRADICTIONS_VERSION = "contradictions_v2";

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
  funnel?: string;
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

type FunnelBuckets = {
  browse: Set<number>;
  open: Set<number>;
  start: Set<number>;
  complete: Set<number>;
  drop: Set<number>;
  recOpen: Set<number>;
  recAccept: Set<number>;
};

function buildFunnelFromEvents(
  events: BehaviourEvent[],
  entries: WatchlistEntry[],
): FunnelBuckets {
  const browse = new Set<number>();
  const open = new Set<number>();
  const start = new Set<number>();
  const complete = new Set<number>();
  const drop = new Set<number>();
  const recOpen = new Set<number>();
  const recAccept = new Set<number>();

  for (const e of entries) {
    if (e.watchStatus === "completed") complete.add(e.id);
    if (e.watchStatus === "dropped") drop.add(e.id);
    if (
      e.watchStatus === "watching" ||
      e.watchStatus === "completed" ||
      e.watchStatus === "dropped" ||
      (e.watchStatus === "paused" && (e.progress || 0) > 0)
    ) {
      start.add(e.id);
    }
  }

  for (const ev of events) {
    if (!ev.animeId) continue;
    const id = ev.animeId;
    switch (ev.kind) {
      case "exposure":
      case "hover":
      case "rec_shown":
        browse.add(id);
        break;
      case "detail_open":
      case "detail_revisit":
        open.add(id);
        browse.add(id);
        break;
      case "rec_open":
        recOpen.add(id);
        open.add(id);
        browse.add(id);
        break;
      case "rec_accept":
      case "watchlist_add":
        recAccept.add(id);
        open.add(id);
        break;
      case "start":
      case "progress":
        start.add(id);
        break;
      case "complete":
        complete.add(id);
        start.add(id);
        break;
      case "drop":
        drop.add(id);
        start.add(id);
        break;
      default:
        break;
    }
  }

  return { browse, open, start, complete, drop, recOpen, recAccept };
}

function tagsForIds(
  ids: Set<number>,
  byId: Map<number, WatchlistEntry>,
): Record<string, number> {
  const tags: string[] = [];
  for (const id of ids) {
    const e = byId.get(id);
    if (e) tags.push(...entryTags(e));
  }
  return freqMap(tags);
}

export function detectTasteContradictions(
  entries: WatchlistEntry[],
  opts?: { minEvidence?: number; maxResults?: number; eventWindowDays?: number },
): TasteContradiction[] {
  const minEvidence = opts?.minEvidence ?? 4;
  const maxResults = opts?.maxResults ?? 6;
  const windowDays = opts?.eventWindowDays ?? 120;
  const out: TasteContradiction[] = [];

  const completed = entries.filter((e) => e.watchStatus === "completed");
  const planning = entries.filter((e) => e.watchStatus === "planning");
  const dropped = entries.filter((e) => e.watchStatus === "dropped");

  if (entries.length < minEvidence) return [];

  const byId = new Map(entries.map((e) => [e.id, e]));
  const planTags = freqMap(planning.flatMap(entryTags));
  const completeTags = freqMap(completed.flatMap(entryTags));
  const planTop = topKeys(planTags, 6);
  const completeTop = topKeys(completeTags, 6);

  for (const g of planTop) {
    const ps = share(planTags, g);
    const cs = share(completeTags, g);
    const planN = planTags[g] || 0;
    const completeN = completeTags[g] || 0;
    if (
      planN >= 3 &&
      ps >= 0.12 &&
      cs < ps - 0.12 &&
      completeN <= planN * 0.4
    ) {
      out.push({
        id: `plan_vs_complete_${g}`,
        claim: `You add ${g} titles often, but they show up less among finished shows.`,
        confidence: Math.min(0.85, 0.4 + planN * 0.06 + (ps - cs)),
        evidenceCount: planN + completeN,
        supportingEvidence: [
          { kind: "planning", detail: `${g} on shelf`, count: planN },
          { kind: "completed", detail: `${g} finished`, count: completeN },
        ],
        funnel: "plan→complete",
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
        claim: `You finish ${g} more often than you plan it — outcomes run ahead of stated interest.`,
        confidence: Math.min(0.85, 0.4 + completeN * 0.05 + (cs - ps)),
        evidenceCount: completeN + planN,
        supportingEvidence: [
          { kind: "completed", detail: `${g} finished`, count: completeN },
          { kind: "planning", detail: `${g} planned`, count: planN },
        ],
        funnel: "plan→complete",
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
      confidence: Math.min(0.88, 0.45 + (short.rate - long.rate)),
      evidenceCount: short.started + long.started,
      supportingEvidence: [
        {
          kind: "completed",
          detail: `1–13 eps rate ${(short.rate * 100).toFixed(0)}%`,
          count: short.started,
        },
        {
          kind: "started",
          detail: `Long series rate ${(long.rate * 100).toFixed(0)}%`,
          count: long.started,
        },
      ],
      funnel: "start→complete",
    });
  }

  for (const dim of profile.byDimension.slice(0, 4)) {
    if (dim.completedN + dim.droppedN < 4) continue;
    if (Math.abs(dim.finishBias) < 0.12) continue;
    const leaf = dim.dimension.split(".")[1] || dim.dimension;
    if (dim.finishBias > 0.12) {
      out.push({
        id: `dim_finish_${dim.dimension}`,
        claim: `Finished shows run higher on ${humanizeDimKey(dim.dimension).toLowerCase()} than drops — that signal predicts completion better than browse tags alone.`,
        confidence: Math.min(
          0.82,
          0.4 + Math.abs(dim.finishBias) + dim.completedN * 0.03,
        ),
        evidenceCount: dim.completedN + dim.droppedN,
        supportingEvidence: [
          {
            kind: "completed",
            detail: `${leaf} mean ${dim.completedMean.toFixed(2)}`,
            count: dim.completedN,
          },
          {
            kind: "dropped",
            detail: `${leaf} mean ${dim.droppedMean.toFixed(2)}`,
            count: dim.droppedN,
          },
        ],
        funnel: "start→complete",
      });
    }
  }

  try {
    const events = recentEvents(windowDays);
    const funnel = buildFunnelFromEvents(events, entries);

    const browseTags = tagsForIds(funnel.browse, byId);
    const openTags = tagsForIds(funnel.open, byId);
    const startTags = tagsForIds(funnel.start, byId);
    const completeEventTags = tagsForIds(funnel.complete, byId);

    for (const g of topKeys(browseTags, 6)) {
      const bs = share(browseTags, g);
      const cs = share(completeEventTags, g);
      const bN = browseTags[g] || 0;
      const cN = completeEventTags[g] || 0;
      if (bN >= 4 && bs >= 0.1 && cs < bs - 0.12) {
        out.push({
          id: `funnel_browse_vs_complete_${g}`,
          claim: `You browse ${g} often, but finished titles lean elsewhere.`,
          confidence: Math.min(0.84, 0.38 + bN * 0.04 + (bs - cs)),
          evidenceCount: bN + cN,
          supportingEvidence: [
            { kind: "browse", detail: `${g} exposures/opens`, count: bN },
            { kind: "completed", detail: `${g} finished`, count: cN },
          ],
          funnel: "browse→complete",
        });
      }
    }

    for (const g of topKeys(openTags, 5)) {
      const os = share(openTags, g);
      const ss = share(startTags, g);
      const oN = openTags[g] || 0;
      const sN = startTags[g] || 0;
      if (oN >= 4 && os >= 0.12 && ss < os - 0.14 && sN <= oN * 0.35) {
        out.push({
          id: `funnel_open_vs_start_${g}`,
          claim: `You open ${g} pages a lot, but rarely start watching those titles.`,
          confidence: Math.min(0.83, 0.4 + oN * 0.04 + (os - ss)),
          evidenceCount: oN + sN,
          supportingEvidence: [
            { kind: "open", detail: `${g} detail opens`, count: oN },
            { kind: "start", detail: `${g} starts`, count: sN },
          ],
          funnel: "open→start",
        });
      }
    }

    for (const g of topKeys(startTags, 5)) {
      const ss = share(startTags, g);
      const cs = share(completeEventTags, g);
      const sN = startTags[g] || 0;
      const cN = completeEventTags[g] || 0;
      if (sN >= 3 && ss >= 0.12 && cs < ss - 0.12 && cN <= sN * 0.4) {
        out.push({
          id: `funnel_start_vs_complete_${g}`,
          claim: `You start ${g} more than you finish it — mid-funnel interest without payoff.`,
          confidence: Math.min(0.85, 0.42 + sN * 0.05 + (ss - cs)),
          evidenceCount: sN + cN,
          supportingEvidence: [
            { kind: "start", detail: `${g} starts`, count: sN },
            { kind: "completed", detail: `${g} finished`, count: cN },
          ],
          funnel: "start→complete",
        });
      }
    }

    if (funnel.recOpen.size >= 5) {
      const opened = funnel.recOpen.size;
      const accepted = [...funnel.recOpen].filter(
        (id) => funnel.recAccept.has(id) || funnel.complete.has(id),
      ).length;
      const rate = accepted / opened;
      if (rate <= 0.25) {
        out.push({
          id: "funnel_rec_open_low_convert",
          claim:
            "You open recommendations often, but few of those opens turn into shelf adds or finishes.",
          confidence: Math.min(0.8, 0.45 + (0.25 - rate) + opened * 0.02),
          evidenceCount: opened,
          supportingEvidence: [
            { kind: "rec_open", detail: "Recommendation opens", count: opened },
            {
              kind: "rec_accept",
              detail: "Accepts / completes from those",
              count: accepted,
            },
          ],
          funnel: "rec_open→accept",
        });
      }
    }

    const actionBrowse =
      (browseTags["action"] || 0) + (browseTags["adventure"] || 0);
    const dramaComplete =
      (completeEventTags["drama"] || 0) +
      (completeEventTags["slice of life"] || 0) +
      (completeEventTags["romance"] || 0);
    if (actionBrowse >= 5 && dramaComplete >= 3) {
      const actionComplete =
        (completeEventTags["action"] || 0) +
        (completeEventTags["adventure"] || 0);
      if (dramaComplete >= actionComplete + 2) {
        out.push({
          id: "funnel_action_browse_character_complete",
          claim:
            "Browse leans high-energy, but finishes skew toward character / relationship stories.",
          confidence: Math.min(
            0.82,
            0.4 + actionBrowse * 0.03 + dramaComplete * 0.04,
          ),
          evidenceCount: actionBrowse + dramaComplete,
          supportingEvidence: [
            {
              kind: "browse",
              detail: "Action/adventure attention",
              count: actionBrowse,
            },
            {
              kind: "completed",
              detail: "Drama/SoL/romance finishes",
              count: dramaComplete,
            },
          ],
          funnel: "browse→complete",
        });
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
        funnel: "start→drop",
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
