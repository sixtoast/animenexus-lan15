# Wiring LanternKoMeshV2 + GltfCompanion into animenexus-lan15

Status (as of integration):

- [x] `LanternKoMeshV2.tsx` shipped
- [x] `GltfCompanion.tsx` (V2) shipped with procedural fallback
- [x] `expression.ts` keys aligned with mesh `ExpressionKey`
- [x] `PlaceholderChibi.tsx` renders `<GltfCompanion />`
- [ ] `Actor.tsx` (live on-page path) — still uses its own mesh JSX; swap next

Nothing here changes the intention / anim-layers / store pipeline — only the render layer.

## Live paths

| Path | File | Mesh |
|------|------|------|
| On-page companion | `LiveTerrain` → `Actor` | **Still old Actor mesh — swap pending** |
| Habitat / scene | `MascotScene` → `PlaceholderChibi` | **GltfCompanion → LanternKoMesh** |

## GLB drop-in

Place an authored model at:

```
/public/mascot/companion.glb
```

Node names (case-sensitive):

- Required: `Head`, `Tip`
- Optional: `Body`, `ArmL`, `ArmR`, `BrowL`, `BrowR`, `Mouth`, `EyeL`, `EyeR`

Optional mouth morphs: `smile`, `bigSmile`, `frown`, `openO`, `flat`, `wobble`  
Optional clips (case-insensitive): `Idle`, `Walk`, `Jump`, `Land`, `Wave`, `Point`, `Think`, `Sleep`

With no GLB present, behaviour is identical to procedural mesh (safe).

## Actor.tsx next step

Replace Actor’s hand-built mesh group with:

```tsx
import { GltfCompanion } from "./GltfCompanion";
import { expressionFromAnim, expressionFromEmotions } from "@/lib/mascot/expression";

// inside Actor render, under the root transform group:
<GltfCompanion
  expression={expressionFromAnim(anim, expressionFromEmotions(emotions))}
  anim={anim}
  yaw={facingYaw}
  speed={speed}
  justLanded={justLandedThisFrame}
/>
```

Keep Actor’s terrain physics / screen projection / phase machine unchanged.
