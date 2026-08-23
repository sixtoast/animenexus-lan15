# AnimeNexus — API Architecture Audit (Sprint 0)

Audit date: 2026-08-23 · Repo: `sixtoast/animenexus-lan15`

This document describes **what exists today** before Multi-API Integration Sprints 1+.
Related: [`API_STRATEGY.md`](./API_STRATEGY.md) (catalog failover notes).

---

## 1. Identity model (current)

Primary type: `Anime` in `lib/types.ts`.

| Field | Role |
|-------|------|
| `id` | **Route / watchlist key** — AniList id when source is AniList; **offset** for Kitsu / Shikimori fallbacks |
| `anilist_id` | AniList id when known (0 for pure fallback rows) |
| `idMal` | Optional MAL id from AniList `idMal` or import paths |
| `source` | `"anilist" \| "kitsu" \| "shikimori"` (string) |

**Offset scheme** (avoid id collisions):

| Provider | Offset constant | Native id space |
|----------|-----------------|-----------------|
| AniList | none | native GraphQL `Media.id` |
| Kitsu | `KITSU_ID_OFFSET = 10_000_000` | `lib/providers/kitsu.ts` |
| Shikimori | `SHIKI_ID_OFFSET` | `lib/providers/shikimori.ts` |

**Gaps vs Multi-API plan:**

- No unified `AnimeIdentity` with confidence / mapping method / timestamp
- MAL import stores **MAL ids as `WatchlistEntry.id`** (`notes: "source:mal"`) — can collide with AniList ids
- No TMDB / AniDB / AnimeThemes / Wikidata id fields on `Anime`

---

## 2. Provider inventory

### Tier 1 — Core (blocking for catalog)

| Provider | Purpose | Auth | Rate limit (practical) | Canonical IDs | Cache | Failure | Routes / callers | Status |
|----------|---------|------|------------------------|---------------|-------|---------|------------------|--------|
| **AniList GraphQL** | Search, discover, filter, detail, relations, user lists (public username) | None for public queries | Conservative; 429 handled with 1 retry | `Media.id` | Next `revalidate` 300/120 + `lib/api-cache.ts` | Throws → failover or null | `lib/anilist.ts`, `anilist-detail.ts`, `anilist-user.ts`, `anilist-discover.ts`, browse/home/detail | **Blocking** |

Key exports:

- `fetchDiscover`, `searchAnime`, `fetchFiltered`, `fetchAnimeById` (`lib/anilist.ts`)
- `fetchAnimeDetail`, `fetchAncestryGraph` (`lib/anilist-detail.ts`)
- User: `lib/anilist-user.ts` (public lists → watchlist sync)

Failover chain (catalog only):

```
AniList → Kitsu → Shikimori
```

Implemented via `withFallbacks` in `lib/anilist.ts`. Logs `[anime-api]`.

---

### Tier 2 — Catalog fallbacks (optional)

| Provider | Purpose | Auth | Cache | Failure | Status |
|----------|---------|------|-------|---------|--------|
| **Kitsu** JSON:API | Discover/search/filter/byId when AniList down | None | Next revalidate 300 | Soft via chain | Optional |
| **Shikimori** | Same | None | Same | Soft via chain | Optional |

Files: `lib/providers/kitsu.ts`, `lib/providers/shikimori.ts`.

---

### Tier 2/3 — Enrichment & features (optional)

| Provider | Purpose | Auth | IDs | Cache | Failure | Callers | Status |
|----------|---------|------|-----|-------|---------|---------|--------|
| **Jikan v4** | Public MAL user list import; OP/ED text themes | None | `mal_id` | Themes: Next 86400; list: live | Soft-fail themes; import throws with message | `lib/mal-user.ts`, `lib/jikan-themes.ts`, `app/api/mal-list` | Optional |
| **AnimeThemes.moe** | OP/ED + page/video links | None | AniList external resource or title search | `api-cache` long + Next 86400 | Soft-fail | `lib/providers/animethemes.ts`, `lib/themes-enrich.ts` | Optional |
| **trace.moe** | Sauce / scene ID | None (API) | Returns AniList id when possible | **No shared cache** (per request) | Error string on `SauceResponse` | `lib/sauce.ts`, `app/api/sauce` | Optional feature |
| **YouTube** | Trailer embed (AniList trailer id only); theme search URLs | None client | AniList `trailer.id` | N/A | Omit section if missing | Detail page | Optional |

**Not integrated yet (plan targets):**

