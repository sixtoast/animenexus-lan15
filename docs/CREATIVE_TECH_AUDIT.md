# Creative Technology Audit — Sprint 0

**Repo:** `sixtoast/animenexus-lan15`  
**Date:** 2026-08-27  
**Rule:** Inventory before adding Rive / dotLottie / Cloudinary / Iconify / Mux / Spline.

---

## 1. Runtime dependencies (package.json)

| Package | Role today |
|---------|------------|
| `next` 15.5.7 | App framework |
| `react` / `react-dom` 19 | UI |
| `@react-three/fiber` + `@react-three/drei` + `three` | **Primary 3D** — Lantern, Living Shelf, Sakura, confetti |
| `zustand` | State (mascot, prefs) |
| `@supabase/supabase-js` | Confessions / optional push store |
| `web-push` | Server push send |

**Not present:** Rive, lottie/dotLottie, Iconify, Cloudinary SDK, GSAP, Mux, Spline, Font Awesome, Lucide.

**Implication:** Creative stack today is **CSS + View Transitions + R3F + Web Audio samples + a few inline SVG/emoji icons**. New libraries must be additive and gated.

---

## 2. Motion systems already in place

### 2.1 CSS animation layer

Heavy use of keyframes across:

- `app/motion.css` — exit, seal, celebrate, room enter, card rise, flame, skeleton, FAB, toast, overlay
- `app/micro-interactions.css` — reveal, success pulse, error tension, complete glint
- `app/signal-motion.css` — bar pulse, on-air, scan sweep, static fade, room-in
- Tool/theme CSS: radar, oracle, challenge, desk, mascot, load-choreography, seal-env, cinematography, etc.

| Trigger (examples) | Tech | Typical duration | Purpose | Cost | Reduced motion |
|--------------------|------|------------------|---------|------|----------------|
| Card hover / rise | CSS `cardRise` | ~200–400ms | Affordance | Low | Many rules under `@media (prefers-reduced-motion)` + `data-reduce-motion` |
| Seal moment | CSS `sealPop` + host | Deliberate | Collection ceremony | Low–med | Toggle / reduce attr |
| Radar scan chrome | CSS `nx-scan-sweep` | Loop while loading | Instrument feel | Low | Reduce media queries |
| Skeleton load | CSS `skelShimmer` | Loop | Loading | Low | Prefer static |
| Room / tool enter | CSS `roomEnter` | ~300–500ms | Choreography | Low | Skipped when reduced |

**Verdict:** **Keep** as everyday interaction layer. Do **not** replace with Rive/Lottie.

### 2.2 View Transitions

- `lib/view-transition.ts` — progressive enhancement; `prefersReducedMotion()`; shared name `cover-{animeId}`
- `app/view-transitions.css`
- Used on cards, detail cover, shelf, watchlist, room enter

| Trigger | Tech | Purpose | Cost | RM |
|---------|------|---------|------|----|
| Navigate card → detail | View Transitions API | Object continuity | Med (browser) | Immediate nav, no lock |

**Verdict:** **Keep** as route/object continuity. Rive must not own page transitions.

### 2.3 React Three Fiber

| Surface | Components | Purpose |
|---------|------------|---------|
| Lantern mascot | `MascotHost`, `Actor`, `LanternKoMeshV2`, `LiveTerrain`, `PageTerrainScene`, … | Persistent companion |
| Living Shelf | `ShelfScene`, `ShelfObjectMesh`, `LivingShelf` | Spatial shelf |
| Atmosphere | `SakuraCanvas`, `ConfettiBurst` | Optional particles |

**Verdict:** **Keep** as sole production 3D architecture. Spline = prototype only. **Do not** rebuild Lantern in Rive.

### 2.4 Cinematography / environment / materials

- `lib/cinematography-store.ts`, `CinematographyController`, `cinematography.css`
- `lib/nexus-environment.ts`, `EnvironmentController`
- `DetailCoverMaterial`, anime material paths
- Bridges: `cinematography-bridge`, `nexus-attention-bridge`

**Verdict:** **Keep**; future creative runtime should **read** these signals, not fork them.

### 2.5 Interaction language / motion prefs

- `components/MotionProvider.tsx`, `MotionToggle.tsx`
- `lib/interaction-language.ts`
- `document` attribute `data-reduce-motion`

**Verdict:** Foundation for Sprint 1 capability tiers (`FULL` / `BALANCED` / `MINIMAL`).

---

## 3. Sound architecture

| Piece | Role |
|-------|------|
| `lib/sound-engine.ts` | AudioContext graph, category gains, concurrent limit, throttle |
| `lib/sound-manifest.ts` | Cue IDs: ui_tap, seal, radar_ping, oracle_tune, challenge_*, shelf_settle, resonance, … |
| `components/SoundProvider.tsx` | App wiring |
| `lib/mascot/audio.ts` | Lantern-adjacent cues; RM aware |

**Primary path:** designed **AudioBuffer / file samples** under `/audio/ui` (with PCM fallback noted in manifest).  
**Not** primary oscillator-beep UI (mascot may still use synthetic for magical cues).

**Wiring present on:** Button, Modal, Navbar, Watchlist, Radar, Oracle, Challenge, SealMoment, LoadingTheater, Account, Browse, Sauce, My Services, AnimeNotes.

**Gaps for Creative plan Sprints 22–26:**

- No formal `docs/AUDIO_ASSET_REGISTER.md` yet
- Public `/audio` tree may be sparse vs full cue list
- Spatial shelf audio not fully productised
- Lantern foley still light / event-throttled incomplete vs plan

