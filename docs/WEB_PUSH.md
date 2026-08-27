# Web Push

## Foundation (Sprint 23)

- Service worker `push` + `notificationclick`
- Account → Notifications opt-in
- `GET /api/push/vapid` · `POST /api/push/subscribe`

## Send pipeline (Sprint 25)

### Env

```
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:you@example.com
PUSH_SEND_SECRET=long-random-string

# Optional durable store
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Generate VAPID: `npx web-push generate-vapid-keys`

SQL table: `docs/sql/push_subscriptions.sql`

### Send a test push

```bash
curl -X POST https://YOUR_DOMAIN/api/push/send \
  -H "Authorization: Bearer $PUSH_SEND_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"title":"Radar","body":"Something new","url":"/tools/signals"}'
```

Without Supabase, subscriptions live in **process memory** (lost on cold start). Use Supabase for production multi-instance.

### Flow

1. User enables notifications on Account (with VAPID public key)
2. Browser subscribes → `POST /api/push/subscribe` stores endpoint
3. Admin/cron calls `POST /api/push/send` with secret
4. SW shows notification; click opens `url`
