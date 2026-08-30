# Audio QA matrix (Creative Sprint 50)

## Device / environment

| Condition | Expectation |
|-----------|-------------|
| iPhone / Android speaker | Clear, no harsh peaks |
| Laptop speaker | Same |
| Headphones | No extreme stereo imbalance (spatial pan moderate) |
| Device muted / OS mute | No crash; engine stays quiet |
| Autoplay restricted | No sound until first gesture (`unlockSound`) |
| Rapid clicks | Cooldown + `MAX_CONCURRENT` — no cacophony |
| Background tab | Page visibility pauses creative animation; SFX should not stack |
| Low volume prefs | Category gains respect user settings |
| Screen reader + SFX | Toasts remain `aria-live`; SFX optional |

## Engine guarantees (`lib/sound-engine.ts`)

1. **Opt-in** — `prefs.enabled` and unlock after gesture.
2. **No thrown AudioContext errors** to UI — failures `catch` and return.
3. **Cooldown** per cue — rapid actions dedupe.
4. **Voice cap** — concurrent sources limited.
5. **Missing WAV** — soft fail (no buffer → no play).

## Manual checklist

- [ ] First visit: no sound until click/key
- [ ] Enable sound in settings → `ui_tap` works
- [ ] Spam Radar scan → pings spaced, not a wall of noise
- [ ] Mute → silent, UI still works
- [ ] Complete title → complete cue once, not on every micro save
- [ ] Background tab → no runaway audio

## Related

- `docs/SONIC_COHESION.md`, `docs/SFX_MASTERING.md`, `docs/SONIC_MICRO.md`
