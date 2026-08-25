# AnimeNexus — Environment & APIs (Sprint 20)

AniList is the **required** catalog. Everything else is optional enrichment.

## Core (no keys)

| Service | Role | Notes |
|---------|------|-------|
| **AniList GraphQL** | Catalog, detail, discover | Public rate limits; hardened in `lib/anilist.ts` |
| **Kitsu / Shikimori** | Catalog failover | Used when AniList is down |
| **Jikan** | MAL mirror (episodes, staff, themes text) | Public; rate-limited |
| **AniSkip** | OP/ED/recap intervals | Public; needs MAL id |
| **AnimeThemes.moe** | OP/ED/IN links | Public API |
| **trace.moe** | Scene search | Public; rate-limited |

## Optional env vars (server-only)

Add in Vercel → Project → Settings → Environment Variables (**Key** / **Value** only).
Never prefix with `NEXT_PUBLIC_` unless the value is safe for the browser.

| Key | Sprint | Purpose |
|-----|--------|---------|
| `ANIMESCHEDULE_API_KEY` | 10–12 | Bearer token from AnimeSchedule.app API settings. Enables Radar shelf signals + Home “Your signals today” + Detail next-air. |
| `SAUCENAO_API_KEY` | 16 | SauceNAO API key. Optional fallback when trace.moe is weak (URL searches). |
| `MAL_CLIENT_ID` | 7 | Future MAL OAuth write-back (see `docs/MAL_OAUTH.md`). |
| `MAL_CLIENT_SECRET` | 7 | Future MAL OAuth. |
| `MAL_REDIRECT_URI` | 7 | e.g. `https://your-domain/api/mal/callback` |
| Supabase keys | Fan zone | Existing confessions setup (if configured). |

Without optional keys, the site still builds and runs; related UI shows soft notes.

## Architecture map

```
getAnimeExperience(anilistId)
  ├─ AniList (required)
  ├─ themes-enrich → AnimeThemes + Jikan themes
  ├─ Jikan episodes/staff/characters
  └─ AnimeSchedule (if ANIMESCHEDULE_API_KEY)
```

Other surfaces:

- **Radar / Home signals** → `/api/radar-schedule` + AnimeSchedule
- **Binge** → `/api/skip-estimate` + AniSkip
- **Sauce** → `/api/sauce` → trace.moe (+ SauceNAO if key)
- **MAL import** → Jikan + AniList `idMal` resolve (`lib/mal-resolve.ts`)
- **MAL sync queue** → local only until OAuth (`lib/mal-sync.ts`)

## Cache & limits

- `lib/api-cache.ts` — TTL categories + dedupe
- `lib/provider-rate-limit.ts` — per-provider concurrency / circuit

## Docs index

| File | Topic |
|------|--------|
| `docs/API_ARCHITECTURE.md` | Sprint 0 audit baseline |
| `docs/ANIMESCHEDULE.md` | Schedule setup |
| `docs/MAL_OAUTH.md` | Bidirectional sync requirements |
| `docs/MULTI_API_STATUS.md` | Sprint completion tracker |
| `docs/ENV_AND_APIS.md` | This file |
