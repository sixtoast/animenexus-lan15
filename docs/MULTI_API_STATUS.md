# Multi-API Integration — status

| Sprint | Name | Status |
|--------|------|--------|
| 0–5 | Foundation | Done |
| **6** | MAL identity + import | **Done** |
| 7 | Optional MAL sync | Queued (needs OAuth) |
| 8+ | Jikan enrichment / schedule / … | Queued |

## Sprint 6

- `lib/mal-resolve.ts` — `Media(idMal:)` → AniList id (confidence 1.0)
- `fetchMalUserList` resolves ids; notes `source:mal` / `source:mal-unresolved`
- `mergeWatchlistImport(policy)` — `keep_local` | `prefer_incoming` | `furthest_progress`
- No silent overwrite of higher local progress under furthest_progress
- **Not yet:** MAL OAuth continuous sync (Sprint 7)
