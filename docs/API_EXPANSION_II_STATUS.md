# API Expansion II — status

| Sprint | Name | Status |
|--------|------|--------|
| 0–11 | Audit → creative connections | Done |
| **12** | Watchmode provider | **Done** |
| 13 | User streaming services (My Services) | Next |
| 14+ | Where to Watch UI … | Queued |

## Sprint 12

- `lib/providers/watchmode.ts` — resolve + sources by country
- Soft-fail without `WATCHMODE_API_KEY`
- Never implies user owns the subscription
- Docs: `docs/WATCHMODE.md`
