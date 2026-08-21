# Interaction contract (Awwwards programme)

These invariants must hold for every sprint. Signature experiences are **enhancement**, not gates.

## Navigation & routes

1. Every primary nav route remains reachable without WebGL, View Transitions, or sound.
2. Browser **Back / Forward** behave normally; no hijacking history for theatrical sequences.
3. Deep links (`/anime/[id]`, `/tools/oracle`, `/journey`, …) load useful content without prior in-app state.
4. Mobile **Frequency** menu: open/close, scrim, **Escape**, body scroll lock — preserved.

## Catalogue & objects

5. Browsing, filtering, and opening anime detail work with WebGL disabled / failed.
6. Poster identity uses progressive enhancement (`cover-${id}` View Transitions); unsupported browsers get instant navigation.
7. **AnimeImage** always shows a fallback when the network image fails.

## Watchlist / Shelf

8. Watchlist **manage** mode always available: status, progress, rating, notes, remove.
9. Seal only reports success after a successful local write.
10. Future Living Shelf mode is optional; user can return to conventional list at any time.
11. Watchlist editing is never locked behind 3D readiness.

## Motion & focus

12. `prefers-reduced-motion` and the in-app motion toggle strip non-essential animation; **information remains**.
13. Cinematography (when added) must not dim text below readable contrast or block pointer/keyboard input.
14. Loading / first-visit sequences are **skippable** and never longer than necessary under reduced motion.

## Keyboard & a11y

15. Skip link reaches main content.
16. Primary actions are keyboard operable (nav, seal, tools, modals).
17. **Escape** closes immersive overlays, mobile nav, and modal-like sheets.
18. Focus-visible styles remain visible; do not rely on colour alone for state.
19. Screen-reader text must not depend on blur, depth, or lantern position.

## Sound

20. Sound is **opt-in**; default muted; no autoplay music.
21. No sound storms on rapid hover; respect mute persistence.

## Lantern (mascot)

22. Site remains fully usable if the companion errors or is hidden.
23. Lantern does not cover primary controls or trap focus.
24. Reactions use cooldowns; no constant centre-screen interruption.

## Data honesty

25. Resonance / insights are model-derived heuristics — never framed as objective emotional truth.
26. Demo / showcase data must be labelled; never silently written into the user’s shelf or memory.
27. Confessions, Oracle AI modes, and AniList remain real — no mock-only replacements.

## Regression checklist (every sprint)

- [ ] `npm run build` succeeds
- [ ] Typecheck clean
- [ ] Mobile nav + one seal path
- [ ] Reduced motion: no critical content hidden
- [ ] No console error loops on Home → Browse → Detail → Watchlist
