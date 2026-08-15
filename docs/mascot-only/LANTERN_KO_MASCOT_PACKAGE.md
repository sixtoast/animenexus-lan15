# Lantern-ko — Mascot-only package guide

**Source:** `sixtoast/animenexus-lan15` (live site repo)  
**Character:** Lantern-ko — 3D chibi companion (R3F / Three.js)

This file describes **everything that is “the mascot”** and where it lives so you can copy it out of the main app or hand it to another model.

---

## 1. What you get (features)

### Visual
- Procedural peach chibi (`LanternKoMeshV2`): big head, body, arms, brows, multi-mouth shapes, blush, **emissive lantern tip + glow**
- Optional GLB at `/public/mascot/companion.glb` via `GltfCompanion` (falls back to procedural)
- 15 expressions driven by emotions + short anim overrides
- Tip spring lag, land squash, soft arm settle, idle bob

### Behaviour brain
- Zustand store: position, anim, layers, intention, emotions, goals
- **Director** + utility AI (what to do next)
- Personality traits, long-term **memory / bond stage**
- Micro-behaviours (fidgets with cooldowns)
- Cursor relationship (ignore → notice → follow → chase / avoid)

### World
- **LiveTerrain**: orthographic canvas over the page
- DOM → platforms (cards, nav, modals)
- Home pad (bottom-right), roam, drag/pet
- Climb phases, safety clamp, go-home habitat
- UI interactions + recommendation guide
- Daily-life routines + skits

### Product polish
- Soft procedural audio (off by default)
- Performance tiers (DPR, rebuild throttle, pause when tab hidden)
- A11y: hide, mute, look-only, reduced motion, Alt+Shift shortcuts
- Debug panel (`?mascotDebug=1` or `localStorage anime_nexus_mascot_debug=on`)

---

## 2. File map (copy these folders)

```
lib/mascot/                 # ALL brain modules
  store.ts                  # central state + dispatch
  director.ts               # intention routing
  expression.ts             # 15 faces
  emotions.ts
  personality.ts
  memory.ts
  micro-behaviours.ts
  cursor-relationship.ts
  page-terrain.ts
  terrain-physics.ts
  ui-registry.ts
  ui-interactions.ts
  ui-events.ts
  rec-guide.ts
  climbing.ts
  safety.ts
  home-habitat.ts
  daily-life.ts
  skits.ts
  audio.ts
  visual.ts
  performance.ts
  a11y.ts
  procedural-motion.ts
  anim-layers.ts
  … (remaining helpers)

components/mascot/          # ALL UI / 3D
  MascotHost.tsx            # mount this in layout
  LiveTerrain.tsx           # live page canvas
  Actor.tsx                 # on-page character (live path)
  LanternKoMeshV2.tsx       # procedural mesh
  GltfCompanion.tsx         # GLB + fallback
  PlaceholderChibi.tsx      # habitat path (uses GltfCompanion)
  MascotDebugPanel.tsx
  ThoughtBubble.tsx
  UiAwareness.tsx
  UiTheatreBridge.tsx
  ContextBridge.tsx
  MemoryBoot.tsx
  MascotErrorBoundary.tsx
  …

docs/
  CHARACTER_DESIGN.md
  INTEGRATION.md            # GLB node names / rollout
```

**Entry point for the app:** `<MascotHost />` from `components/mascot/MascotHost.tsx`.

---

## 3. Peer dependencies

```json
{
  "three": "*",
  "@react-three/fiber": "*",
  "@react-three/drei": "*",
  "zustand": "*",
  "next": "15+",
  "react": "18+"
}
```

---

## 4. Mount

```tsx
// app/layout.tsx (client boundary as needed)
import { MascotHost } from "@/components/mascot/MascotHost";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <MascotHost />
      </body>
    </html>
  );
}
```

Copy `lib/mascot` and `components/mascot` into a Next app with the same `@/` alias (or rewrite imports).

---

## 5. Optional GLB

Path: `public/mascot/companion.glb`  
Required nodes: `Head`, `Tip`  
Optional: `Body`, `ArmL`, `ArmR`, `BrowL`, `BrowR`, `Mouth`, `EyeL`, `EyeR`  
See `docs/INTEGRATION.md`.

---

## 6. Controls (runtime)

| Action | How |
|--------|-----|
| Hide companion | Dock **Hide** or Alt+Shift+H |
| Mute | Dock 🔊/🔇 or Alt+Shift+M |
| Look only (no pet/drag) | Alt+Shift+I |
| Reduce motion | Dock ⏸️ |
| Debug | `?mascotDebug=1` |

---

## 7. Export script

```bash
git clone https://github.com/sixtoast/animenexus-lan15.git
cd animenexus-lan15
mkdir -p ../lantern-ko-mascot-only
cp -a lib/mascot ../lantern-ko-mascot-only/
cp -a components/mascot ../lantern-ko-mascot-only/
mkdir -p ../lantern-ko-mascot-only/docs
cp docs/CHARACTER_DESIGN.md docs/INTEGRATION.md ../lantern-ko-mascot-only/docs/ 2>/dev/null || true
cp docs/mascot-only/LANTERN_KO_MASCOT_PACKAGE.md ../lantern-ko-mascot-only/
cd ..
zip -r lantern-ko-mascot-only.zip lantern-ko-mascot-only
```
