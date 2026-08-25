# AnimeNexus — Environment & APIs

AniList is the **required** catalog. Everything else is optional enrichment.

## Core (no keys)

| Service | Role |
|---------|------|
| **AniList GraphQL** | Catalog, detail, discover |
| **Kitsu / Shikimori** | Catalog failover |
| **Jikan** | MAL mirror |
| **AniSkip** | Skip intervals |
| **AnimeThemes.moe** | OP/ED/IN |
| **trace.moe** | Scene search |

## Optional env vars (server-only)

| Key | Purpose |
|-----|---------|
| `ANIMESCHEDULE_API_KEY` | Radar + home signals + next air |
| `SAUCENAO_API_KEY` | Sauce fallback |
| `MAL_CLIENT_ID` | **MAL OAuth** (required for connect) |
| `MAL_CLIENT_SECRET` | MAL OAuth (if app has secret) |
| `MAL_REDIRECT_URI` | Must match MAL app config exactly |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL for OAuth redirects |

See `docs/MAL_OAUTH.md` for the full flow.

## Architecture

```
getAnimeExperience(anilistId)
  ├─ AniList (required)
  ├─ themes · Jikan · AnimeSchedule (optional)
MAL OAuth → cookies → /api/mal/flush
```
