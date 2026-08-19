# Master evolution plan — status map

Source: sequenced engineering programme (Events → Memory → Taste → Recs → Agent → Environment → Experience).

**Rule:** do not implement the whole 36-feature list in one PR. Ship by dependency order; preserve Confessions, Oracle, AniList, real AI, mascot.

## Already in place (approx.)

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
| 9 Journey / Timeline | **`/journey`** + `lib/journey.ts` (this ship) |
| 10 Watchlist sort | Recent / signal / progress |
| 25–26 Why / dislike reasons | ranking + feedback types |
| 27 Insights | **on Journey** |
| 34 Reduced motion | attention bridge + existing a11y |
| QA | `docs/QA_CHECKLIST.md` |

## Next recommended sequence

1. Stateful AnimeCard (visual states, not badge spam)  
2. Seal moment authenticity (fail → no seal)  
3. Loading Theatre copy pass  
4. Intelligent error states  
5. Sakura removal (Sprint 35)  
6. Design tokens / motion choreography  
7. Final cohesion walkthrough  

## Explicitly out of scope for one-shot

- Rebuilding the app  
- Fake AniList / fake AI  
- Removing Oracle, Confessions, or mascot  
- Sakura expansion (removal only, later)  
