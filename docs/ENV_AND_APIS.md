# AnimeNexus — Environment & APIs

AniList is the **required** catalog. Everything else is optional enrichment.

## Optional env vars (server-only)

| Key | Purpose |
|-----|---------|
| `ANILIST_CLIENT_ID` | AniList OAuth app |
| `ANILIST_CLIENT_SECRET` | AniList OAuth |
| `ANILIST_REDIRECT_URI` | e.g. `https://domain/api/anilist/callback` |
| `MAL_CLIENT_ID` | MAL OAuth |
| `MAL_CLIENT_SECRET` | MAL OAuth (if required) |
| `MAL_REDIRECT_URI` | e.g. `https://domain/api/mal/callback` |
| `ANIMESCHEDULE_API_KEY` | Radar / home air times |
| `SAUCENAO_API_KEY` | Sauce fallback |
| `ANIDB_CLIENT` | AniDB HTTP client name (registered) |
| `ANIDB_CLIENTVER` | AniDB client version |
| `WATCHMODE_API_KEY` | Streaming availability |
| `WATCHMODE_DEFAULT_REGION` | ISO-2 country, default `US` |
| `SIMKL_CLIENT_ID` | Simkl id / metadata bridge |
| `FANART_API_KEY` | Fanart.tv supplemental artwork |
| `VAPID_PUBLIC_KEY` | Web Push (client subscribe) |
| `VAPID_PRIVATE_KEY` | Web Push (server send — later) |
| `VAPID_SUBJECT` | e.g. `mailto:you@example.com` |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for OAuth redirects |

## Docs

- `docs/ANILIST_OAUTH.md` · `docs/MAL_OAUTH.md`
- `docs/ANIDB.md` · `docs/WATCHMODE.md` · `docs/SIMKL.md` · `docs/FANART.md`
- `docs/OPEN_METEO.md` · `docs/ICS_CALENDAR.md` · `docs/WEB_PUSH.md`
