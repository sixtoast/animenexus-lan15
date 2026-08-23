# Multi-API Integration — status

| Sprint | Name | Status |
|--------|------|--------|
| 0–3 | Audit → Unified types | Done |
| **4** | Cache / rate-limit | **Done** |
| 5 | AniList hardening | Next |
| 6+ | MAL / enrichment features | Queued |

## Sprint 4

- `lib/api-cache.ts` — category TTLs (`identity` / `medium` / `catalog` / `short`) + `dedupedFetch`
- `lib/provider-rate-limit.ts` — min interval, failure counting, circuit open, `withProviderLimit`
- Rule unchanged: optional provider failure must not break AniList Detail
