# API Expansion II — Soft-fail audit (Sprint 20)

**Rule:** Missing keys or ids never break catalog, Detail, Browse, or watchlist. Optional layers return empty / hidden UI.

## Provider matrix

| Provider | Config gate | Required id | On failure |
|----------|-------------|-------------|------------|
| **AniDB** | `ANIDB_CLIENT` (+ ver) | `anidbId` or titles dump | Empty deep tags / relations |
| **Watchmode** | `WATCHMODE_API_KEY` | Resolved watchmode id (IMDb/TMDB/title) | Watch section offline message |
| **Simkl** | `SIMKL_CLIENT_ID` | MAL/AniList/… or title | No simklId mapping |
| **Fanart.tv** | `FANART_API_KEY` | `tvdbId` on identity | No gallery |
| **AnimeSchedule** | key optional | — | Soft degrade times |
| **SauceNAO** | `SAUCENAO_API_KEY` | — | trace.moe only |

## UI soft-fail

| Surface | Behaviour without data |
|---------|------------------------|
| Deep signals | Genres only; no AniDB strip |
| Creative DNA | Jikan/AniList staff only |
| Creative connections | Hidden if no shelf overlap |
| Where to Watch | “Streaming lookup offline” |
| Available to me | Checkbox disabled until My Services |
| Availability signals | Empty until visits accumulate |
| Artwork gallery | Omitted |
| Viewing context | Chips from AniList fields only |

## Identity rules (unchanged)

- AniList id remains primary catalog key
- Title match never silently becomes authoritative
- Provenance retained on deep facts; core scores/episodes not overwritten by niche sources

## Rate limits

All Expansion II providers register in `lib/provider-rate-limit.ts` (`watchmode`, `anidb`, `simkl`, `fanart`, …).

## Env checklist

See `docs/ENV_AND_APIS.md` and `docs/API_EXPANSION_II_CHECKLIST.md`.
