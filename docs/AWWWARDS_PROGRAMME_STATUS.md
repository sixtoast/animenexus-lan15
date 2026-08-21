# Awwwards Signature Experience — programme status

| Sprint | Name | Status |
|--------|------|--------|
| 0 | Baseline + contracts | Done |
| **1** | Cinematography Director | **Done** |
| 2 | Anime Material / Resonance visual | Next |
| 3 | Persistent anime object identity | Queued |
| 4–7 | Living Shelf | Queued |
| 8–9 | Memory Room | Queued |
| 10+ | Staging → final QA | Queued |

## Sprint 1 files

- `lib/cinematography.ts` — types, route focus, document apply
- `lib/cinematography-store.ts` — Zustand store + pulse/route
- `components/CinematographyController.tsx` — route + Nexus
- `app/cinematography.css` — vignette / focus treatments
- Root layout mounts controller (alongside EnvironmentController)

## Verify

- Inspect `html[data-cinema-focus]` while navigating Home → Detail → Watchlist → Oracle → Journey
- Seal triggers short `celebration` pulse
- Reduced motion zeroes motion weight / softens vignette
