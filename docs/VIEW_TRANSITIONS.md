# View Transitions (Creative Sprint 10)

## Contract

- Progressive enhancement only — clicks always navigate
- Shared element: `cover-{animeId}` on card, shelf, detail
- Reduced motion / no API → immediate `update()`, no lock

## Helpers (`lib/view-transition.ts`)

| Fn | Role |
|----|------|
| `canViewTransition()` | API + motion gate |
| `withViewTransition(fn)` | Wrap navigation; marks `room-enter-vt` |
| `getAnimeViewTransitionName(id)` | `cover-{id}` |

## CSS

`app/view-transitions.css` — root crossfade + cover morph.  
`html[data-creative-tier="MINIMAL"]` shortens root fade.

## RoomEnter

Skips CSS enter animation when VT is active to avoid double motion.
