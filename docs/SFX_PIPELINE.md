# SFX pipeline (Creative Sprint 22)

## Intent

Finish sound as a **product-owned** system: known licence, known provenance, served only from AnimeNexus.

## Sources

| Source | Role |
|--------|------|
| `scripts/generate-ui-sfx.mjs` | **Primary** production UI cues |
| Freesound / Openverse | Discovery only — not runtime |
| Future recordings | Must pass licence check + register row |

## Do not

- Hotlink external sample hosts
- Ship files with unknown or “no licence stated” status
- Treat mascot procedural tones as substitutable for UI WAV without documenting them

## Register

See [AUDIO_ASSET_REGISTER.md](./AUDIO_ASSET_REGISTER.md).

## Next (Sprint 23)

Mastering pass: loudness, tails, category cohesion (UI / Object / Signal / Tool / Lantern / Celebration / Warning).
