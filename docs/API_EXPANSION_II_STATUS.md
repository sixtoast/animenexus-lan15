# API Expansion II — status

| Sprint | Name | Status |
|--------|------|--------|
| 0 | Audit | Done |
| **1** | Extend identity graph | **Done** |
| 2 | Niche metadata model | Next |
| 3–46 | … | Queued |

## Sprint 1

- Added providers: `tvdb`, `imdb`, `simkl`, `watchmode`, `fanart`
- Fields: `tvdbId`, `imdbId`, `simklId`, `watchmodeId`
- Methods: `mapping_dataset`, `multi_id_agree`
- Title-match cannot overwrite authoritative mappings; field write gated for provisional maps
- `mapId()` / `isAuthoritativeMapping()` / `IDENTITY_RESOLUTION_ORDER`
