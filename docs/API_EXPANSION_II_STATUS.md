# API Expansion II — status

| Sprint | Name | Status |
|--------|------|--------|
| 0–28 | Core → Airing push job | Done |
| **29** | Quiet hours + category filters | **Done** |
| 30+ | Polish / optional eval items | Queued |

## Sprint 29

- Quiet hours + category prefs on Account notifications
- Server `sendPushToAll` filters by stored prefs + quiet window
- Airing cron sends with `category: "airing"`
- **Sync prefs to server** re-upserts subscription prefs
