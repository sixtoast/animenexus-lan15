# AnimeNexus Preference Engine V2

Similarity is **one signal**, not the product.

## Architecture (shipped foundation)

```
USER BEHAVIOUR (implicit)
        │
        ▼
 Behaviour Store  ──►  Long-term clusters
                   ──►  Taste drift (hist / 90d / 30d)
                   ──►  Session intent
        │
        ▼
 Preference Engine  +  Viewing Intent (optional override)
        │
        ▼
 Ranker (clusters · resonance · intent · quality · fatigue · diversity)
        │
        ▼
 Recommendations + real reasons
```

## Modules

| File | Role |
|------|------|
| `lib/behaviour-events.ts` | Implicit events; exposure ≠ dislike |
| `lib/taste-clusters.ts` | Multi-interest identities |
| `lib/taste-drift.ts` | Trend detection with evidence thresholds |
| `lib/viewing-intent.ts` | 14-dim experience model + UI intents |
| `lib/preference-engine.ts` | Blend → candidate scores |
| `lib/recommend-rank.ts` | Public ranker API |
| `lib/moods.ts` | `/mood/*` routes map to Viewing Intent |
| `components/BehaviourTracker.tsx` | Card exposure / dwell |

## Viewing Intent (not “Mood = genre”)

UI chips ask *what kind of night*, e.g. Comfort me / Destroy me / Make me think.

They constrain ranking via intent fingerprints. Genre hints only help **candidate fetch**.

Legacy slugs (`chill`, `cry`, …) resolve via `LEGACY_MOOD_MAP`.

## Generations still to build

1. **V2 (this)** — implicit events, clusters, drift, Viewing Intent, blended ranker
2. **V3** — semantic anime embeddings + stronger diversity/novelty reranker
3. **V4** — collaborative filtering when enough multi-user data exists
4. **V5** — sequential / Transformer models when event volume justifies it

## Metrics to track later

Not CTR alone: open → watchlist → start → 25% → complete → rewatch.