| Provider | Planned role |
|----------|----------------|
| MyAnimeList API v2 | OAuth list import/sync (currently Jikan public lists only) |
| AnimeSchedule.net | Airing / Radar |
| AniSkip | Skip intervals / binge |
| MusicBrainz | Theme artist/recording metadata |
| TMDB | Visual enrichment |
| YouTube Data API | Official video discovery (beyond AniList trailer) |
| Wikidata | Identity bridge |
| MangaDex / TheTVDB | Future |

---

## 3. Caching & rate limits (current)

| Layer | Location | Behaviour |
|-------|----------|-----------|
| Next.js fetch cache | Server `fetch` `next.revalidate` | 300s catalog, 120s detail, 86400 themes |
| Process memory | `lib/api-cache.ts` | ~60s default TTL, max 200 keys; detail 120s; themes long |
| AniList 429 | `anilist.ts` / `anilist-detail.ts` | One retry; Retry-After capped 5s |
| Jikan list import | `mal-user.ts` | 350ms delay between pages; surface 429 |

**Missing vs plan:** provider-specific rate limit module, circuit breakers, structured observability, health dashboard.

---

## 4. App API routes (`app/api/`)

| Route | Role | Upstream |
|-------|------|----------|
| `search` | Search proxy | AniList (+ failover) |
| `recommend` | Recommendations | Local rank + AniList |
| `relations` | Relation graph data | AniList detail |
| `challenge-pool` | Challenge tool pool | AniList |
| `upcoming` | Seasonal/upcoming | AniList |
| `mal-list` | Public MAL import | Jikan |
| `sauce` | Scene search | trace.moe |
| `confessions` | Fan zone | Supabase |

UI also calls AniList **from Server Components** directly via `lib/*` (not only API routes).

---

## 5. Feature → data map

| Feature | Data source today |
|---------|-------------------|
| Browse / Home feeds | AniList (+ Kitsu/Shiki failover) |
| Detail core | `fetchAnimeDetail` → fallback `fetchAnimeById` |
| Characters / relations / trailer | AniList detail fields |
| Themes OP/ED | AnimeThemes + Jikan (merged) |
| External links | `lib/external-links.ts` (known ids only) |
| Watchlist | Local storage; optional AniList/Jikan import |
| Account AniList | Public username (no OAuth) |
| Account MAL | Jikan public username |
| Sauce | trace.moe → AniList id |
| Radar | Local / AniList-derived (not AnimeSchedule yet) |
| Binge calculator | Local episode count × duration (no AniSkip) |
| Oracle / Recommend | Local + AniList catalog |
| Confessions | Supabase |

---

## 6. Environment / secrets

| Concern | Notes |
|---------|--------|
| AniList | No key for public GraphQL |
| Supabase | Confessions (existing) |
| MAL OAuth / TMDB / YouTube Data | **Not wired** |
| Client secrets | Providers called from server components / route handlers where possible; trace.moe via `app/api/sauce` |

---

## 7. Architectural gaps (for Sprints 1–4)

1. **Identity layer** — need `lib/anime-identity.ts` with mappings + confidence; stop using raw MAL ids as route ids without resolution.
2. **Provider interface** — capabilities (`CatalogueProvider`, `ThemeProvider`, …) vs ad-hoc modules.
3. **Unified enrichment types** — `AnimeTheme`, `AnimeEpisode`, `AnimeBroadcast` with provenance.
4. **Orchestrator** — UI should call experience services, not providers (plan Sprint 27); detail currently composes enrichment in the page.
5. **Progressive enrichment** — detail is mostly server-awaited; themes already soft-fail but block TTFB slightly.
6. **Circuit breakers / health** — not present.

---

## 8. Non-negotiable rules (carry forward)

- AniList remains **primary internal id** for catalog titles.
- Optional providers must **never** make Detail unusable.
- No invented titles, scores, or schedule times.
- Provenance must stay visible where enrichment is shown.
- Components request **capabilities**, not raw provider URLs (target state).

---

## 9. Sprint 0 done criteria

- [x] AniList fetch / detail / types inspected
- [x] Caching patterns documented
- [x] Existing providers listed (Kitsu, Shikimori, Jikan, AnimeThemes, trace.moe)
- [x] API routes inventoried
- [x] Identity gaps called out
- [x] This file: `docs/API_ARCHITECTURE.md`

**Next:** Sprint 1 — Universal Anime Identity Layer (`lib/anime-identity.ts`).
