# Programme status

## Micro-interaction & sound (0–19) — closed

See [`MICRO_SHIP_CHECKLIST.md`](./MICRO_SHIP_CHECKLIST.md).

## API enrichment

| Sprint | Focus | Status |
|--------|--------|--------|
| **20** | Cache + 429 retry + source tracking | **Done** |
| 21+ | Detail/enrichment APIs (themes, trailers, etc.) | Queued |

### Sprint 20

- `lib/api-cache.ts` — short TTL process cache
- Discover / search / filtered / byId wrapped
- AniList 429 → one gentle retry
- `getLastCatalogSource()` for observability
- Strategy: [`API_STRATEGY.md`](./API_STRATEGY.md)
