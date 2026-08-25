# Multi-API Integration — status

| Sprint | Name | Status |
|--------|------|--------|
| 0–17 | Foundation → Themes depth | Done |
| **18** | Unified getAnimeExperience | **Done** |
| 19 | Wire detail to experience (optional) | Next |
| 20+ | Polish / docs / hardening | Queued |

## Sprint 18

- `lib/anime-experience.ts` — `getAnimeExperience(anilistId)`
- Core: AniList detail/byId (required)
- Parallel soft: themes · Jikan · AnimeSchedule
- `layers` flags for UI honesty
- Optional skips via `ExperienceOptions`
