# API Expansion II — status

| Sprint | Name | Status |
|--------|------|--------|
| 0–12 | Audit → Watchmode | Done |
| **13** | User streaming services (My Services) | **Done** |
| 14 | Where to Watch (Detail) | Next |
| 15+ | Available-to-me recommendations … | Queued |

## Sprint 13

- `lib/my-services.ts` — local prefs + provider matching
- `MyServicesSettings` on Account — region + service checkboxes
- Does not assume subscriptions; only explicit user selection
