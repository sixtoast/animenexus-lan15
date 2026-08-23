# AnimeSchedule.net (Sprint 10)

## Setup

1. Create an account at [animeschedule.net](https://animeschedule.net)
2. Account → Settings → API → create Application
3. Copy the Bearer token
4. Vercel / `.env`:

```
ANIMESCHEDULE_API_KEY=your_token_here
```

Server-only. Never expose in client bundles.

## Code

- `lib/providers/anime-schedule.ts`
  - `getAnimeSchedule(identity)`
  - `getNextEpisode(identity)`
  - `getUserSchedule()` — reserved (needs user OAuth)

## Behaviour without key

All functions return empty / null. Detail and Radar stay usable.

## Docs

https://animeschedule.net/api/v3/documentation
