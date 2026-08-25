# API Expansion II — status

| Sprint | Name | Status |
|--------|------|--------|
| 0–1 | Audit + identity | Done |
| **2** | Niche metadata model | **Done** |
| 3 | Metadata provenance / conflicts | Next |
| 4+ | AniDB provider … | Queued |

## Sprint 2

- `lib/deep-metadata.ts` — `AnimeDeepMetadata` and related types
- Core `Anime` remains separate; deep layer is additive
- Helpers: `emptyDeepMetadata`, `topDeepTags`, `mergeDeepMetadata`, `nowProvenance`
