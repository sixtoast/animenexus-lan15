# AnimeNexus Lantern — Feature Inventory

**Sprint 0.1 · Protection & Baseline**  
Generated from repo state on `main` (post-Supabase confessions + mascot sprints).

Purpose: before any evolution sprint, know what exists, what persists, and what must not regress.

---

## Routes (App Router)

| Feature | Route | Primary UI | Data / APIs | Persistence |
|---------|-------|------------|-------------|-------------|
| Home | `/` | `HomeDashboard`, `HeroGreeting`, `MoodChips`, `DailyRitual` | AniList discover, memory, tonight | `lantern-memory`, session |
| Browse | `/browse` | `BrowseClient`, `AnimeGrid` | `/api/search`, AniList | Query string |
| Search (API) | `/api/search` | — | AniList + provider fallbacks | — |
| Anime detail | `/anime/[id]` | detail page, `DetailAI`, `AddToWatchlist`, `AnimeNotes`, `AncestryGraph` | AniList detail, relations API | Watchlist, notes, memory views |
| Watchlist | `/watchlist` | `WatchlistClient`, toolbar | Local storage + optional MAL import | `watchlist-storage` |
| Airing | `/airing` | page | AniList schedule | — |
| Seasonal | `/seasonal` | page | AniList seasonal | — |
| Mood board | `/mood/[slug]` | page | `lib/moods` | — |
| Daily | `/daily` | page | `daily-seed`, challenge pool | Streak local |
| Taste | `/taste` | `TasteClient`, `TasteExtras` | Watchlist-derived + DNA | local + DNA codes |
| Account | `/account` | `AccountClient` | MAL/AniList user hooks | tokens / local |
| Tools hub | `/tools` | tools index | `lib/tools` | — |
| Oracle / Night Desk | `/tools/oracle` | `OracleClient` | AI chat, oracle modes | `ai-settings` |
| Radar | `/tools/radar` | `RadarClient` | Discover APIs | — |
| Stats | `/tools/stats` | `StatsClient` | Watchlist → `lib/stats` | Watchlist |
| Challenge | `/tools/challenge` | `ChallengeClient` | `/api/challenge-pool` | Progress local |
| Fan zone | `/tools/fanzone` | `FanzoneClient` | Bingo local; confessions Supabase/local | bingo LS; confessions SB |
| Confessions API | `/api/confessions` | — | Supabase `confessions` | Supabase |
| Compare | `/tools/compare` | `CompareClient` | Taste DNA | — |
| Fusion | `/tools/fusion` | `FusionClient` | AI + anime pickers | — |
| Sauce | `/tools/sauce` | `SauceClient` | `/api/sauce` (trace.moe-style) | — |
| Motion Room | `/tools/motion` | `MotionClient` | Motion provider | Preferences |
| Completionist | `/tools/completionist` | `CompletionistClient` | Relations graph | — |
| Dislike | `/tools/dislike` | `DislikeClient` | Feedback local | local |

---

## Cross-cutting systems

### Watchlist
- **Components:** `WatchlistProvider`, `WatchlistClient`, `AddToWatchlist`, `WatchlistToolbar`
- **Lib:** `watchlist-storage.ts`, `watchlist-io.ts`
- **Persistence:** `localStorage`
- **Critical:** add / remove / status; survives reload; MAL import via `/api/mal-list`

### Lantern Memory (v0)
- **Lib:** `lib/lantern-memory.ts`
- **Boot:** `LanternMemoryBoot`, mascot `MemoryBoot`
- **Stores:** recent views, completed log, genre/studio counts, visit days, session opens
- **Key:** `anime_nexus_lantern_memory_v1`
- **Gap vs plan:** no event bus, no confidence/decay, no rec feedback lifecycle yet (Sprint 1–2)

### AI
- **Components:** `AIPanel`, `DetailAI`
- **Lib:** `ai-settings.ts`, `ai-chat.ts`
- **Persistence:** provider/key in local settings
- **Critical:** must not fabricate tool results; Oracle modes must stay real when configured

