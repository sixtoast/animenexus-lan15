# Client boundary rules (Sprint 32)

## Principle
Keep interactive islands small. Pure presentation stays on the server.

## Prefer server components for
- Static layout, hero copy, section heads
- Catalog grids that only compose client cards (`AnimeGrid`)
- Mood chips when `active` is passed from the route
- Decorative chips (`OnAir`)
- Detail page structure (covers via `AnimeImage` island)

## Keep client for
| Island | Why |
|--------|-----|
| `AnimeCard` / `AnimeImage` | Watchlist state, hover events, view transitions |
| `WatchlistProvider` + seal controls | localStorage + mutations |
| `Navbar` | Mobile menu, theme |
| `HeroGreeting` / `RitualLine` / `HomeDashboard` | Memory + shelf |
| `QuoteBanner` | Fetch cycle + clipboard |
| `ViewModeToggle` | localStorage view mode |
| Mascot host / LiveTerrain | R3F + store |
| Tools (Oracle, Radar, …) | Forms, AI, ranking |
| `SignalError` | Retry + Lantern concern |

## Rules of thumb
1. Do **not** add `"use client"` only to read `usePathname` — pass `active` from the page.
2. Fetch catalog data in **Server Components / route handlers**, not in every card.
3. Event bus + memory stay client-side; do not block first paint on them.
4. Prefer props-down over context for one-off UI state.

## Regression check
After moving a file to server:
- `npm run build` must stay green
- Page still hydrates interactive children
- No `window` / `localStorage` at module top level in server files
