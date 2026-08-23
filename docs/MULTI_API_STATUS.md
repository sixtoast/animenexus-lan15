# Multi-API Integration — status

| Sprint | Name | Status |
|--------|------|--------|
| 0–6 | Foundation + MAL import | Done |
| **7** | Optional MAL sync | **Done** (queue; OAuth pending credentials) |
| 8 | Jikan enrichment | Next |
| 9+ | Episodes / schedule / … | Queued |

## Sprint 7

- `lib/mal-sync.ts` — local-first mutation queue + status
- `docs/MAL_OAUTH.md` — env + route checklist for real write-back
- Local updates never blocked or rolled back for MAL
- Real bidirectional sync requires `MAL_CLIENT_ID` / secret (not in this build)
