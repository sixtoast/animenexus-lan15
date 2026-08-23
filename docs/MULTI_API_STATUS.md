# Multi-API Integration — status

| Sprint | Name | Status |
|--------|------|--------|
| 0 | API audit | Done |
| **1** | Universal identity layer | **Done** |
| 2 | Provider interface | Next |
| 3+ | Types / cache / features | Queued |

## Sprint 1

- `lib/anime-identity.ts`
  - `AnimeIdentity` + `IdentityMapping` (source, target, confidence, method, timestamp)
  - `identityFromAnime` / `identityFromMalImport`
  - `preferredCatalogId`, `withMapping`, `isUnresolvedMalOnly`
- AniList remains primary catalog id; MAL/Kitsu/Shiki are mappings only
