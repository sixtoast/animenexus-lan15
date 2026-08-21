# Micro-Interaction, Sound & API Enrichment — status

| Sprint | Name | Status |
|--------|------|--------|
| **0** | Interaction language | **Done** |
| 1 | Sound Engine (real assets) | Next |
| 2–10 | Button → Oracle micro-theatre | Queued |
| 11–19 | Radar → QA tooling | Queued |
| 20–29 | API enrichment → final mix | Queued |

## Sprint 0

- `lib/interaction-language.ts` — semantic states, timing bands, amplitude caps
- `app/micro-interactions.css` — `--ix-fast|standard|deliberate`, easings, utility classes
- Reduced-motion collapses all ix tokens
- Legacy `--dur-fast` aligned to `--ix-fast`
- No full-site rewrite; migrate components gradually