### Oracle / Night Desk
- **Route:** `/tools/oracle`
- **Lib:** `oracle.ts`, `oracle-cloud.ts`
- **Modes:** preserve Tonight / What-If / Character / Taste Mirror / Marathon (verify in `OracleClient`)
- **Depends on:** AI configuration

### Theme & motion
- **ThemeProvider**, `lib/theme.ts`
- **MotionProvider**, reduced-motion paths in mascot `a11y.ts`
- **Sakura:** `SakuraCanvas.tsx` still present — scheduled removal in Sprint 35 (not now)

### Toasts / Seal / Confetti / Loading
- `ToastProvider`, `SealMoment`, `ConfettiBurst`, `LoadingTheater`
- Seal must only fire on successful watchlist mutations

### Command palette & session tools
- `CommandPalette`, `SessionTools`, `SessionProvider`, `lib/session-storage.ts`

### Environment
- `EnvironmentController`, `RouteTune`, mascot `living-world` / seasonal
- Not yet a unified `NexusEnvironment` (Sprint 6)

---

## Mascot / Lantern (3D)

| Piece | Location | Role |
|-------|----------|------|
| Host | `MascotHost`, `LiveTerrain` | Canvas + drag/pet |
| Actor | `Actor.tsx` | Pure executor; scale ~0.38 |
| Mesh | `LanternKoMeshV2`, GLB fallback | Procedural + GLTF |
| Brain | `lib/mascot/director`, `decision`, `behaviour` | Intention |
| Motion | `anim-layers`, `anim-machine`, `procedural-motion` | Loco + social + expression |
| Events | `builtin-events.ts`, `ui-events` | DOM custom events |
| Debug | `installMascotDebugGlobal`, debug panel | Dev only |
| Runtime | `runtime.ts`, climb, world-coords | Authoritative pose |

**Constraints:** orthographic R3F; viewport clamp; reduced-motion; no auto-climb on scroll.

---

## External APIs

| Provider | Usage |
|----------|--------|
| AniList GraphQL | Primary anime data |
| Kitsu / Shikimori | Fallbacks when AniList fails |
| Jikan / MAL | User list, themes |
| Supabase | Fan zone confessions |
| User AI keys | Oracle / AI panel (client-configured) |
| Sauce API | `/api/sauce` |

---

## Persistence map

| Key / store | Feature |
|-------------|---------|
| Watchlist LS | Personal list |
| `lantern_memory_v1` | Host memory |
| Theme LS | Theme |
| AI settings LS | Provider config |
| Bingo LS | Fan zone |
| Confessions LS | Fallback only |
| Supabase `confessions` | Shared confessions |
| Streak / daily | Daily ritual |
| Session storage | Session tools |
| Mascot store (Zustand) | Live companion state |

---

## Sprint 0.2 — Manual regression checklist

Before Sprint 1 code:

- [ ] Search returns results
- [ ] Anime detail loads poster + metadata
- [ ] Add to watchlist / remove / reload persists
- [ ] Theme toggle
- [ ] AI panel opens; respects unconfigured state
- [ ] Oracle modes run when AI configured
- [ ] Confessions list + post (local or Supabase)
- [ ] Radar / Taste / Challenge / Compare / Fusion / Sauce
- [ ] Motion Room
- [ ] Command Palette
- [ ] Mascot visible, drag/pet, reduced-motion hide path
- [ ] Mobile: nav usable, mascot not covering primary CTA

---

## Sprint 0.3 — Performance notes (manual)

Record when convenient (DevTools):

- Home LCP / CLS
- Browse interaction latency
- Mascot Canvas FPS idle vs drag
- Route JS weight for `/tools/oracle` and `/`

Budget rule for later sprints: new visuals must not regress mobile usability or force 3D on low-power paths without tiering.

---

## Explicit non-goals (global plan)

- No full rewrite
- No mock AniList / fake AI success
- No Sakura expansion (removal later)
- No PWA expansion in this programme
- Do not start UI polish before Events → Memory → Taste → Recs → Lantern Brain → Environment

---

## Next

**Sprint 1 — Behaviour Event Architecture**

1. `NexusEvent` vocabulary  
2. `NexusEventBus` + subscribers stubs  
3. Wire high-value emitters (view, add, remove, search, tool open) without changing UI behaviour  
