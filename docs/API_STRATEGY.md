# Catalog API strategy (Sprint 20+)

## Identity layer

**AniList GraphQL** is the canonical catalog for ids, browse, search, and detail.
Fallback providers use **offset ids** so routes never collide:

| Source | Id space |
|--------|----------|
| AniList | native |
| Kitsu | `10_000_000 + native` |
| Shikimori | (see `SHIKI_ID_OFFSET`) |

Each `Anime` carries `source: "anilist" | "kitsu" | "shikimori"`.

## Failover

```
AniList → Kitsu → Shikimori
```

Only on hard failure (HTTP error / empty GraphQL errors). Never invent rows.

Detail: `fetchAnimeDetail` → on failure `fetchAnimeById` (still no fake data).

## Themes (Sprint 21)

Optional enrichment only:

1. **AnimeThemes.moe** — OP/ED + page/video links when AniList resource or title matches
2. **Jikan** — text OP/ED from MAL id

Soft-fail. UI shows source note. Never blocks the page.

## Caching

1. Next `fetch` `revalidate: 300` (discover/search) / `120` (detail) / `86400` (themes)
2. Process-local `lib/api-cache.ts` (~60s TTL for catalog; longer for themes)

## Rate limits

AniList `429`: single retry with `Retry-After` (capped 5s) or 1.2s default.

## Non-goals

- No scraped streaming sites
- No fake scores or fabricated titles
- Jikan not primary catalog (MAL import + theme text only)
