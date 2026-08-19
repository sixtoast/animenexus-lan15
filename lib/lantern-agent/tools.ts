/**
 * Lantern application tools (Sprint 5).
 * Executors return real data or explicit errors — never fabricated success.
 */

import { searchAnime, fetchAnimeById } from "@/lib/anilist";
import { readWatchlist } from "@/lib/watchlist-storage";
import { computeTaste } from "@/lib/taste";
import {
  readMemory,
  memoryDigestForAI,
  getGenrePreferences,
} from "@/lib/lantern-memory";
import { userResonance, describeUserResonance, topResonanceDims, resonanceLabel } from "@/lib/resonance";
import { rankRecommendations } from "@/lib/recommend-rank";
import { fetchByGenres } from "@/lib/anilist-discover";
import type { Anime, WatchlistEntry } from "@/lib/types";

export type ToolName =
  | "searchAnime"
  | "getAnimeDetails"
  | "getWatchlist"
  | "getTasteProfile"
  | "getStats"
  | "getRecentActivity"
  | "getRecommendations"
  | "addToWatchlist"
  | "removeFromWatchlist";

export type ToolSpec = {
  name: ToolName;
  description: string;
  /** If true, UI must confirm before execute. */
  requiresConfirmation: boolean;
  parameters: Record<string, string>;
};

export const TOOL_SPECS: ToolSpec[] = [
  {
    name: "searchAnime",
    description: "Search the anime catalog by title query.",
    requiresConfirmation: false,
    parameters: { query: "string", limit: "number optional, default 5" },
  },
  {
    name: "getAnimeDetails",
    description: "Get details for one anime by AniList id.",
    requiresConfirmation: false,
    parameters: { animeId: "number" },
  },
  {
    name: "getWatchlist",
    description: "Read the user's local watchlist (titles + status).",
    requiresConfirmation: false,
    parameters: { status: "optional watching|planning|completed|paused|dropped" },
  },
  {
    name: "getTasteProfile",
    description: "Summarize taste + resonance from the local shelf.",
    requiresConfirmation: false,
    parameters: {},
  },
  {
    name: "getStats",
    description: "Numeric stats from the watchlist (hours, completion rate).",
    requiresConfirmation: false,
    parameters: {},
  },
  {
    name: "getRecentActivity",
    description: "Recent views, searches, and completions from Lantern memory.",
    requiresConfirmation: false,
    parameters: {},
  },
  {
    name: "getRecommendations",
    description: "Suggest anime ranked by resonance vs the user's shelf.",
    requiresConfirmation: false,
    parameters: { genres: "optional comma-separated genres" },
  },
  {
    name: "addToWatchlist",
    description: "Request adding an anime to the watchlist (needs user confirmation).",
    requiresConfirmation: true,
    parameters: { animeId: "number", status: "optional planning|watching" },
  },
  {
    name: "removeFromWatchlist",
    description: "Request removing an anime from the watchlist (needs confirmation).",
    requiresConfirmation: true,
    parameters: { animeId: "number" },
  },
];

export type ToolResult =
  | { ok: true; tool: ToolName; data: unknown }
  | { ok: false; tool: ToolName; error: string }
  | {
      ok: false;
      tool: ToolName;
      error: string;
      needsConfirmation: true;
      proposed: Record<string, unknown>;
    };

function compactAnime(a: Anime) {
  return {
    id: a.id,
    title: a.title,
    year: a.year,
    score: a.score,
    format: a.format,
    genres: a.tags?.slice(0, 6),
  };
}

function compactEntry(e: WatchlistEntry) {
  return {
    id: e.id,
    title: e.title,
    status: e.watchStatus,
    progress: e.progress,
    userRating: e.userRating || undefined,
  };
}

