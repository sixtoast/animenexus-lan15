# MAL OAuth (Sprint 7)

## Current behaviour

- **Import:** public lists via Jikan + AniList `idMal` resolution (Sprint 6).
- **Sync queue:** `lib/mal-sync.ts` stores pending status/progress/score mutations locally.
- Local watchlist updates **always succeed** first; MAL is best-effort.

Until MAL OAuth is configured, `flushMalSyncQueue()` returns `not_connected` / `oauth_not_configured` and **does not** claim remote success.

## To enable real sync

1. Register an app at [MyAnimeList API](https://myanimelist.net/apiconfig).
2. Set env (server only):

```
MAL_CLIENT_ID=
MAL_CLIENT_SECRET=
MAL_REDIRECT_URI=https://<your-domain>/api/mal/callback
```

3. Implement routes:
   - `GET /api/mal/auth` — start OAuth
   - `GET /api/mal/callback` — exchange code, store refresh token (encrypted / httpOnly)
4. Map queue mutations to MAL API v2 list endpoints.
5. Set `setMalConnectedFlag(true)` only after a valid token exists.

## Rules

- Never undo AnimeNexus local state if MAL fails.
- Show “MAL sync pending” in Account when `pendingCount > 0`.
- Do not put client secrets in the browser bundle.
