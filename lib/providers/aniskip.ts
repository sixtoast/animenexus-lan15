/**
 * AniSkip adapter (Multi-API Sprint 13).
 * Public API — no key required.
 * https://api.aniskip.com/v1/skip-times/{malId}/{episode}
 */

import type { AnimeIdentity } from "../anime-identity";
import { CACHE_TTL, cacheKey, dedupedFetch } from "../api-cache";
import { withProviderLimit } from "../provider-rate-limit";
import type { SkipInterval } from "./types";

const BASE = "https://api.aniskip.com/v1";

type AniSkipResult = {
  interval?: { start_time?: number; end_time?: number };
  skip_type?: string;
  episode_length?: number;
};

type AniSkipResponse = {
  found?: boolean;
  results?: AniSkipResult[];
};

function mapType(t?: string): SkipInterval["type"] {
  const x = (t || "").toLowerCase();
  if (x === "op" || x === "opening") return "op";
  if (x === "ed" || x === "ending") return "ed";
  if (x.includes("recap")) return "recap";
  if (x.includes("mixed")) return "mixed";
  return x || "op";
}

export async function fetchSkipTimes(
  malId: number,
  episode: number,
): Promise<SkipInterval[]> {
  if (!malId || malId < 1 || episode < 1) return [];

  const key = cacheKey(["aniskip", malId, episode]);
  return dedupedFetch(
    key,
    async () => {
      try {
        return await withProviderLimit("aniskip", async () => {
          const url = `${BASE}/skip-times/${malId}/${episode}?types=op&types=ed&types=mixed-op&types=mixed-ed&types=recap`;
          const res = await fetch(url, {
            headers: { Accept: "application/json" },
            next: { revalidate: 86400 },
          } as RequestInit);
          if (res.status === 404) return [];
          if (!res.ok) throw new Error(`AniSkip HTTP ${res.status}`);
          const json = (await res.json()) as AniSkipResponse;
          if (!json.found || !json.results?.length) return [];
          return json.results
            .map((r) => {
              const start = r.interval?.start_time;
              const end = r.interval?.end_time;
              if (start == null || end == null || end <= start) return null;
              return {
                type: mapType(r.skip_type),
                start,
                end,
                source: "aniskip",
              } satisfies SkipInterval;
            })
            .filter(Boolean) as SkipInterval[];
        });
      } catch (e) {
        console.warn(
          "[aniskip] failed",
          e instanceof Error ? e.message : e,
        );
        return [];
      }
    },
    CACHE_TTL.medium,
  );
}

/** Resolve MAL id from identity, then fetch skips. */
export async function getSkipTimes(
  identity: AnimeIdentity,
  episode: number,
): Promise<SkipInterval[]> {
  const malId = identity.malId;
  if (!malId) return [];
  return fetchSkipTimes(malId, episode);
}

/** Average OP+ED skip seconds across a sample of episodes (for binge estimates). */
export async function estimateAverageSkipSeconds(
  malId: number,
  episodeNumbers: number[],
): Promise<{ op: number; ed: number; recap: number; sampled: number }> {
  let op = 0;
  let ed = 0;
  let recap = 0;
  let sampled = 0;
  const sample = episodeNumbers.filter((n) => n > 0).slice(0, 6);

  for (const ep of sample) {
    const skips = await fetchSkipTimes(malId, ep);
    if (!skips.length) continue;
    sampled += 1;
    for (const s of skips) {
      const dur = Math.max(0, s.end - s.start);
      if (s.type === "op") op += dur;
      else if (s.type === "ed") ed += dur;
      else if (s.type === "recap") recap += dur;
    }
  }

  if (sampled === 0) return { op: 0, ed: 0, recap: 0, sampled: 0 };
  return {
    op: op / sampled,
    ed: ed / sampled,
    recap: recap / sampled,
    sampled,
  };
}