export async function executeTool(
  name: ToolName,
  args: Record<string, unknown>,
  opts?: { confirmed?: boolean },
): Promise<ToolResult> {
  try {
    switch (name) {
      case "searchAnime": {
        const query = String(args.query || "").trim();
        if (!query) return { ok: false, tool: name, error: "Missing query" };
        const limit = Math.min(10, Math.max(1, Number(args.limit) || 5));
        const page = await searchAnime(query, 1, limit);
        return {
          ok: true,
          tool: name,
          data: {
            query,
            count: page.data.length,
            results: page.data.map(compactAnime),
          },
        };
      }
      case "getAnimeDetails": {
        const id = Number(args.animeId);
        if (!Number.isFinite(id)) {
          return { ok: false, tool: name, error: "Invalid animeId" };
        }
        const anime = await fetchAnimeById(id);
        if (!anime) return { ok: false, tool: name, error: "Anime not found" };
        return { ok: true, tool: name, data: compactAnime(anime) };
      }
      case "getWatchlist": {
        const entries = readWatchlist();
        const status = args.status ? String(args.status) : null;
        const filtered = status
          ? entries.filter((e) => e.watchStatus === status)
          : entries;
        return {
          ok: true,
          tool: name,
          data: {
            total: entries.length,
            shown: filtered.length,
            items: filtered.slice(0, 40).map(compactEntry),
          },
        };
      }
      case "getTasteProfile": {
        const entries = readWatchlist();
        const res = userResonance(entries);
        const prefs = getGenrePreferences();
        return {
          ok: true,
          tool: name,
          data: {
            summary: describeUserResonance(res),
            topDimensions: topResonanceDims(res, 5).map((d) => ({
              dim: resonanceLabel(d.dim),
              value: Math.round(d.value * 100),
            })),
            topGenres: prefs.slice(0, 5).map((p) => ({
              genre: p.value,
              confidence: Number(p.confidence.toFixed(2)),
              evidence: p.evidenceCount,
            })),
            listSize: entries.length,
          },
        };
      }
      case "getStats": {
        const entries = readWatchlist();
        const s = computeTaste(entries);
        return {
          ok: true,
          tool: name,
          data: {
            total: s.total,
            byStatus: s.byStatus,
            hoursLogged: s.hoursLogged,
            episodesLogged: s.episodesLogged,
            completionRate: Math.round(s.completionRate * 100),
            avgUserRating: s.avgUserRating,
          },
        };
      }
      case "getRecentActivity": {
        const m = readMemory();
        return {
          ok: true,
          tool: name,
          data: {
            recentViews: m.recentViews.slice(0, 8),
            completed: m.completedLog.slice(0, 5),
            searches: (m.recentSearches || []).slice(0, 5),
            tools: (m.recentTools || []).slice(0, 5),
            digest: memoryDigestForAI(),
          },
        };
      }
      case "getRecommendations": {
        const entries = readWatchlist();
        const genresArg = String(args.genres || "")
          .split(",")
          .map((g) => g.trim())
          .filter(Boolean);
        const prefs = getGenrePreferences();
        const genres =
          genresArg.length > 0
            ? genresArg.slice(0, 3)
            : prefs.slice(0, 3).map((p) => p.value);
        if (!genres.length) {
          return {
            ok: false,
            tool: name,
            error:
              "No genres available yet — add titles to the watchlist or browse first.",
          };
        }
        const page = await fetchByGenres(genres, {
          perPage: 12,
          sort: ["SCORE_DESC", "POPULARITY_DESC"],
          excludeIds: entries.map((e) => e.id),
        });
        const ranked = rankRecommendations(page.data, entries).slice(0, 6);
        return {
          ok: true,
          tool: name,
          data: {
            genresUsed: genres,
            picks: ranked.map((r) => ({
              ...compactAnime(r.anime),
              confidence: r.confidence,
              why: r.reasons[0],
            })),
          },
        };
      }
      case "addToWatchlist": {
        const animeId = Number(args.animeId);
        if (!Number.isFinite(animeId)) {
          return { ok: false, tool: name, error: "Invalid animeId" };
        }
        if (!opts?.confirmed) {
          return {
            ok: false,
            tool: name,
            error: "Confirmation required before modifying the watchlist",
            needsConfirmation: true,
            proposed: {
              action: "addToWatchlist",
              animeId,
              status: args.status || "planning",
            },
          };
        }
        return {
          ok: true,
          tool: name,
          data: {
            confirmed: true,
            animeId,
            status: args.status || "planning",
            note: "UI should call watchlist add with this id",
          },
        };
      }
      case "removeFromWatchlist": {
        const animeId = Number(args.animeId);
        if (!Number.isFinite(animeId)) {
          return { ok: false, tool: name, error: "Invalid animeId" };
        }
        if (!opts?.confirmed) {
          return {
            ok: false,
            tool: name,
            error: "Confirmation required before removing from the watchlist",
            needsConfirmation: true,
            proposed: { action: "removeFromWatchlist", animeId },
          };
        }
        return {
          ok: true,
          tool: name,
          data: { confirmed: true, animeId },
        };
      }
      default:
        return { ok: false, tool: name, error: `Unknown tool: ${name}` };
    }
  } catch (e) {
    return {
      ok: false,
      tool: name,
      error: e instanceof Error ? e.message : "Tool failed",
    };
  }
}

export function toolsCatalogForPrompt(): string {
  return TOOL_SPECS.map(
    (t) =>
      `- ${t.name}: ${t.description} params=${JSON.stringify(t.parameters)}${
        t.requiresConfirmation ? " [needs confirmation]" : ""
      }`,
  ).join("\n");
}