**Verdict:** Engine is the right home; **master + register assets**, don’t replace engine with a third-party SFX CDN at runtime.

---

## 4. Loading / empty / error / success

| Pattern | Implementation | Notes |
|---------|----------------|-------|
| Loading theater | `LoadingTheater` + CSS choreography | Global; tools call `loadingStart/Stop` |
| Seal success | `SealMoment` + sound + CSS | Watchlist, ritual, fanzone |
| Skeletons | CSS shimmer | Browse/list contexts |
| Tool empty states | Mostly text + emoji / simple markup | **Weak** vs plan (dotLottie empty scenes) |
| Errors | Tools-hint copy, soft-fail providers | Status page for APIs; little visual error language |
| Success hierarchy | Partial (seal vs micro) | Plan Sprint 47 not formalised |

**Verdict:** Loading/seal are strong. Empty/error/success hierarchy need authored visuals later — not generic spinners everywhere.

---

## 5. Buttons & controls

- `components/ui/Button.tsx` — semantic button + sound hooks
- `app/button.css` — hover/press/focus CSS
- High-value tools: Oracle, Radar, Sauce, Tonight, Challenge — **CSS + SFX**, not vector state machines

**Verdict:** Keep CSS buttons as default. Rive **only** for selected high-value instruments (plan Sprints 4–6), with native `<button>` underneath.

---

## 6. Icons & emoji

| Source | Findings |
|--------|----------|
| Font Awesome / Iconify / Lucide | **None** in dependencies or code search |
| Inline SVG | Sparse (e.g. ancestry); `public/icon.svg` PWA |
| Emoji as UI | **Tools hub** and similar use emoji as tool marks (🌙 📡 🕯️ 🎬 …) |
| Semantic icon component | **Missing** (`NexusIcon` is plan Sprint 19) |

**Verdict:** Icon language is inconsistent (emoji + text). Iconify + custom AnimeNexus set is justified; bundle critical icons, don’t depend on runtime CDN for nav.

---

## 7. Images & video

| Pattern | Status |
|---------|--------|
| `AnimeImage` / Next image patterns | Primary for posters |
| AniList/MAL CDN URLs | External catalog art — **do not** bulk-upload to Cloudinary without rights review |
| YouTube iframe trailers | Detail only |
| Sauce video links | External hit links |
| Motion tool `<video>` | Scaffold / local |
| Cloudinary | **Not integrated** |
| Mux | **Not integrated** — plan Sprint 28 gate: YouTube embeds → **Mux likely NO** |

**Verdict:** Cloudinary for **owned** media (session covers, site art, optional sauce temp). Catalog posters stay remote URLs + Next optimise where safe.

---

## 8. Tool-specific animation personality (today)

| Tool | Creative feel now |
|------|-------------------|
| Radar | CSS scan + loading theater + radar_ping SFX |
| Oracle | CSS/vibe CSS + oracle_tune + loading |
| Sauce | Loading theater + upload UI |
| Living Shelf | R3F + settle SFX + cinematography |
| Challenge | Micro CSS + ok/bad SFX |
| Stats / Taste | Mostly editorial / data |
| Fanzone | Seal on some actions |
| Status / Signals | Minimal motion (correct) |

Aligns with plan Sprint 48: differentiate tools without one effect soup.

---

## 9. Mobile & reduced motion

- `app/mobile.css`, `app/a11y.css`
- Widespread `prefers-reduced-motion` and `data-reduce-motion`
- Motion toggle user control
- Mascot/R3F paths should respect reduce (partial; needs continuous QA)

**Gaps:** Explicit alternate **static frames** for future Rive/Lottie (Sprint 39); low-end tier not centralised (Sprint 1 / 40).

---

## 10. Inventory summary — keep / replace / add

| Area | Decision |
|------|----------|
| CSS micro-interactions | **Keep** (primary) |
| View Transitions | **Keep** |
| R3F Lantern + Shelf | **Keep** (core) |
| Sound engine + cues | **Keep engine**; **fill assets** + register |
| Seal / Loading theater | **Keep**; refine hierarchy |
| Emoji tool icons | **Consolidate** → NexusIcon + custom set |
| Generic spinners | **Limit**; Rive loaders only when duration justifies |
| Rive | **Add** for stateful instruments only |
| dotLottie | **Add** for authored moments / empty states |
| Cloudinary | **Add** for owned media pipeline |
| Iconify | **Add** as build-time selection + local bundle |
| Mux | **Evaluate later** — default **skip** if only YouTube |
| Spline | **Prototype lab only** |

---

## 11. Performance / cost notes (qualitative)

| System | Cost |
|--------|------|
| Multiple R3F canvases | High if concurrent — already a risk with mascot + shelf + sakura |
| CSS animations | Low |
| View Transitions | Medium, one-shot |
| Sound decode/preload | Medium first unlock |
| Future Rive × N instances | Medium–high — must lazy + dispose |
| Future Lottie always-on | Medium — visibility pause required |

---

## 12. Sprint 0 → Sprint 1 handoff

1. Implement `lib/creative-runtime.ts` capability detection (WebGL, RM, DPR, concurrency, frame stability signals) → tiers `FULL` | `BALANCED` | `MINIMAL`.
2. Do **not** install Rive until runtime gates and fallbacks exist.
3. Preserve Button/CSS path as default.
4. Treat emoji tools hub as temporary until Iconify pass.

---

## 13. Explicit non-goals confirmed by audit

- No Rive rebuild of Lantern mesh
- No Spline as production Shelf/Lantern host
- No Lottie for every button state
- No Cloudinary of all AniList posters by default
- No Mux solely for YouTube trailers
