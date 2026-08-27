# API Expansion II — status

| Sprint | Name | Status |
|--------|------|--------|
| 0–29 | Core → Quiet hours | Done |
| **30** | Polish (status UI + docs index) | **Done** |

## Sprint 30

- Expanded `getOptionalProviderStatus` (VAPID, cron, Supabase, Open-Meteo)
- `/tools/status` + tools hub card
- `docs/API_EXPANSION_II_INDEX.md`

## Programme outcome

Expansion II audit capabilities are implemented with soft-fail. Remaining work is ops (keys, VAPID, Supabase table) rather than missing architecture.

## Build note

`ProvenanceFact<T>` generic fix is on main; production build typechecks clean.
