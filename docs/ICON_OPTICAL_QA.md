# Icon optical QA (Creative Sprint 42)

## Sizes

| Token | Target | Use |
|-------|--------|-----|
| `sm` | **16px** | Dense UI, chips |
| `md` | **20px** | Default body / buttons |
| `lg` | **24px** | Nav emphasis, empty states |

Equal viewBox ≠ equal perceived size. Stroke weight and padding adjust per size.

## Corrections

- **Stroke** — slightly heavier optical weight at 16px (`vector-effect` / CSS stroke scale)
- **Vertical align** — `inline-flex` + `middle` in buttons
- **Centring** — `.btn .nx-icon` absolute optical centre
- **Nav** — mobile nav uses `md` minimum (not `sm`)

## Rules

1. Prefer `NexusIcon` over raw emoji/Iconify CDN.
2. Decorative icons: `decorative` (default).
3. Do not mix glyph and SVG in the same control row without matching sizes.

## Related

- `components/ui/NexusIcon.tsx`, `app/nexus-icon.css`
- `docs/ICON_AUDIT.md`
