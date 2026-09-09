# Mood / Viewing Intent Accuracy Overhaul

## Six original problems

1. **V3 ignored authored ExperienceIntent targets** and built a fake anime from genre hints / blurb, then compared fingerprints to that fake title.
2. **Explicit mood had too little ranking influence** (~15%), so long-term taste could overpower "what I want tonight."
3. **Energy / Attention / Intensity dials** were not meaningfully applied to V3 fingerprint scoring.
4. **Neutral 0.5 dimensions** inflated cosine similarity between unrelated intents.
5. **Mood pages fetched a single narrow genre** before ranking, starving the ranker of candidates.
6. **Passive inference** treated Drama or Romance drift as "Destroy me."

## New behaviour

### Explicit Viewing Intent (canonical V3)

- Each intent has `fingerprintTarget` + optional `fingerprintWeights`.
- `genreHints` are **retrieval only** — they never define meaning.
- `buildExperienceFingerprintTarget(exp, session)` starts from the authored target and **modifies** it with Intensity / Energy / Attention dials (never replaces the intent).
- `fingerprintIntentFit(fp, exp, session)` scores **only authored dimensions**, with confidence softening for weak metadata.
- Ranker uses `RANKER_V3_EXPLICIT_INTENT_WEIGHTS` when an explicit non-surprise intent is active (`viewingIntent ≈ 0.36`).
- Mood pages force Ranker V3; soft-fallback to V2 on error.

### Surprise me

- Empty fingerprint target — novelty / exploration logic, not fake mood matching.

### Session dials

- **Intensity**: light lowers emotional intensity / tension; maximum raises emotional intensity (action only if the mood already includes action intensity).
- **Attention**: easy lowers cognitive load / complexity, raises accessibility; demanding raises complexity.
- **Energy**: primarily pacing (and action intensity only if present).
- **Minutes**: soft −0.06 penalty when runtime exceeds available + 8 minutes.

### Candidate retrieval

- Mood routes fetch up to three genre hint pages **plus** a discover pool, soft-fail per request, then dedupe.
- Ranking applies fingerprint fit on the merged pool.

### Passive inference (`tonight-infer`)

- Conservative mapping; **never** maps weak Drama/Romance drift to "Destroy me."
- Explicit user selection always wins over passive guess.

### Legacy V2

- `IntentVector`, `animeIntentFingerprint`, centred-cosine `intentSimilarity`, and `experienceIntentSimilarity` remain for fallback.
- V3 fingerprint scoring is canonical for explicit Viewing Intent.

## Architecture

```
EXPLICIT VIEWING INTENT  →  desired experience
SESSION DIALS            →  modify that experience
ANIME FINGERPRINT        →  measure fit
USER TASTE               →  personalise among good matches
OUTCOME SIGNALS          →  completion / fatigue / drop risk
FINAL RECOMMENDATION
```

Not: Mood → Genre → Popular anime.
