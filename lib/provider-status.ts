/**
 * Optional provider configuration snapshot (Sprints 20 + 30).
 * Server-only — never exposes secret values.
 */

import { isWatchmodeConfigured } from "./providers/watchmode";
import { isSimklConfigured } from "./providers/simkl";
import { isFanartConfigured } from "./providers/fanart";
import { isVapidReady } from "./push-server";

export type ProviderStatusRow = {
  id: string;
  label: string;
  configured: boolean;
  notes?: string;
  group?: "catalog" | "enrichment" | "availability" | "notify" | "infra";
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
      group: "catalog",
    },
    {
      id: "jikan",
      label: "Jikan / MAL",
      configured: true,
      notes: "Public API — rate-limited",
      group: "catalog",
    },
    {
      id: "anidb",
      label: "AniDB",
      configured: envTruthy("ANIDB_CLIENT"),
      notes: "Deep tags / niche meta",
      group: "enrichment",
    },
    {
      id: "watchmode",
      label: "Watchmode",
      configured: isWatchmodeConfigured(),
      notes: "Streaming availability",
      group: "availability",
    },
    {
      id: "simkl",
      label: "Simkl",
      configured: isSimklConfigured(),
      notes: "Id bridge",
      group: "enrichment",
    },
    {
      id: "fanart",
      label: "Fanart.tv",
      configured: isFanartConfigured(),
      notes: "Needs TVDB id per title",
      group: "enrichment",
    },
    {
      id: "animeschedule",
      label: "AnimeSchedule",
      configured: envTruthy("ANIMESCHEDULE_API_KEY"),
      notes: "Optional key; may work limited without",
      group: "availability",
    },
    {
      id: "saucenao",
      label: "SauceNAO",
      configured: envTruthy("SAUCENAO_API_KEY"),
      notes: "Sauce fallback",
      group: "enrichment",
    },
    {
      id: "open-meteo",
      label: "Open-Meteo",
      configured: true,
      notes: "Weather context — no key required",
      group: "enrichment",
    },
    {
      id: "vapid",
      label: "Web Push (VAPID)",
      configured: isVapidReady(),
      notes: "Remote push delivery",
      group: "notify",
    },
    {
      id: "cron",
      label: "Cron secret",
      configured: envTruthy("CRON_SECRET") || envTruthy("PUSH_SEND_SECRET"),
      notes: "Airing push job auth",
      group: "notify",
    },
    {
      id: "supabase",
      label: "Supabase",
      configured:
        envTruthy("NEXT_PUBLIC_SUPABASE_URL") &&
        envTruthy("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
      notes: "Confessions + optional push store",
      group: "infra",
    },
  ];
}
