# Programme status

## Micro-interaction & sound (0–19) — closed

See [`MICRO_SHIP_CHECKLIST.md`](./MICRO_SHIP_CHECKLIST.md).

## API enrichment

| Sprint | Focus | Status |
|--------|--------|--------|
| 20 | Cache + failover | Done |
| **21** | Themes enrichment | **Done** |
| 22+ | More secondary (TMDB optional, etc.) | Queued |

### Sprint 21

- `lib/providers/animethemes.ts` — soft-fail OP/ED from AnimeThemes.moe
- `lib/themes-enrich.ts` — merge AnimeThemes + Jikan; honest source note
- Detail: detail-query fails → basic `fetchAnimeById`
- Theme rows: AnimeThemes link when known + YouTube search
