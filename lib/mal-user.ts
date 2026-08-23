import type { WatchlistEntry, WatchStatus } from "./types";
import { normalizeEntry } from "./watchlist-storage";
import { JIKAN_BASE } from "./api";
import { resolveMalToAniList } from "./mal-resolve";

type JikanAnime = {
  mal_id: number;
  title?: string;
  title_english?: string;
  images?: { jpg?: { large_image_url?: string; image_url?: string } };
  type?: string;
  year?: number;
  episodes?: number;
  duration?: string;
  score?: number;
  genres?: { name: string }[];
};

function mapStatus(s: string): WatchStatus {
  const x = (s || "").toLowerCase();
  if (x.includes("watch")) return "watching";
  if (x.includes("complete")) return "completed";
  if (x.includes("hold") || x.includes("pause")) return "paused";
  if (x.includes("drop")) return "dropped";
  return "planning";
}

function parseDurationMin(d?: string): number {
  if (!d) return 24;
  const m = d.match(/(\d+)\s*min/i);
  return m ? Number(m[1]) : 24;
}

export type MalImportResult = {
  entries: WatchlistEntry[];
  profile: { username: string };
  resolved: number;
  unresolved: number;
};

/**
 * Public MAL list via Jikan, then map MAL → AniList ids (Sprint 6).
 * Unresolved rows keep MAL id but notes mark source:mal-unresolved.
 */
export async function fetchMalUserList(
  username: string,
  opts?: { resolveAniList?: boolean },
): Promise<MalImportResult> {
  const user = username.trim();
  if (!user) throw new Error("Enter a MAL username");
  const resolveAniList = opts?.resolveAniList !== false;

  const statuses = [
    "watching",
    "completed",
    "onhold",
    "dropped",
    "plantowatch",
  ];
  const rawRows: {
    malId: number;
    title: string;
    image: string;
    format?: string;
    year?: number;
    episodes?: number;
    duration: number;
    score?: number;
    watchStatus: WatchStatus;
    progress: number;
    userRating: number;
    genres?: string[];
  }[] = [];
  const seen = new Set<number>();

  for (const status of statuses) {
    let page = 1;
    let hasNext = true;
    while (hasNext && page <= 3) {
      const url = `${JIKAN_BASE}/users/${encodeURIComponent(user)}/animelist/${status}?page=${page}&limit=50`;
      const res = await fetch(url);
      if (res.status === 404) throw new Error(`MAL user not found: ${user}`);
      if (res.status === 429)
        throw new Error("Jikan rate limit — try again in a minute");
      if (!res.ok) {
        break;
      }
      const json = (await res.json()) as {
        data?: {
          watching_status?: number;
          score?: number;
          episodes_watched?: number;
          anime?: JikanAnime;
        }[];
        pagination?: { has_next_page?: boolean };
      };
      const rows = json.data || [];
      for (const row of rows) {
        const a = row.anime;
        if (!a?.mal_id || seen.has(a.mal_id)) continue;
        seen.add(a.mal_id);
        rawRows.push({
          malId: a.mal_id,
          title: a.title_english || a.title || `MAL ${a.mal_id}`,
          image:
            a.images?.jpg?.large_image_url ||
            a.images?.jpg?.image_url ||
            "",
          format: a.type,
          year: a.year,
          episodes: a.episodes,
          duration: parseDurationMin(a.duration),
          score: a.score,
          watchStatus: mapStatus(status),
          progress: row.episodes_watched || 0,
          userRating: row.score || 0,
          genres: (a.genres || []).map((g) => g.name),
        });
      }
      hasNext = Boolean(json.pagination?.has_next_page);
      page += 1;
      await new Promise((r) => setTimeout(r, 350));
    }
  }

  if (!rawRows.length) {
    throw new Error(
      "MAL list empty or private — ensure the list is public on MyAnimeList",
    );
  }

  const out: WatchlistEntry[] = [];
  let resolved = 0;
  let unresolved = 0;

  for (const row of rawRows) {
    let catalogId = row.malId;
    let note = "source:mal";
    if (resolveAniList) {
      const bridge = await resolveMalToAniList(row.malId);
      if (bridge) {
        catalogId = bridge.anilistId;
        note = `source:mal;mal_id=${row.malId}`;
        resolved += 1;
      } else {
        note = `source:mal-unresolved;mal_id=${row.malId}`;
        unresolved += 1;
      }
    } else {
      unresolved += 1;
    }

    out.push(
      normalizeEntry({
        id: catalogId,
        title: row.title,
        image: row.image,
        format: row.format,
        year: row.year,
        episodes: row.episodes,
        duration: row.duration,
        score: row.score,
        watchStatus: row.watchStatus,
        progress: row.progress,
        userRating: row.userRating,
        genres: row.genres,
        notes: note,
      }),
    );
  }

  return {
    entries: out,
    profile: { username: user },
    resolved,
    unresolved,
  };
}
