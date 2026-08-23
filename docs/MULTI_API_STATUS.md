# Multi-API Integration — status

| Sprint | Name | Status |
|--------|------|--------|
| 0–9 | Foundation → episodes | Done |
| **10** | AnimeSchedule.net | **Done** (adapter; needs API key) |
| 11 | Radar + schedule | Next |
| 12+ | Home signals / AniSkip / Sauce / … | Queued |

## Sprint 10

- `lib/providers/anime-schedule.ts` — soft-fail without `ANIMESCHEDULE_API_KEY`
- `getAnimeSchedule` / `getNextEpisode` → `AnimeBroadcast[]`
- `docs/ANIMESCHEDULE.md` setup notes
- No claim of live data until key is configured and a real request succeeds
