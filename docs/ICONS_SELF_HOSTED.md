# Self-hosted icons (Creative Sprint 20)

## Policy

- **No Iconify public CDN** on the critical path (nav, settings, tools).
- Critical icons ship as local SVG in `lib/icons/svg.tsx`.
- `NexusIcon` prefers SVG; falls back to unicode glyph from the registry.
- Design may still *browse* Iconify offline — runtime does not.

## Custom-leaning marks (AnimeNexus)

| Name | Intent |
|------|--------|
| `seal` | Watchlist seal |
| `signal` | Broadcast / soft alert |
| `shelf` | Living shelf / watchlist |
| `oracle` | Night Desk |
| `radar` | Scan instrument |

Sprint 21 can refine stroke geometry into a fully proprietary family without changing call sites.

## API (unchanged)

```tsx
<NexusIcon name="seal" />
```
