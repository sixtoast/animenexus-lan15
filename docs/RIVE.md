# Rive infrastructure (Creative Tech Sprint 2)

## Package

`@rive-app/react-canvas` — Canvas2D runtime (better for multiple small instances than WebGL2).

## Components

| File | Role |
|------|------|
| `components/rive/NexusRive.tsx` | Host: creative gate, RM, intersection lazy load, Suspense, error boundary, pause off-tab, cleanup |
| `components/rive/RiveFallback.tsx` | Static presentation |
| `components/rive/RiveStateBridge.ts` | Shared SM vocabulary + `applyRiveState` / `stateFromAsync` |

## Gates

Rive runs only when:

1. `creativeAllowsRive()` (FULL or BALANCED + WebGL capability path)
2. Not `prefersReducedMotion()`
3. In view (unless `priority`)
4. Document visible

Otherwise **RiveFallback** is shown. Product controls remain native HTML.

## Assets

Place `.riv` files under e.g. `public/rive/`. No production instruments ship until Sprint 4+ experiments with real artboards.

## State convention (Sprint 3 preview)

`idle · hover · pressed · loading · success · error · disabled · attention · complete`

App state → Rive inputs. Never fake success before the API confirms.

## CSS

`app/rive.css` imported from layout.
