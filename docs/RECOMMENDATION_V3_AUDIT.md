# Recommendation Intelligence V3 — Repository Audit

**Date:** 2026-09-06  
**Scope:** Representation layer and ranking stack before fingerprint centralisation  
**Rule:** Do not invent new types before understanding existing ones. No embeddings/ML in this phase.

---

## 1. Current architecture (what exists)

| Module | Role | Production path? |
|--------|------|------------------|
| `preference-engine.ts` | Facade: clusters + drift + intent + resonance + drops → RankSignals | Yes |
| `taste-clusters.ts` | Multi-interest clusters from **genre/tag seeds** | Yes |
| `taste-drift.ts` | Windowed genre/tag density up/down | Yes |
| `taste-fatigue.ts` | Recent tag saturation → score factor | Yes |
| `taste-forecast.ts` | Rising/cooling from drift + shelf | Taste UI |
| `viewing-intent.ts` | Experiential IntentVector + EXPERIENCE_INTENTS | Yes |
| `intent-session.ts` | Local slug/intensity/energy/attention dials | Yes |
| `recommend-candidates.ts` | Multi-source pool (discover + **genre-filtered**) | Yes |
| `recommend-rank.ts` | PreferenceEngine scoring + reasons | Yes |
| `recommend-rerank.ts` | Diversity / franchise **title prefix** / fatigue | Yes |
| `behaviour-events.ts` | Local event log, affinity | Yes |
| `drop-signatures.ts` | Drop pattern penalties | Yes |
| `your-match.ts` | Detail match score + reasons | Detail UI |
| `resonance.ts` | **Genre → dimension priors** (~15 dims) | Used by preference-engine |
| `deep-metadata.ts` / `deep-tags.ts` | AniDB/AniList deep tags, provenance | **Mostly Detail**, not pool gen |
| `franchise-resolver.ts` / `relation-merge.ts` | Relations graph | Soft; reranker still title-heuristic |

---

## 2. What is heuristic today

- Resonance: fixed genre→dimension maps (documented non-factual).
- Clusters: SEED_CLUSTERS on genre lists; dims are genre keys.
- Drift / fatigue: genre-string densities.
- Candidates: `fetchFiltered({ genre })`; exploration = hardcoded genre list.
- Franchise de-dupe: first two title tokens.
- Your Match: score thresholds can imply precision without metadata confidence.

---

## 3. Richer metadata underused in ranking

AniList tags, AniDB deep tags, relations, episode/format structure, outcomes, behaviour events — detail-heavy, rank-light.

---

## 4. Duplicated feature extraction

Emotional axes in `resonance` ≈ `viewing-intent`. Genre weighting across clusters, drift, fatigue, resonance, candidates. Three parallel user-vector spaces.

**V3 target:** one **AnimePreferenceFingerprint** space; user vectors and intent project into it.

---

## 5. Bottleneck

```
SOPHISTICATED USER MODEL
        ↓
ROUGH GENRE/TAG REPRESENTATION  ← bottleneck
        ↓
ANIME
```

---

## 6. Implementation order (locked)

1. Fingerprint schema + builder + cache + similarity
2. User preference vector + clusters/drift on fingerprints
3. Candidate generators (genre = Tier-4 only)
4. Novelty / completion / friction
5. Contradictions + blind spots
6. Eval suite + `/dev/recommendation-lab` + tests

No collaborative filtering, transformers, or two-tower models in V3.
