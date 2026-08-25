# API Expansion II — status

| Sprint | Name | Status |
|--------|------|--------|
| 0–2 | Audit → deep model | Done |
| **3** | Metadata provenance / conflicts | **Done** |
| 4 | AniDB provider | Next |
| 5+ | Titles, tags, … | Queued |

## Sprint 3

- `lib/metadata-conflicts.ts`
- `collectConflict` / `conflictEpisodeCount` / `withProvenance`
- Core fields: AniList-first priority; deep layer may show "Sources disagree"
- Never silently pick AniDB 13 over AniList 12 for canonical catalog
