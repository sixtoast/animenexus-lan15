# Sprint 8 — Polish & remaining wiring

## Done in repo

- [x] `lib/mascot/debug-snapshot.ts` — `mascotDebugSnapshot()` / `window.__mascotDebug()`
- [x] `lib/mascot/architecture.ts` — module map
- [x] Expression pipeline (Sprint 7)
- [x] Climb on page-world (Sprint 6)
- [x] Runtime pose (Sprint 5)
- [x] Actor pure executor (Sprint 4)

## Manual one-line patches (if not already applied)

GitHub file-read was intermittently 403; apply these if still missing:

### 1. Actor expression

```ts
import { faceForActor } from "./expression-bridge";

// replace expressionFromAnim(...) with:
const expression = faceForActor(anim, emotions, layers.social !== "none");
```

### 2. LiveTerrain / MascotHost — install debug global (dev only)

```ts
import { installMascotDebugGlobal } from "@/lib/mascot/debug-snapshot";

useEffect(() => {
  if (process.env.NODE_ENV === "development") installMascotDebugGlobal();
}, []);
```

Then in browser console: `__mascotDebug()`

### 3. Optional — re-export ExpressionKey from expression.ts

If older imports break, add to `lib/mascot/expression.ts`:

```ts
export {
  resolveExpression,
  expressionFromAnim,
  expressionFromEmotions,
  type ExpressionKey,
} from "./expression-pipeline";
```

## QA checklist

1. Mascot stays on home pad when Director is quiet
2. UI hover / notice sets target → Actor leaves home toward a card
3. Climb only on climbable on-screen surfaces
4. Drag still works; snaps viewport-safe
5. `__mascotDebug()` shows matching runtime.phase and intention
6. Production build: no TypeScript errors on ExpressionKey / NavTarget y

## Known non-goals (later)

- Full GLB authoring / Meshy export
- Habitat desk scene removal
- Store.position as sole physics authority (runtime.ts is truth)
