# AniList OAuth

## Two ways to connect

| Mode | UI label | Needs env? | Writes to AniList? |
|------|----------|------------|--------------------|
| **OAuth** | Log in with AniList | Yes | Token stored; write-back not implemented yet |
| **Quick login** | Quick login | No | Never — public username read only |

## Routes

| Route | Role |
|-------|------|
| `GET /api/anilist/auth` | Redirect to AniList authorize |
| `GET /api/anilist/callback` | Exchange code → httpOnly cookie |
| `GET /api/anilist/status` | Configured / connected |
| `DELETE /api/anilist/status` | Clear token cookie |

## Setup

1. Create an app: [AniList Settings → Developer](https://anilist.co/settings/developer)
2. Redirect URL must match exactly, e.g. `https://your-domain.com/api/anilist/callback`
3. Vercel env:

```
ANILIST_CLIENT_ID=
ANILIST_CLIENT_SECRET=
ANILIST_REDIRECT_URI=https://your-domain.com/api/anilist/callback
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

4. Redeploy → **Account** → **Log in with AniList**

Without these vars, only **Quick login** is offered.
