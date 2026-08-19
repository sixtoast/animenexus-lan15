# AnimeNexus — end-to-end QA checklist

Use a browser with localStorage (or two profiles: **cold shelf** vs **warm shelf** ≥2 sealed titles).

## Cold shelf (0–1 titles)

| Surface | Expect |
|---------|--------|
| Home “For you” | Hidden or empty |
| Daily / Tonight | Seed / default order, not resonance-heavy |
| Browse shelf blend | Control hidden or no-op |
| Mood / Seasonal | Catalog order |
| Challenge | No “shelf-tuned” |
| Fusion children | API order |
| Radar scan | Catalog order |
| Compare | No “Your shelf” row |
| Stats | No resonance bars |
| Agent | Honest empty / seed guidance |

## Warm shelf (≥2 sealed, mixed genres)

| Surface | Expect |
|---------|--------|
| Home For you | Soft-ranked rail + shown lifecycle |
| Daily | Ranked pool + stable daily pick |
| Tonight | Rebuild on open; engagement + resonance |
| Browse | Shelf blend toggle; `aria-pressed` |
| Mood / Seasonal / Airing | “Ordered for your shelf…” `aria-live` |
| Detail related | Official first; shelf titles sink in RECOMMENDED |
| Completionist | Watching / planning soft ranks |
| Challenge | “shelf-tuned”; familiar bias, still random |
| Fusion | Children soft-ranked |
| Compare | Strong / Soft / Exploratory labels |
| Radar | Soft-ranked upcoming; optional genre hint |
| Stats | Resonance dimensions + portrait line |
| Oracle | Local picks from shelf; cloud optional |
| Agent “finish next” | Uses completion queue, real titles |
| Agent recommend | Confidence + reasons, no fake % |

## Mascot / a11y

| Check | Expect |
|-------|--------|
| Accept daily / rec | Celebrate anim (unless reduced motion) |
| Reduced motion OS | No celebrate/think requestAnim; companion may pause |
| Shelf notes | Polite live regions where added |

## Build

```bash
npm run build
```

Must complete without TypeScript errors.

## Regression notes

- Never invent precision scores (93.271%).
- List + rejected ids stay excluded from discovery ranks.
- Watchlist mutations via agent require UI confirmation.
