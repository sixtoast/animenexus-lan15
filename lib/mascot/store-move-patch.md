# Store movement wiring (Sprint 4)

`Actor` no longer invents outings.

Brain paths that set `target` are followed by Actor:
- `applyGoal("wander")` → randomWanderTarget
- UI interact / notice / hover / go-to / climb
- `directive.goHome` should call `onGoHome()` from `brain-move.ts`

`setTarget` should call `onStoreTargetChanged` — applied in store next if not already.
