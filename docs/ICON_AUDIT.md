# Icon language audit (Creative Sprint 18)

## Goal

One coherent icon language. No mixing of six icon systems.

## Inventory (as of this audit)

### Dependencies

| Library | In package.json? |
|---------|------------------|
| Iconify | No |
| Lucide / react-icons / Font Awesome / Heroicons | No |
| Inline SVG | Sparse (`public/icon.svg`, ancestry bits) |
| Emoji | **Primary practical set today** |

### Classification

| Class | Examples in codebase | Notes |
|-------|----------------------|--------|
| **navigation** | Navbar text labels (Home, Browse, Shelf…) | Text-first; theme toggle uses ☀️/🌙 |
| **action** | Buttons mostly text; ★ scores | No icon set |
| **status** | SignalBars, OnAir, state-box | Custom CSS, not icons |
| **tool** | Tools hub emoji (🌙📡🕯️🔍🎬…) | Largest emoji cluster |
| **decorative** | FeatureTip glyphs (◎∿▦◈), empty 📡📭 | Geometric unicode |
| **social / provider** | Text links (AniList) | No brand icon pack |
| **mood** | `lib/moods.ts` emoji | Mood identity |
| **taste DNA** | `lib/taste-dna.ts` emoji | Profile marks |

### Problem

Emoji is the de facto set but is **not semantic** (hard to theme, inconsistent optical size, mixed tone). No `NexusIcon` yet.

## Decision

| Role | Choice |
|------|--------|
| **Primary family** | **Semantic AnimeNexus icons** — curated names mapped to local SVG/unicode (Sprint 19–21) |
| **Secondary family** | **Emoji** only for mood / playful tool marks until custom SVGs exist |
| **Design reference** | Iconify *collection browse* offline (Phosphor or Lucide) — **not** runtime CDN |
| **Forbidden** | Mixing Font Awesome + Lucide + MDI + random SVG packs in UI |

### Rules going forward

1. Product chrome (nav, settings, search) → semantic `NexusIcon` names only.
2. Moods may keep emoji until a custom mood set ships.
3. Provider brands stay text or official SVG when rights allow.
4. No Iconify public API on critical path (Sprint 20).

## Map to next sprints

| Sprint | Work |
|--------|------|
| **19** | `NexusIcon` + semantic registry |
| **20** | Bundle critical icons locally |
| **21** | Custom Seal / Resonance / Lantern marks |
