# Multi-API Integration — status

| Sprint | Name | Status |
|--------|------|--------|
| 0–19 | Foundation → Detail experience | Done |
| **20** | Docs + env checklist | **Done** |
| 21+ | Remaining plan polish | As needed |

## Sprint 20

- `docs/ENV_AND_APIS.md` — all providers + optional keys
- Soft-fail rule restated: AniList core never blocked by enrichment

## Recommended env (production)

```
ANIMESCHEDULE_API_KEY=   # Radar + home signals + next air
SAUCENAO_API_KEY=        # optional Sauce fallback
```

See also: `docs/MAL_OAUTH.md` for future write-back.
