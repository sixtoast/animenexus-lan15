# Micro-Interaction & Sound — ship checklist (Sprint 19)

Complete before treating the micro/sound programme as closed. API enrichment is separate (Sprint 20+).

## Assets

- [ ] Run `node scripts/generate-ui-sfx.mjs`
- [ ] Commit `public/audio/ui/*.wav` if not already present
- [ ] Account → Sound → Enable → preview Tap / Seal / Complete audible

## Interaction language

- [ ] Buttons press 1px + scale (not only color change)
- [ ] Reduced motion (`data-reduce-motion` or system) kills lifts/seals/deals
- [ ] No hover SFX on cards or nav links

## Walkthrough (sound on)

| Path | Expect |
|------|--------|
| Browse search / filter | `filter_select`; count eases |
| Open detail | Cover settle; tags react |
| Seal title | Full Seal Moment + `seal` |
| Rapid seals | Mini seal within 2.8s |
| Watchlist progress | Bar eases; progress cues |
| Remove | Out animation + `remove` |
| Oracle mode switch | Needle + `oracle_tune` |
| Oracle broadcast | Frequency lock; success/error |
| Radar scan | Sweep + limited pings |
| Challenge correct | Medal + `complete`; confetti ≥3 streak |
| Account sync | Progress bar; success/error |
| Modal (AI panel) | `modal_open` / `modal_close` |

## Honesty

- [ ] Sound remains **opt-in** (default off)
- [ ] No oscillator path described as “real SFX” in UI copy
- [ ] Loading theatre has no fake %

## Mobile

- [ ] Feed tabs scroll; controls ≥40px
- [ ] Forms 16px (no iOS zoom)

## Build

- [ ] `npm run build` green
- [ ] Vercel deploy green

---

**Status:** Micro programme Sprints **0–19** implemented. Next track: **API enrichment (20+)** per plan.
