# Master evolution plan — status map

Source: sequenced engineering programme (Events → Memory → Taste → Recs → Agent → Environment → Experience).

**Rule:** do not implement the whole 36-feature list in one PR. Ship by dependency order; preserve Confessions, Oracle, AniList, real AI, mascot.

## Already in place

| Plan area | Status |
|-----------|--------|
| Sprint 0 inventory | `docs/FEATURE_INVENTORY.md` |
| 1 Event bus | `lib/nexus/*` |
| 2 Memory 2.0 | `lib/lantern-memory.ts` |
| 3 Resonance | `lib/resonance.ts` |
| 4 Rec feedback + confidence | `lib/recommend-feedback.ts`, `recommend-rank.ts` |
| 5 Agent tools | `lib/lantern-agent/*` |
| 6 Environment | `lib/nexus-environment.ts`, `EnvironmentController` |
| 7 Attention | `lib/mascot/nexus-attention-bridge.ts` |
| 8 Home / Daily / Tonight | ranked surfaces |
| 9 Journey / Timeline | `/journey` + `lib/journey.ts` |
| 10 Watchlist sort | Recent / signal / progress |
| **11 Stateful AnimeCard** | **Visual states (ring + border + progress); no text badge spam** |
| 25–26 Why / dislike reasons | ranking + feedback types |
| 27 Insights | on Journey |
| 34 Reduced motion | attention bridge + card CSS |
| QA | `docs/QA_CHECKLIST.md` |

## Next in plan order

1. **Sprint 12** — Seal moment authenticity (mutation fail → no seal)  
2. Sprint 13 — First visit + return experience  
3. Sprint 14 — Loading Theatre  
4. Sprint 15 — Intelligent error states  
5. … then motion / tokens / Sakura removal / cohesion  

## Explicitly out of scope for one-shot

- Rebuilding the app  
- Fake AniList / fake AI  
- Removing Oracle, Confessions, or mascot  
- Sakura expansion (removal only, later)  
