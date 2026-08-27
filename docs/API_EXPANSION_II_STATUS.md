# API Expansion II — status

| Sprint | Name | Status |
|--------|------|--------|
| 0–19 | Audit → viewing context | Done |
| **20** | Polish / hardening | **Done** |
| 21+ | Open-Meteo, Push, ICS, rewatch… | Queued if desired |

## Sprint 20

- `docs/API_EXPANSION_II_SOFT_FAIL.md` — failure matrix
- `docs/API_EXPANSION_II_CHECKLIST.md` — env + smoke test
- `lib/provider-status.ts` + `GET /api/provider-status` — boolean config only

## Shipped capability map (0–20)

| Area | Deliverable |
|------|-------------|
| Identity | simkl / watchmode / tvdb / imdb fields + mapping |
| Deep meta | types, conflicts, AniDB tags/relations |
| Franchise | relation merge + order paths + uncertainty |
| Creative | DNA + shelf connections |
| Streaming | Watchmode, My Services, Where to Watch, available-to-me, change signals |
| Bridges | Simkl resolve, Fanart gallery |
| Context | Era / season chips |
| Ops | Soft-fail docs, provider status API |
