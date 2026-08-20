# Master evolution plan — status map

**Rule:** dependency order; preserve Confessions, Oracle, AniList, real AI, mascot. No Sakura expansion (removal = Sprint 35).

## Foundation (already in repo)

| Sprint | Status |
|--------|--------|
| 0 Inventory | `docs/FEATURE_INVENTORY.md` |
| 1 Behaviour events | `lib/nexus/*` event bus + vocabulary + hover dwell |
| 2 Memory 2.0 | `lantern-memory` confidence, decay, rec/watch signals |
| 3 Resonance | `lib/resonance.ts` + rank surfaces |
| 4 Rec learning | `recommend-feedback`, lifecycle marks |
| 5 AI agent | `lib/lantern-agent/*` |
| 6 Environment | `nexus-environment.ts` |
| 7 Lantern attention | mascot bridges + director |

## Interaction polish (recent)

| Sprint | Status |
|--------|--------|
| 11–19 | Stateful cards, seal authenticity, first visit, loading, errors, adaptive mascot, motion tokens, view transitions, empty states |
| 20 (cohesion) | Token bridge + optional sakura *pref* (full removal still 35) |

## Storytelling track (this pass)

| Sprint | Status |
|--------|--------|
| **20 Taste as story** | `lib/taste-story.ts` + Taste UI: Earlier / Current / Emerging + evidence |

## Next

1. **21** Editorial Stats  
2. **25** Why this is here (on rec surfaces)  
3. **35** Sakura removal (clean delete)  
4. **36** Final cohesion pass  
