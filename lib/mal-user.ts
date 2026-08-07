import type { WatchlistEntry, WatchStatus } from "./types";
import { normalizeEntry } from "./watchlist-storage";
import { JIKAN_BASE } from "./api";

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

/** Public MAL list via Jikan (rate-limited). Returns normalized entries. */
export async function fetchMalUserList(
  username: string,
): Promise<{ entries: WatchlistEntry[]; profile: { username: string } }> {
  const user = username.trim();
  if (!user) throw new Error("Enter a MAL username");

  const statuses = [
    "watching",
    "completed",
    "onhold",
    "dropped",
    "plantowatch",
  ];
  const out: WatchlistEntry[] = [];
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
        out.push(
          normalizeEntry({
            id: a.mal_id,
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
            notes: "source:mal",
          }),
        );
      }
      hasNext = Boolean(json.pagination?.has_next_page);
      page += 1;
      await new Promise((r) => setTimeout(r, 350));
    }
  }

  if (!out.length) {
    throw new Error(
      "MAL list empty or private — ensure the list is public on MyAnimeList",
    );
  }

  return { entries: out, profile: { username: user } };
}
