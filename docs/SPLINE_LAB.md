# Spline prototype lab (Creative Sprint 32)

## Goal

Use **Spline** only as a rapid spatial sketch tool — not as a parallel production renderer.

## Allowed experiments

- Living Shelf layout concepts
- Awwwards showcase scene composition
- Tool-stage spatial ideas
- 3D archive / desk arrangements

## Hard rules

| Rule |
|------|
| Do **not** embed every prototype in production |
| Do **not** replace R3F Lantern / Living Shelf with Spline runtime |
| Prototypes answer: *Is this composition worth rebuilding properly?* |
| If **yes** → implement critical path in existing **R3F** architecture |
| Selective Spline embed only if isolated scene is performant, maintainable, and soft-fails without WebGL |

## Workflow

```
Sketch in Spline (desktop app / editor)
        ↓
Export stills / short capture for design review
        ↓
Decision gate (worth rebuilding?)
        ↓
  NO → archive reference, no code
  YES → port to R3F (Shelf / stage / lantern) under creative tier + reduced motion
```

## Production stack (unchanged)

| Surface | Technology |
|---------|------------|
| Lantern-ko | R3F + procedural motion |
| Living Shelf | R3F (`components/living-shelf`) |
| Instruments | Rive when stateful |
| Page motion | CSS + View Transitions |

Spline is **not** listed in `package.json` by default. Adding `@splinetool/react-spline` requires a separate RFC and soft-fail wrapper — out of scope for this sprint.

## Lab checklist (design)

1. [ ] Hypothesis written (what spatial question?)
2. [ ] Spline scene limited to one idea
3. [ ] Capture still or muted clip for review
4. [ ] Decision recorded in PR / issue
5. [ ] If shipping: R3F port + perf budget + reduced-motion path

## Related

- `docs/CREATIVE_TECH_AUDIT.md` — inventory before new 3D runtimes
- `docs/CREATIVE_RUNTIME.md` — device tier gating
