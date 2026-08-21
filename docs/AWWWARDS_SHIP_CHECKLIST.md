# Awwwards Signature Experience — ship checklist (Sprint 18)

Use this after `npm run build` on Vercel or local production. Tick in the PR or release notes.

## Build & deploy

- [ ] `npm run build` succeeds (types + lint)
- [ ] Production deploy green on Vercel
- [ ] No Sakura / removed feature regressions

## Core product (must not break)

| Surface | Check |
|---------|--------|
| Home | Trending loads or honest error; mood chips work |
| Browse | Search / filter; open detail |
| Detail | Seal / status; cover visible |
| Watchlist **Manage** | Add/remove, status, progress — **no WebGL required** |
| Watchlist **Shelf** | Opens; fallback if no WebGL / mobile budget |
| Tools / Oracle | Still responds |
| AniList data | Failures show SignalError paths, not blank |
| Confessions / Fan Zone | Supabase paths unchanged |
| Account | Session / local prefs |

## Signature systems

| System | Check |
|--------|--------|
| Cinematography | `data-cinema-focus` changes by route; no hover tree thrash |
| Living Shelf | Orbit bounded; compare resonance; Escape clears |
| Memory Room / Timeline | Both modes; mode persists |
| Lantern | Quiet on Journey; hide companion → site works |
| View Transitions | Card→detail morph when supported; instant nav when not |
| Loading theatre | Route copy; no fake %; short waits don’t flash |
| Diegetic nav | Frequency menu mobile; desktop labels clear |
| Model honesty | Taste / Journey / resonance disclosures visible |

## Accessibility

- [ ] Skip link focuses main
- [ ] Keyboard: Shelf arrows / C / Enter / Escape
- [ ] Reduced motion: no aggressive VT / orbit damping off
- [ ] Focus-visible rings present
- [ ] Screen-reader: live regions announce select/compare

## Mobile

- [ ] Frequency sheet ≥48px rows, safe-area
- [ ] Manage | Shelf toggles usable
- [ ] Forms don’t zoom (16px inputs)
- [ ] Mascot dock clear of home indicator

## Performance (spot)

- [ ] Tab hidden → mascot pauses / unmounts as designed
- [ ] ≤2 WebGL contexts (mascot + optional shelf)
- [ ] Large shelf: texture cap message, not crash

## Honesty

- [ ] No claim that resonance % is an AniList fact
- [ ] Insights dismissible and local-only
- [ ] Memory importance framed as desk history only

## Non-goals (do not reintroduce)

- Free-flight 3D camera
- Sakura mode
- Clippy-style constant Lantern speech
- Fake loading percentages
- Schema rewrite of watchlist for XYZ positions

---

**Programme status:** Sprints 0–18 implemented in repo. Measure real LCP/FPS in `AWWWARDS_PERFORMANCE_BASELINE.md` when hardware available.
