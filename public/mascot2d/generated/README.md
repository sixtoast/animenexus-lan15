# Generated Lantern-ko artwork

All 51 PNGs recovered from the pointing, sitting and turn-layer generation session are preserved without pixel edits. `index.json` records their SHA-256 checksums and whether the current compositor uses them. Existing front-facing artwork remains in `components/mascot2d`.

Seven generated images are used for the front-facing seated skirt, independent relaxed/kicking legs, and pointing preparation/extension. The remaining images are archived drafts, not preloaded or rendered by the mascot. Some turn drafts contain halos, inconsistent proportions or entire characters instead of isolated arms. They are not a finished 15/30/45-degree turn rig.

## Animation preview

Open `/mascot-2d-preview`, select Manual rig, then `sit`, `point`, `wave`, `walk`, `run`, `nod` or `bow`. Sitting uses a short settling transition followed by alternating leg kicks. Eyes blink through eyelid masks and respond to gaze. Hair and bow retain follow-through; the lantern and gripping hand remain one connected drawing. Reduced-motion settings disable loops and keep both seated feet relaxed.

The SVG motion groups are independent from source-pixel crop viewBoxes, so movement cannot corrupt registration. This implements image-layer animation, not a new 3D model. The existing full-profile sprite remains available; a full 45-degree rotation still requires corrected, registered turn assets.
