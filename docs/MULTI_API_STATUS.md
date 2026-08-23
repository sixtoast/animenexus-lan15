# Multi-API Integration — status

| Sprint | Name | Status |
|--------|------|--------|
| 0–7 | Foundation → MAL queue | Done |
| **8** | Jikan enrichment | **Done** |
| 9 | Real episode experience | Next |
| 10+ | Schedule / Sauce / Themes depth | Queued |

## Sprint 8

- `lib/providers/jikan.ts` — episodes, staff, characters (soft-fail)
- Detail: Episodes + Staff when MAL id known; Jikan characters only if AniList has none
- Provenance labels on every Jikan block
- Core AniList detail still renders if Jikan is down
