# Microinteraction density pass (Creative Sprint 34)

## Goal

Every intentional action should produce enough response to confirm it happened — without animating for its own sake.

## Hierarchy

1. **CSS** first (`app/micro-interactions.css`, button/card polish)
2. **Rive** only for stateful illustration
3. **dotLottie** for authored sequences
4. **R3F** for genuine spatial behaviour

## Coverage matrix

| Action | Response |
|--------|----------|
| Hover | Color / lift (amplitude capped) |
| Press | 1px depress + scale |
| Focus | Focus ring / shadow |
| Toggle / tab | Active border + subtle scale |
| Selection | `ix-select` scale / aria-selected |
| Loading | Spinner / phase label / soft pulse |
| Success | OutcomeMark + optional SFX |
| Failure | SignalError + optional SFX |
| Drag / drop | `ix-drag` elevation + over state |
| Navigation | nav_tick (opt-in audio) + link color |
| Expand / collapse | Height/opacity deliberate band |
| Copy / save | Brief pressed + toast when wired |
| Remove | Danger press + remove SFX |
| Complete | Seal / complete glint |
| Progress | Width transition |
| Filter / search | Input focus ring + chip active |

## Dead interaction checklist

When a control feels silent:

1. Add CSS state (`:active`, `:focus-visible`, `[aria-pressed]`) before JS.
2. Prefer semantic utilities: `.ix-press`, `.ix-hover`, `.ix-select`.
3. Wire `playCue` only for major outcomes (already opt-in).
4. Respect `data-reduce-motion`.

## Related

- `app/micro-interactions.css` — tokens + density rules
- `docs/INTERACTION_CONTRACT.md`
- `docs/SONIC_MICRO.md`
