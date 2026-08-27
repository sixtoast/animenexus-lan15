# Simkl

Optional catalog / id bridge. Soft-fails without a client id.

## Env

```
SIMKL_CLIENT_ID=your_client_id
```

Create an app: [simkl.com/settings/developer](https://simkl.com/settings/developer/new/)

## Code

- `lib/providers/simkl.ts`
  - `resolveSimklId` — MAL / AniList / AniDB / IMDb / TMDB via `/redirect`
  - `fetchSimklAnime` / `searchSimklAnime`
  - `enrichIdentityFromSimkl` — maps simklId (+ secondary ids when returned)

## Notes

- Not a catalog replacement — AniList stays primary.
- User OAuth / sync history can be layered later; Sprint 17 is identity + public metadata only.
