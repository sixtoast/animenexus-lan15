# Multi-API Integration — status

| Sprint | Name | Status |
|--------|------|--------|
| 0–2 | Audit → Provider interface | Done |
| **3** | Unified result types | **Done** |
| 4 | Cache / rate-limit architecture | Next |
| 5+ | Hardening + features | Queued |

## Sprint 3

- `lib/enrichment-types.ts` — domain import path + `AnimeEnrichmentBundle`
- Themes → `AnimeTheme[]` with `source`
- Sauce → `SceneMatch[]` with `source: "trace.moe"`
- Partial errors model: `errors` map, not hard fail
