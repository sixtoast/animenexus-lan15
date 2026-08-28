# Rive button experiments (Sprint 4)

## Wired `riveKey` actions

| Key | Control | File |
|-----|---------|------|
| `oracle_ask` | Broadcast (cloud) | OracleClient |
| `radar_scan` | Scan horizon | RadarClient |
| `sauce_trace` | Trace URL | SauceClient |
| `challenge_submit` | Lock in / submit | ChallengeClient |
| `shelf_mode` | Watchlist Shelf tab | WatchlistPresentationToggle |
| `tonight_start` | Reserved | Tonight is auto-rank; no forced CTA |

## Behaviour

- Native `<button>` / `Button` remains the accessible control.
- Optional Rive leading via registry (`lib/rive-assets.ts`).
- Missing `.riv` → CSS spinner / dot fallback (NexusRive + creative gate).
- `loading` / `success` / `error` props drive state only from real async outcomes.

## Assets

Drop files under `public/rive/` as listed in `public/rive/README.md`.
