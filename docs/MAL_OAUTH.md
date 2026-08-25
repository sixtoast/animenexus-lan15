# MAL OAuth

## Routes

| Route | Role |
|-------|------|
| `GET /api/mal/auth` | Start authorize (PKCE cookies + redirect) |
| `GET /api/mal/callback` | Exchange code → httpOnly tokens |
| `GET /api/mal/status` | Connected? |
| `DELETE /api/mal/status` | Disconnect |
| `POST /api/mal/flush` | Push queue → MAL |

## Setup

1. Create app: [myanimelist.net/apiconfig](https://myanimelist.net/apiconfig)
2. **App Redirect URL** must match **exactly**:

```
https://YOUR-DOMAIN/api/mal/callback
```

3. Vercel env (no quotes around values):

```
MAL_CLIENT_ID=...
MAL_CLIENT_SECRET=...          # only if MAL shows a secret
MAL_REDIRECT_URI=https://YOUR-DOMAIN/api/mal/callback
NEXT_PUBLIC_SITE_URL=https://YOUR-DOMAIN
```

4. Redeploy → Account → **Connect MyAnimeList**

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `invalid_client` / `invalid_request` | Wrong ID/secret, or redirect URI ≠ MAL app setting |
| `state_mismatch` | Start Connect again in the **same** browser; don’t open auth in a second tab |
| `missing_pkce` | Cookies blocked; allow cookies for your domain |
| Connect button does nothing useful | `MAL_CLIENT_ID` missing → redeploy after setting |

MAL uses **PKCE plain** (code_challenge = code_verifier). Do not change that.

Public list import (username via Jikan) still works **without** OAuth.
