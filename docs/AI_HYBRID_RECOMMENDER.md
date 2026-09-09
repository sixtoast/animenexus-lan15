# Hybrid AI + Deterministic V3 recommender

AI is a **semantic reasoning layer**, not the recommender.

## Pipeline

```
User intent (preset OR free-text)
        ↓
AI interpret_viewing_intent()  → StructuredViewingIntent JSON
        ↓
Deterministic candidate generators (genre / discover / shelf)
        ↓
AI enrich_fingerprint (optional, cached) → better representation
        ↓
Deterministic ranker-v3 (fingerprintIntentFit + explicit weights)
        ↓
AI rerank_shortlist (top 20–40 only, IDs only)
        ↓
Final list + controlled reason codes
```

## Modules

| Tool | Path | Role |
|------|------|------|
| `interpretViewingIntent` | `lib/intelligence/ai/interpret-intent.ts` | Free-text → structured dims + avoid lists |
| `enrichFingerprintWithAI` | `lib/intelligence/ai/enrich-fingerprint-ai.ts` | Representation upgrade, localStorage cache |
| `rerankShortlist` | `lib/intelligence/ai/rerank-shortlist.ts` | ~25% blend, no new titles |
| UI | `components/MoodFreeText.tsx` | Mood index free-text box |

## What we deliberately do **not** do

- User prompt → AI → 10 anime titles
- Letting AI invent IDs on the shortlist
- Replacing Taste Drift, fatigue, completion, novelty

## Setup

User API key in AI panel (OpenRouter / OpenAI / Gemini / Groq). Same settings as Oracle / Detail AI.
