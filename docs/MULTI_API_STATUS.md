# Multi-API Integration — status

| Sprint | Name | Status |
|--------|------|--------|
| 0–4 | Audit → Cache/rate-limit | Done |
| **5** | AniList hardening | **Done** |
| 6 | MAL identity + import | Next |
| 7+ | Sync / enrichment features | Queued |

## Sprint 5

- All catalog fetches: `dedupedFetch` + `CACHE_TTL.catalog`
- GraphQL via `withProviderLimit("anilist")`
- `fetchAnimeByIds` batch helper (`id_in`, max 50)
- Detail: shared rate-limit + medium TTL dedupe
- Still no card-level per-tile AniList fetches introduced
