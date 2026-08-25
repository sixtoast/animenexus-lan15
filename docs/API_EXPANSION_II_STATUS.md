# API Expansion II — status

| Sprint | Name | Status |
|--------|------|--------|
| 0–7 | Audit → deep signals UI | Done |
| **8** | AniDB relation graph | **Done** |
| 9 | Franchise intelligence | Next |
| 10+ | Production metadata … | Queued |

## Sprint 8

- `lib/relation-merge.ts` — `mergeRelations` AniList + AniDB
- AniList edges stay linkable; AniDB-only edges kept as external evidence
- Never invents AniList ids from AniDB AIDs alone
