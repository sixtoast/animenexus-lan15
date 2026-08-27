# API Expansion II — status

| Sprint | Name | Status |
|--------|------|--------|
| 0–17 | Audit → Simkl | Done |
| **18** | Fanart.tv / artwork | **Done** |
| 19 | Context / history layers | Next |
| 20+ | … | Queued |

## Sprint 18

- `lib/providers/fanart.ts` — TVDB → posters/backgrounds/logos
- `ArtworkGallery` on Detail (collapsible; AniList cover stays primary)
- Soft-fail without `FANART_API_KEY` or `tvdbId`
