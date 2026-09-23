# Lantern-ko directional animation

The review branch contains the recovered source artwork, layered directional rig,
and 80 transparent 384 × 576 PNG animation frames.

- Turn left/right: 16 frames each, front to 45°, 24 fps, play once.
- Walk left/right: 24 frames each, side profile, 25.2 fps, loop.
- Sequence order and timing: `public/mascot2d/frames/index.json`.
- Frame player: `/mascot2d/frames/preview.html` (also works as a local file).
- Interactive React rig: `/mascot-2d-preview`.
- Re-export: `node scripts/export-directional-frames.cjs`.

The turn uses separate 0°, 15°, 30° and 45° drawings with eased timing and small
transform in-betweens. It is not sixteen separately hand-drawn viewpoints.
The walk uses separate upper legs, shins, boots, arm, carrying arm/lantern,
head and eye layers. The two-bone gait keeps stance feet level, lifts each
foot on recovery, and offsets arm, lantern and hair motion.
Left-facing artwork is mirrored, including the lantern.

`turnAssets.json` records the original image crops; `DirectionalRig.tsx`
records their stage placement. Source layers remain editable and the PNG
sequences are flattened exports of that rig.

Verification: animation-file ESLint, deterministic gait checks, PNG rendering
and visual pose inspection. Full-project TypeScript checking remains blocked
by existing missing exports in anime-provider and terrain modules.
Live browser validation could not complete because the browser executable was
unavailable and its download failed. No production deployment was performed.
