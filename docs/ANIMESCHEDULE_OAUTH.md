# AnimeSchedule OAuth

AnimeNexus uses AnimeSchedule.net API v3 OAuth 2.0 Authorization Code + PKCE. AnimeSchedule documents PKCE as supported and strongly recommended, and requires a mandatory OAuth state parameter.

## Callback / redirect URL

Production:
```
https://YOUR-DOMAIN/api/animeschedule/callback
```

Local development:
```
http://localhost:3000/api/animeschedule/callback
```

Register the exact production callback in your AnimeSchedule application settings.

## Vercel environment variables

```
ANIMESCHEDULE_CLIENT_ID=...
ANIMESCHEDULE_CLIENT_SECRET=...          # only if your AnimeSchedule application provides one
ANIMESCHEDULE_REDIRECT_URI=https://YOUR-DOMAIN/api/animeschedule/callback
ANIMESCHEDULE_SCOPE=...                   # optional; use the scopes configured/required by your AnimeSchedule application
NEXT_PUBLIC_SITE_URL=https://YOUR-DOMAIN
```

Do not commit the client secret.

## Routes

| Route | Role |
|---|---|
| GET /api/animeschedule/auth | Starts OAuth with state + PKCE |
| GET /api/animeschedule/callback | Validates state, exchanges code, stores httpOnly tokens |
| GET /api/animeschedule/status | Checks the connection and resolves the connected AnimeSchedule username |
| DELETE /api/animeschedule/status | Revokes the access token when possible and clears local token cookies |

Access and refresh tokens are kept server-side in httpOnly cookies. The browser never receives the OAuth tokens.

The status endpoint uses AnimeSchedule's OAuth-only GET /animelists/oauth endpoint to verify the connection and read the authorised account identity.

## Security

- Authorization Code flow with PKCE S256.
- Mandatory state cookie with a short 10-minute lifetime.
- Access/refresh tokens are httpOnly and never exposed to client JavaScript.
- Access tokens are refreshed server-side when an unexpired refresh token is available.
- Disconnect attempts to revoke the access token before clearing local credentials.
- OAuth credentials are never written to the repository.