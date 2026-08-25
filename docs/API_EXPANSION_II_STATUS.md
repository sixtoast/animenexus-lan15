# API Expansion II — status

| Sprint | Name | Status |
|--------|------|--------|
| 0–3 | Audit → conflicts | Done |
| **4** | AniDB provider | **Done** |
| 5 | AniDB title intelligence | Next |
| 6+ | Weighted tags UI … | Queued |

## Sprint 4

- `lib/providers/anidb.ts` — HTTP `request=anime` by AID
- Parses titles, weighted tags (spoiler flags), relations, episode count
- Maps into `AnimeDeepMetadata`
- Soft-fail without `ANIDB_CLIENT` / `ANIDB_CLIENTVER`
- Docs: `docs/ANIDB.md`
