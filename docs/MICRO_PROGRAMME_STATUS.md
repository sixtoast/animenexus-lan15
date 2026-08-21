# Micro-Interaction, Sound & API Enrichment — status

| Sprint | Name | Status |
|--------|------|--------|
| 0–1 | Interaction language + Sound Engine | Done |
| **2** | Physical Button | **Done** |
| 3 | AnimeCard micro | Next |
| 4–10 | Nav → Oracle | Queued |

## Sprint 2

- Shared `Button`: press 1px / scale ~0.985, soft settle
- Accent: restrained hover + optional highlight sweep
- Danger: no playful motion; no `ui_tap`
- `silent` prop for seal/error/radar owners
- `success` prop → brief pulse
- Loading keeps min-width so label doesn’t jump
- `ui_tap` only on confirmed click when sound enabled
