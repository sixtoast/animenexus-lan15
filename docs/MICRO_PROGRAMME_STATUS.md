# Programme status

## Micro-interaction & sound (0–19) — closed

See [`MICRO_SHIP_CHECKLIST.md`](./MICRO_SHIP_CHECKLIST.md).

## API enrichment

| Sprint | Focus | Status |
|--------|--------|--------|
| 20 | Cache + failover | Done |
| 21 | Themes (AnimeThemes + Jikan) | Done |
| **22** | External links + detail cache | **Done** |
| 23+ | Optional extras | Queued |

### Sprint 22

- `lib/external-links.ts` — AniList / MAL / Kitsu / Shikimori only when id known
- Detail section **External catalogs**
- `fetchAnimeDetail` process-cached (120s) + 429 retry
