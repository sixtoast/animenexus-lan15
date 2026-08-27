# API Expansion II — status

| Sprint | Name | Status |
|--------|------|--------|
| 0–24 | Core → Signals inbox | Done |
| **25** | Push send pipeline | **Done** |
| 26+ | Simkl rewatch / manga adapter… | Queued |

## Sprint 25

- `web-push` + `lib/push-server.ts`
- Durable store via Supabase `push_subscriptions` (optional)
- `POST /api/push/send` guarded by `PUSH_SEND_SECRET`
