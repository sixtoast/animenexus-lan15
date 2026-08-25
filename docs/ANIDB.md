# AniDB (niche metadata)

AniDB is **not** a catalog replacement for AniList. It supplies deep titles, weighted tags, and relations.

## Env

Register an HTTP client at [anidb.net](https://anidb.net) (account → API client registration):

```
ANIDB_CLIENT=yourregisteredclient   # lower-case
ANIDB_CLIENTVER=1
```

Without these vars, all AniDB calls soft-fail.

## Limits

- ~1 request / 2 seconds
- Aggressive caching (24h identity TTL in-process)
- Abusive clients get banned

## Code

- `lib/providers/anidb.ts` — `fetchAniDbByAid`, `enrichDeepFromAniDb`, `anidbToDeepMetadata`
