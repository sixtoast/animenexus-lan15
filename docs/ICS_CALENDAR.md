# ICS calendar export

## Endpoint

```
GET /api/calendar/airing.ics?hours=72
```

- `hours` — 12–168 (default 72)
- Source: AniList airing schedule (`fetchAiringSchedule`)
- Soft-fail: empty VCALENDAR if upstream fails

## UI

`/airing` — Download ICS (72h) / (7d)

## Code

- `lib/ics-calendar.ts` — RFC 5545-style builder
- `app/api/calendar/airing.ics/route.ts`
- `components/CalendarExportLinks.tsx`

Times are written as **UTC**; calendar apps convert to local.
