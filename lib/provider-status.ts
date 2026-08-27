/**
 * Optional provider configuration snapshot (API Expansion II Sprint 20).
 * Server-only — never exposes secret values.
 */

import { isWatchmodeConfigured } from "./providers/watchmode";
import { isSimklConfigured } from "./providers/simkl";
import { isFanartConfigured } from "./providers/fanart";

export type ProviderStatusRow = {
  id: string;
  label: string;
  configured: boolean;
  notes?: string;
};

function envTruthy(key: string): boolean {
  const v = (process.env[key] || "").trim();
  return Boolean(v);
}

export function getOptionalProviderStatus(): ProviderStatusRow[] {
  return [
    {
      id: "anilist",
      label: "AniList",
      configured: true,
      notes: "Primary catalog (public GraphQL)",
    },
    {
      id: "anidb",
      label: "AniDB",
      configured: envTruthy("ANIDB_CLIENT"),
      notes: "Deep tags / niche meta",
    },
    {
      id: "watchmode",
      label: "Watchmode",
      configured: isWatchmodeConfigured(),
      notes: "Streaming availability",
    },
    {
      id: "simkl",
      label: "Simkl",
      configured: isSimklConfigured(),
      notes: "Id bridge",
    },
    {
      id: "fanart",
      label: "Fanart.tv",
      configured: isFanartConfigured(),
      notes: "Needs TVDB id per title",
    },
    {
      id: "animeschedule",
      label: "AnimeSchedule",
      configured: envTruthy("ANIMESCHEDULE_API_KEY"),
      notes: "Optional key; may work limited without",
    },
    {
      id: "saucenao",
      label: "SauceNAO",
      configured: envTruthy("SAUCENAO_API_KEY"),
      notes: "Sauce fallback",
    },
  ];
}
