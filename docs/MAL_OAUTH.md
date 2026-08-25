# MAL OAuth

## Status

OAuth 2.0 + PKCE (`plain`) is implemented.

| Route | Role |
|-------|------|
| `GET /api/mal/auth` | Start authorize (sets PKCE cookies, redirects to MAL) |
| `GET /api/mal/callback` | Exchange code → httpOnly token cookies |
| `GET /api/mal/status` | Connected? + username |
| `DELETE /api/mal/status` | Disconnect |
| `POST /api/mal/flush` | Push queue items with `malId` to MAL list API |

Account → **Connect MyAnimeList** / **Flush pending → MAL**.

## Setup

1. Register an app: [MyAnimeList API Config](https://myanimelist.net/apiconfig)
2. App redirect URI must match exactly, e.g.
   - Production: `https://your-domain.com/api/mal/callback`
   - Local: `http://localhost:3000/api/mal/callback`
3. Vercel env (Key / Value):

```
MAL_CLIENT_ID=...
MAL_CLIENT_SECRET=...          # if your app has a secret
MAL_REDIRECT_URI=https://your-domain.com/api/mal/callback
NEXT_PUBLIC_SITE_URL=https://your-domain.com   # optional, for redirects
```

4. Redeploy. Open **Account** → Connect MyAnimeList.

## Behaviour

- Tokens live in **httpOnly** cookies (not `localStorage`).
- Access token refreshed via refresh_token when near expiry.
- Local watchlist updates **never** roll back if MAL flush fails.
- Flush only updates rows that already have a **MAL id**.

## Public import (no OAuth)

Jikan public username import still works without OAuth.
