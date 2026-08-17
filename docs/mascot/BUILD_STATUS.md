# Build status

Production TypeScript fixes on `main` (WorldPoint uses `y`, not `z`):

- `expression-pipeline.ts` — ExpressionKey aligned with mesh
- `MascotScene.tsx` — go-to uses `.y`
- `safety.ts` — habitat bounds use `.y`
- `rec-guide.ts` — runner types use `.y`
- `skits.ts` — `position.y`
- `home-habitat.ts` — local `{x,z}` spots
- `PlaceholderChibi.tsx` — store position `.y`
- `LiveTerrain.tsx` — `installMascotDebugGlobal()` in dev

Redeploy trigger: 2026-08-17
