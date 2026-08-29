# Mux evaluation gate (Creative Sprint 28)

**Date:** 2026-08-29  
**Decision:** **NO — do not integrate Mux.**

Sprint 29 (Mux platform), Sprint 30 (Premium Video Theatre), and related Mux-only work are **deferred** until a future evaluation flips this gate.

---

## Checklist from the master plan

| Upcoming need | Required today? | How AnimeNexus handles it |
|---------------|-----------------|---------------------------|
| First-party trailers | No | AniList trailer → **YouTube embed** on detail (`iframe`) |
| User-generated legal video | No | Not a product surface |
| Animated Session Covers | No | **Static** canvas/OG covers (`SessionCoverStudio`, `/api/og`) |
| Creator submissions (video) | No | Fan Zone is text confessions / social, not video hosting |
| Video essays | No | Out of scope |
| High-quality owned preview clips | No | Theme video links via **AnimeThemes.moe** (external); Motion client uses remote `<video>` when URL exists |

## Primary trailer path

```text
anime.trailer (AniList)
  → site === youtube + id
  → https://www.youtube.com/embed/{id}
```

If the only durable requirement is embedding YouTube trailers → **Mux is unnecessary.**

## Cost / complexity avoided

- Mux account, upload tokens, signed playback IDs
- Transcoding pipeline and storage cost
- Player chrome, captions pipeline, analytics dual-tracking
- Risk of hosting **unauthorised** anime-adjacent clips (policy: never ingest copyrighted episodes)

## When to re-open the gate

Re-run this evaluation if **any** of the following become real product goals:

1. AnimeNexus-owned promotional films or branded motion pieces (rights cleared)
2. Legal UGC video (moderation + storage budget approved)
3. Session Cover or onboarding **motion** that cannot be Rive/CSS/Lottie and must be H.264/HLS under our CDN
4. Creator programme requiring adaptive streaming + captions as first-party features

Then implement Sprint 29+ with `lib/video/mux.ts` and a hard rule: **no copyrighted anime episodes or unauthorised clips.**

## Related

- Trailers: `app/anime/[id]/page.tsx`
- Themes: `lib/providers/animethemes.ts`, `lib/themes-enrich.ts`
- Covers: `docs/SESSION_COVER.md`, `docs/OG.md`
- Creative inventory: `docs/CREATIVE_TECH_AUDIT.md`
