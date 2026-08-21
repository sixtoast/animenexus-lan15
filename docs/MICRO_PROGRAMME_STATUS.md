# Micro-Interaction, Sound & API Enrichment — status

| Sprint | Name | Status |
|--------|------|--------|
| 0 | Interaction language | Done |
| **1** | Sound Engine (real assets) | **Done** |
| 2 | Physical Button | Next |
| 3–10 | Cards → Oracle | Queued |
| 11–29 | Radar → APIs | Queued |

## Sprint 1

- `lib/sound-manifest.ts` — semantic cues + categories + prefs
- `lib/sound-engine.ts` — Web Audio graph, sample buffers, cooldowns, concurrency
- `SoundProvider` — first-gesture unlock; **opt-in** (default muted)
- `SoundSettings` on Account (master + UI + tools)
- `scripts/generate-ui-sfx.mjs` — offline original WAVs → `public/audio/ui/`
- Mascot `lib/mascot/audio.ts` left as procedural fallback only

### Local setup

```bash
node scripts/generate-ui-sfx.mjs
```

Commit generated WAVs when ready. Engine stays silent if files missing / sound off.
