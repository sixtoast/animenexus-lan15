# API Expansion II — Deploy checklist

## Required (site works without these)

- None of the Expansion II keys are required. AniList public GraphQL is enough for catalog.

## Recommended for full Expansion II surfaces

| Env | Where to get | Used by |
|-----|----------------|---------|
| `WATCHMODE_API_KEY` | [api.watchmode.com](https://api.watchmode.com/requestApiKey) | Where to Watch, Tonight “Available to me” |
| `WATCHMODE_DEFAULT_REGION` | ISO-2 (e.g. `US`, `ZA`) | Fallback region |
| `SIMKL_CLIENT_ID` | [simkl developer](https://simkl.com/settings/developer/new/) | Identity bridge |
| `FANART_API_KEY` | [fanart.tv](https://fanart.tv/get-an-api-key/) | Supplemental artwork |
| `ANIDB_CLIENT` / `ANIDB_CLIENTVER` | AniDB HTTP client registration | Deep tags / niche meta |

## Account / OAuth (separate from Expansion II)

| Env | Purpose |
|-----|---------|
| `ANILIST_CLIENT_ID` / `SECRET` / `REDIRECT_URI` | AniList OAuth |
| `MAL_CLIENT_ID` / `SECRET` / `REDIRECT_URI` | MAL OAuth flush |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for redirects |

## Client-only prefs (no env)

- **My Services** + region → `localStorage` (`animenexus.my-services.v1`)
- Streaming snapshots / signals → local only

## Smoke test after deploy

1. Open any anime Detail — page loads without keys  
2. With Watchmode key: Watch section lists providers for your region  
3. Account → My Services → set region + Crunchyroll (or local services)  
4. Tonight → enable **Available to me** (optional)  
5. Radar → Streaming changes empty until you revisit titles  

## Docs index

- `docs/ENV_AND_APIS.md`
- `docs/WATCHMODE.md` · `docs/SIMKL.md` · `docs/FANART.md` · `docs/ANIDB.md`
- `docs/API_EXPANSION_II_SOFT_FAIL.md`
- `docs/API_EXPANSION_II_STATUS.md`
