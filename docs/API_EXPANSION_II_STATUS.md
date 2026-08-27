# API Expansion II — status

| Sprint | Name | Status |
|--------|------|--------|
| 0–27 | Core → Manga adapter | Done |
| **28** | Airing → push job | **Done** |
| 29+ | Remaining plan items / polish | Queued |

## Sprint 28

- `lib/airing-push-job.ts` — window scanner
- `GET|POST /api/cron/airing-push` — dry run or send
- `vercel.json` hourly cron + `docs/AIRING_PUSH.md`
