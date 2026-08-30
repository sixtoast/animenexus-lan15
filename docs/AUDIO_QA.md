# Audio QA matrix (Creative Sprint 50)

## Devices / conditions

| Scenario | Expected |
|----------|----------|
| iPhone / Android speaker | Clear, no harsh clipping |
| Laptop speaker | Same at mid volume |
| Headphones | No harsh peaks; stereo shelf pan sane |
| Device muted / master 0 | Silent, no errors |
| Autoplay blocked | No throw; unlock after first gesture |
| Rapid clicks | Cooldown + max concurrent (5) |
| Background tab | Prefer silence / no new cues |
| Low master volume | Linear duck, still intelligible |
| Screen reader + SFX | UI still operable; sound optional |

## Engine guards (already)

- `unlocked` gate until user gesture
- `prefs.enabled` / category gains
- Cue cooldowns
- `MAX_CONCURRENT = 5`
- `try/catch` on `src.start()`
- Soft duck under celebration

## Manual checklist

1. Load site muted → enable sound in settings → tap UI.
2. Spam Radar scan → no cacophony.
3. Switch tab mid-shelf SFX → no console AudioContext spam.
4. Reduced motion / MINIMAL → still no hard failures.

## Related

- `lib/sound-engine.ts`, `docs/SFX_MASTERING.md`, `docs/SONIC_COHESION.md`
