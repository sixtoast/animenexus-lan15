# Intelligent artwork cropping (Creative Sprint 14)

## Context crops

| Context | Ratio / intent | Gravity |
|---------|----------------|---------|
| card | 2:3 poster | `g_auto:subject` |
| hero | 16:9 wide | `g_auto:subject` |
| mobile-hero | taller mobile band | `g_auto:subject` |
| session-cover | 1200×630 editorial | `g_auto` |
| avatar | 1:1 | `g_face` |
| thumbnail | small poster | `g_auto:subject` |
| social | OG | `g_auto` |
| sauce-preview | limit box | centre |

## Focal overrides

Stored in `localStorage` (`animenexus.media.focal.v1`) as `{ [publicId]: { x, y } }` with **0–1** coordinates.

```ts
import { setFocalPoint, cropTransformFor } from "@/lib/media/crop";

setFocalPoint("nexus/art/hero", { x: 0.42, y: 0.28 });
const tx = cropTransformFor("hero", "nexus/art/hero");
```

## Crop Lab

`/dev/crop-lab` — compare variants + edit focal points (requires Cloudinary cloud name). `robots: noindex`.
