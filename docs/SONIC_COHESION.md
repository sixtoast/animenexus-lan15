# Sonic cohesion (Creative Sprint 36)

## Goal

SFX share a **material identity** so users learn the language without reading labels.

## Material categories

| Material | Feel | Typical cues |
|----------|------|----------------|
| **Touch** | Quiet, dry, short | `ui_tap`, `filter_select`, `nav_tick` |
| **Signal** | Crisp, higher, informative | `radar_ping`, `signal_acquired`, `oracle_tune` |
| **Object** | Warmer, mid, physical | `seal`, `remove`, `shelf_settle`, `progress_*`, `resonance` |
| **Success** | Bright resolve — **not** for ordinary clicks | `success`, `challenge_ok` |
| **Warning** | Darker, lower | `error`, `challenge_bad` |
| **Ceremony** | Richer, longer | `complete`, `modal_open`/`close` as soft ceremony for panels |

Engine **gain buses** (`ui`, `navigation`, `object`, `tool`, `lantern`, `celebration`, `warning`) stay for mixing; material categories are the **design language**.

## Learned associations

| Heard | Means |
|-------|--------|
| Radar ping | Signal / scan |
| Soft wax / low dual tone (`seal`) | Collection / shelf object |
| Warm tonal resolution (`complete`) | Ceremony / finished |
| Quiet click | Touch only — **never** success |

## Hard rules

1. **Do not** play `success` / `complete` on ordinary button presses.
2. `ui_tap` stays Touch — extremely quiet (Sprint 23 mastering).
3. Major outcomes only: seal, complete, challenge, toast tones, sauce acquire/fail.
4. Hover / scroll / typing remain silent (Sprint 24).

## Cue → material map

See `lib/sonic-identity.ts`.

## Related

- `docs/SFX_MASTERING.md`, `docs/SONIC_MICRO.md`, `docs/AUDIO_ASSET_REGISTER.md`
