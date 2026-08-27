# Web Push foundation

## What works now

- Service worker (`public/sw.js`) handles `push` + `notificationclick`
- Account → **Notifications** opt-in UI
- Local preference categories (airing / streaming / radar)
- Optional `PushManager.subscribe` when `VAPID_PUBLIC_KEY` is set
- `POST /api/push/subscribe` acknowledges endpoints (no durable store yet)

## Env (optional)

```
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:you@example.com
```

Generate a pair with `npx web-push generate-vapid-keys`.

**Never** expose the private key to the client.

## Not yet

- Persistent subscription database
- Server job that sends pushes for airing / streaming signals

Those are the natural follow-up sprint (Signals inbox + send pipeline).
