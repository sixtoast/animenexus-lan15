# API Expansion II — Sprint 0 Audit

Date: 2026-08-25  
Repo: `sixtoast/animenexus-lan15`  
Rule: Do not reimplement Multi-API I providers. Extend Identity / Provider / Cache / Enrichment / Provenance / Rate-limit.

## Existing Multi-API I stack (do not rebuild)

| Area | Status |
|------|--------|
| AniList (+ OAuth) | Implemented |
| MAL / Jikan (+ OAuth + sync queue) | Implemented |
| Kitsu / Shikimori failover | Implemented |
| AnimeSchedule | Implemented (key optional) |
| AniSkip | Implemented |
| trace.moe + SauceNAO | Implemented |
| AnimeThemes | Implemented |
| Identity layer (`lib/anime-identity.ts`) | Implemented (anilist, mal, kitsu, shiki, tmdb field, **anidbId slot**, animethemes, wikidata, mangadex) |
| Cache + rate-limit | Implemented |
| `getAnimeExperience` | Implemented |
| MusicBrainz / TMDB / YouTube / Wikidata | Planned/mentioned in prior programme — **no dedicated provider files found** under `lib/providers/` |

### Current `lib/providers/` files

- `anime-schedule.ts`, `animethemes.ts`, `aniskip.ts`, `jikan.ts`, `kitsu.ts`, `saucenao.ts`, `shikimori.ts`, `types.ts`, `index.ts`

---

## Proposed Expansion II capabilities

| Capability | Audit result | Notes |
|------------|--------------|-------|
| **Watchmode** | **NOT PRESENT** | No code, no env. Needed for streaming availability. |
| **Simkl** | **NOT PRESENT** | No OAuth/import. Rewatch model absent. |
| **fanart.tv** | **NOT PRESENT** | No artwork enrichment provider. |
| **AniDB** | **PARTIAL** | `anidbId` exists on `AnimeIdentity` / `withMapping`; **no** `lib/providers/anidb.ts`, no tags/titles dump. |
| **Open-Meteo / weather** | **NOT PRESENT** | No weather provider or viewing-context. |
| **Web Push / service worker** | **NOT PRESENT** | No SW, no push preferences. |
| **Calendar / ICS** | **NOT PRESENT** | Schedule data exists (AnimeSchedule); no ICS export. |
| **anime-metadata-db** | **NOT PRESENT** | Evaluation only (Sprint 34). |
| **Manga-source adapter interface** | **NOT PRESENT** | Future interface only. |
| **Notifications / Signals inbox** | **NOT PRESENT** | Radar exists; no in-app signal history or push. |
| **Deep metadata model** | **NOT PRESENT** | Enrichment types exist for episodes/themes/skip/etc.; no `AnimeDeepMetadata`. |
| **Franchise resolver** | **PARTIAL** | AniList relations + Ancestry UI exist; no multi-order franchise engine. |
| **Streaming prefs (My Services)** | **NOT PRESENT** | |
| **Rewatch sessions** | **NOT PRESENT** | Watchlist status model only. |

### Related existing surfaces (not duplicates of new APIs)

| Feature | Role vs Expansion II |
|---------|----------------------|
| Radar + AnimeSchedule | Broadcast context — calendar can **consume** this |
| Tonight planner | Time budget — weather/context can **lightly** enhance |
| Ancestry / relations | Franchise UX seed — merge AniDB evidence later |
| Jikan staff/characters | Production credits seed — not AniDB-weighted tags |
| External links on Detail | Catalog links only — not Watchmode availability |

---

## Identity graph gaps (Sprint 1)

Present on `AnimeIdentity`: `anilistId`, `malId`, `tmdbId`, `anidbId`, `animeThemesId`, `kitsuId`, `shikimoriId`, `mangadexId`, `wikidataId`.

**Missing dedicated fields:** `simklId`, `watchmodeId`, `tvdbId`, `imdbId` (needed for Watchmode / fanart TVDB path).

---

## Sprint 0 conclusion — proceed with

All of the following are **missing or only partial** and are in scope for Expansion II:

1. Identity extensions (simkl, watchmode, tvdb, imdb)  
2. Deep metadata model + provenance/conflict  
3. AniDB provider (titles, weighted tags, relations)  
4. Watchmode + My Services + Where to Watch  
5. Simkl + rewatch model  
6. fanart.tv + art selection  
7. Open-Meteo + viewing context (opt-in)  
8. Web Push foundation + Signals inbox  
9. ICS calendar export from schedule data  
10. Franchise structure engine (merge evidence)  

**Do not** reimplement AniList/MAL/Jikan/Schedule/AniSkip/Sauce/Themes cores.

---

## Next

**Sprint 1 — Extend the identity graph** (`simklId`, `watchmodeId`, `tvdbId`, `imdbId` + mapping methods).
