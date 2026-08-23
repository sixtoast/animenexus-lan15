# AnimeNexus — API Architecture Audit (Sprint 0 + 1)

Audit date: 2026-08-23 · Repo: `sixtoast/animenexus-lan15`

Related: [`API_STRATEGY.md`](./API_STRATEGY.md) · [`MULTI_API_STATUS.md`](./MULTI_API_STATUS.md)

---

## 1. Identity model

### Runtime UI type

Primary type: `Anime` in `lib/types.ts` (`id`, `anilist_id`, `idMal`, `source`).

### Identity layer (Sprint 1)

`lib/anime-identity.ts`:

- **`AnimeIdentity`** — `anilistId` primary; optional mal/kitsu/shiki/tmdb/…
- **`IdentityMapping`** — source, target, targetId, confidence, method, timestamp
- Builders: `identityFromAnime`, `identityFromMalImport`
- Helpers: `preferredCatalogId`, `withMapping`, `getMapping`, `isUnresolvedMalOnly`

Offset scheme for catalog fallbacks:

| Provider | Offset |
|----------|--------|
| AniList | native |
| Kitsu | `10_000_000 + native` |
| Shikimori | `SHIKI_ID_OFFSET + native` |

**Still open:** MAL import may store MAL ids on watchlist without AniList resolution — use `identityFromMalImport` + future resolver before treating as catalog routes.

---

## 2. Provider inventory

### Tier 1 — Core

| Provider | Purpose | Auth | Cache | Failure | Status |
|----------|---------|------|-------|---------|--------|
| **AniList GraphQL** | Search, discover, detail, relations, public lists | None | revalidate + `api-cache` | Failover / null | **Blocking** |

### Tier 2 — Catalog fallbacks

| Provider | Status |
|----------|--------|
| Kitsu | Optional failover |
| Shikimori | Optional failover |

### Enrichment / features

| Provider | Status |
|----------|--------|
| Jikan | MAL public list + theme text |
| AnimeThemes | OP/ED enrichment |
| trace.moe | Sauce |
| YouTube embed | AniList trailer id only |

**Not integrated:** MAL OAuth, AnimeSchedule, AniSkip, MusicBrainz, TMDB, YouTube Data API, Wikidata.

---

## 3. Caching

| Layer | Behaviour |
|-------|-----------|
| Next `revalidate` | 300 catalog / 120 detail / 86400 themes |
| `lib/api-cache.ts` | Process TTL, max 200 keys |
| AniList 429 | Single retry |

---

## 4. App API routes

`search`, `recommend`, `relations`, `challenge-pool`, `upcoming`, `mal-list`, `sauce`, `confessions`.

---

## 5. Gaps for later sprints

1. Provider capability interfaces (Sprint 2)
2. Unified enrichment types with provenance (Sprint 3)
3. Rate-limit module + circuit breakers (Sprint 4 / 31)
4. Experience orchestrator (Sprint 27)
5. MAL → AniList resolution on import (Sprint 6)

---

## Rules

- AniList id is primary for catalog titles.
- Optional providers never block core Detail.
- No invented data.
- Provenance required on enrichment.
