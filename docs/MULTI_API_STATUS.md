# Multi-API Integration — status

| Sprint | Name | Status |
|--------|------|--------|
| 0 | API audit | Done |
| 1 | Universal identity | Done |
| **2** | Provider interface | **Done** |
| 3 | Unified result types | Next |
| 4+ | Cache / features | Queued |

## Sprint 2

- `lib/providers/types.ts` — capability contracts + `ProviderResult<T>` provenance envelope
- `lib/providers/index.ts` — stable exports + provider id list
- Capabilities: catalogue, detail, schedule, episode, theme, scene, visual, music, list, video, skip
- Existing kitsu/shikimori/animethemes modules remain; adapters wrap them in later sprints
