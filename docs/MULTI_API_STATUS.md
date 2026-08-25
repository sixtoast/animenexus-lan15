# Multi-API Integration — status

| Sprint | Name | Status |
|--------|------|--------|
| 0–10 | Foundation → AnimeSchedule adapter | Done |
| **11** | Radar + schedule | **Done** |
| 12 | Home airing signal | Next |
| 13+ | AniSkip / Sauce / Themes depth | Queued |

## Sprint 11

- `lib/radar-schedule.ts` — RAW/SUB/DUB bands + TODAY/TOMORROW/WEEK windows
- `POST /api/radar-schedule` — shelf watching/planning → next air contacts
- Radar UI: band filters, grouped windows, soft note when key missing
- Horizon scan still AniList; shelf times need `ANIMESCHEDULE_API_KEY`
