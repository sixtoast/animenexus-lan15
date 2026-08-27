# Airing → push job (Sprint 28)

## Route

`GET|POST /api/cron/airing-push`

Scans AniList airing schedule for episodes in a window (default: −20 min … +50 min) and can broadcast Web Push via the Sprint 25 pipeline.

## Auth

Set **one** of:

- `CRON_SECRET` (preferred for Vercel Cron)
- `PUSH_SEND_SECRET`

Header: `Authorization: Bearer <secret>`

Vercel Cron automatically sends `Authorization: Bearer $CRON_SECRET` when the env var is set in the project.

## Query flags

| Param | Effect |
|-------|--------|
| `dry=1` | List matches only — no push |
| `per_title=1` | Up to 5 separate pushes |
| (default) | One summary push to `/airing` |

## Manual test

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://YOUR_DOMAIN/api/cron/airing-push?dry=1"
```

## Vercel Cron

`vercel.json` schedules hourly: `0 * * * *` → `/api/cron/airing-push`

Requires Pro for cron on some plans — without it, call the route from any external scheduler.

## Soft-fail

- No secret → 503
- No VAPID / no subscribers → push reports `skipped` / zero sent
- AniList schedule fail → empty list, still `ok: true`
