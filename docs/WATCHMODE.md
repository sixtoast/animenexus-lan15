# Watchmode (streaming availability)

Optional. Soft-fails without a key — Detail and recommendations still work.

## Env

```
WATCHMODE_API_KEY=your_key_from_api.watchmode.com
WATCHMODE_DEFAULT_REGION=US
```

Free developer plan is request-capped (often ~1k/month). Cache is aggressive (identity resolve 24h, sources 1h).

## Behaviour

- Resolves via IMDb / TMDB when present on identity; title search is last resort (low confidence).
- Always scopes results to an explicit **country** (never pretends US = global).
- Does **not** mean the user has that subscription — only that the title is listed there.

## Code

- `lib/providers/watchmode.ts` — `getStreamingAvailability`, `partitionAvailability`
