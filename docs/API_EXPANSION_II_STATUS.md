# API Expansion II — status

| Sprint | Name | Status |
|--------|------|--------|
| 0–4 | Audit → AniDB provider | Done |
| **5** | AniDB title intelligence | **Done** |
| 6 | AniDB weighted tags | Next |
| 7+ | Deep tag explorer … | Queued |

## Sprint 5

- `lib/providers/anidb-titles.ts`
- Dump `anime-titles.xml.gz` → in-memory + 7-day cache
- `searchAniDbTitles(query)` — local alias index only
- No per-keystroke AniDB HTTP API
