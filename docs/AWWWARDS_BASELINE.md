# Awwwards programme — product baseline (Sprint 0)

Captured from the live repo on `main` before Cinematography / Living Shelf / Memory Room work.

## Stack

- Next.js **15.5.7** (App Router), React **19**, TypeScript
- Three.js + `@react-three/fiber` + `@react-three/drei` (mascot only today)
- Zustand (mascot store)
- Supabase client (Fan Zone confessions)
- AniList GraphQL (+ fallbacks)

## Route map

| Path | Role |
|------|------|
| `/` | Home — ritual, dashboard, trending grid |
| `/browse` | Catalogue filters + grid |
| `/anime/[id]` | Detail — seal, synopsis, related, AI, themes |
| `/watchlist` | Shelf management (list UI) |
| `/seasonal` | Seasonal catalogue |
| `/daily` | Daily signal |
| `/mood/[slug]` | Mood-mapped feeds |
| `/taste` | Taste / resonance story |
| `/journey` | Timeline + shared insights |
| `/account` | Account |
| `/airing` | Airing |
| `/tools` | Desk hub |
| `/tools/oracle` | Oracle (real modes / AI) |
| `/tools/radar` | Radar |
| `/tools/challenge` | Challenge |
| `/tools/compare` | Compare |
| `/tools/fusion` | Fusion |
| `/tools/completionist` | Completionist |
| `/tools/sauce` | Sauce |
| `/tools/motion` | Motion |
| `/tools/stats` | Stats |
| `/tools/fanzone` | Confessions |
| `/tools/dislike` | Dislike tooling |
| `/api/*` | Server routes (AniList, AI, etc.) |

**Not present yet:** `/showcase`, Living Shelf mode, Memory Room spatial mode, Cinematography Director.

## Global providers (`app/layout.tsx`)

Order (outer → inner):

1. `ThemeProvider`
2. `MotionProvider` (full / reduced / system)
3. `ToastProvider`
4. `WatchlistProvider`
5. `SessionProvider`

Always-on hosts:

- `SkipToContent` → `#main-content`
- `LanternMemoryBoot`, `NexusRouteBeacon`, `EnvironmentController`
- `Navbar`, `RoomEnter` shell
- `MascotHost` (error-bounded)
- `AIPanel`, `CommandPalette`, `SessionTools`
- `SealMomentHost`, `FirstVisitHost`, `LoadingTheater`, `ConfettiHost`, `ShortcutsHelp`

Sakura is forced **off** in the boot script (`data-sakura="off"`). Legacy files may still exist — remove in programme Sprint 23, not rebuild around them.

## Watchlist state model

`WatchlistEntry` (`lib/types.ts`):

- `id`, `title`, `image`, optional catalog fields
- `watchStatus`: watching | planning | completed | paused | dropped
- `progress`, `userRating`, `notes`, `genres?`
- `addedAt`, `updatedAt`

Persisted **on-device** via `WatchlistProvider` (localStorage). Seal only succeeds on successful write.

## Journey model

`lib/journey.ts`:

- `buildJourney(entries, memory)` → meaningful events only (first light, seal, completion, genre signal, rec learning, visits, tools, taste chapters, resonance note)
- `journeyInsights` → shared `buildLanternInsights`
- UI: `/journey` with Timeline + Insights (list, not spatial)

## Resonance model

`lib/resonance.ts`:

- 16 dimensions (wonder, comfort, intensity, … worldBuilding)
- Heuristic genre → dimension priors (explicitly not objective emotion)
- `userResonance(entries)`, `cosineSimilarity`, ranking via recommend modules

## Environment model

`lib/nexus-environment.ts` + `EnvironmentController`:

- Answers **feel** (time of day, route kind, intensity, accent, motion, lantern mood)
- Writes `html` dataset: `tod`, `nxRoute`, `nxIntensity`, `nxAccent`, `nxMotion`, `nxLantern`, `nxAnime`
- Does **not** direct focus/composition (that is Cinematography — Sprint 1)

## Mascot / events

- Event vocabulary: `lib/nexus/events.ts` + bus
- Attention bridge: `lib/mascot/nexus-attention-bridge.ts` (cooldowns, reduced-motion aware)
- Store: Zustand `lib/mascot/store.ts`
- Live terrain actor: R3F in `components/mascot/*`
- Enhancement only — site works if mascot fails (`MascotErrorBoundary`)

## View Transitions

- Helper: `lib/view-transition.ts` → `withViewTransition`
- Cards use `viewTransitionName = cover-${id}` via `AnimeImage`
- Progressive enhancement; skipped under reduced motion / missing API

## Mobile

- Sticky nav + Frequency sheet (`Navbar`)
- Escape closes menu; body scroll lock while open
- `mobile.css`: safe areas, ≥44px targets, sticky seal CTAs, 2-col grid
- Viewport: `viewportFit: "cover"`

## Reduced motion

- `MotionProvider` + nav `MotionToggle`
- `html[data-reduce-motion="true"]` global kill-switch (`a11y.css` + `motion.css`)
- Boot script reads localStorage + OS preference

## Creative metaphor (not yet UI)

Programme metaphor for later sprints (always pair with functional name):

| Function | Poetic |
|----------|--------|
| Browse | Catalogue |
| Watchlist | Shelf |
| Journey | Archive |
| Taste | Mirror |
| Oracle | Radio |
| Radar | Instrument |
| Tools | Desk |
| Lantern | Host |
