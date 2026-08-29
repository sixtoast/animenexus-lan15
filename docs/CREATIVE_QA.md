# Creative Technology QA (Sprint 10)

Manual / regression checklist after creative sprints 0–10.

## Non-negotiables

- [ ] Navigation works with View Transitions **disabled** (no API / reduced motion)
- [ ] No Rive / animation required to complete a task
- [ ] Success never shown before real async confirmation
- [ ] Empty illustrations only on true empty UIs
- [ ] Loading theatre only after real `loadingStart` (no flash on fast responses)

## Capability tiers

| Tier | Expect |
|------|--------|
| FULL | Rive + rich VT + motion |
| BALANCED | VT + lighter Rive |
| MINIMAL | CSS only — SignalBars, outcome glyphs, empty glyphs |

Force via devtools: set `document.documentElement.dataset.creativeTier = 'MINIMAL'`.

## View transitions

- [ ] Browse card → detail: cover morph (`cover-{id}`) when API available
- [ ] Watchlist row → detail: same shared name
- [ ] Root crossfade does not double with RoomEnter
- [ ] `prefers-reduced-motion` / `data-reduce-motion`: instant update, no mid-state lock

## Instruments

- [ ] Radar: phases track fetch; CSS fallback if no `.riv`
- [ ] Oracle: mode tabs stay real controls; instrument is presentation
- [ ] Buttons with `riveKey`: loading / success / error from real state

## Feedback

- [ ] Toast `tone: "success"` only after confirm
- [ ] `SignalError` appears only on failure
- [ ] `OutcomeMark` is decorative (`aria-hidden`)

## Empty / loading

- [ ] Empty shelf / search show `SignalEmpty` + illustration fallback
- [ ] LoadingTheater phase text remains readable without Rive

## Performance budget (soft)

- [ ] No continuous Rive on every route when off-screen (NexusRive pauses)
- [ ] Missing `.riv` files do not throw or block build

## Ship

If all non-negotiables pass, creative layer is safe progressive enhancement.
