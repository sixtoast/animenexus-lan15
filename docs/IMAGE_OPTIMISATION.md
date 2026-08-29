# Image optimisation strategy (Creative Sprint 13)

## Owners

| Source | Path | Optimiser |
|--------|------|-----------|
| AniList / MAL covers | `AnimeImage` | Next/Image **once** |
| Site-owned / UGC | `NexusCloudImage` | Cloudinary `f_auto,q_auto,dpr_auto` |
| Unknown remote | `AnimeImage` raw `<img>` | Browser |

**Never** run Next image optimisation on a Cloudinary delivery URL (double encode). `NexusCloudImage` sets `unoptimized` when the src is Cloudinary.

## Layout (CLS)

Use `layoutFor(context)` from `lib/media/image-strategy.ts`:

```ts
import { NexusCloudImage } from "@/components/media";

<NexusCloudImage
  publicId="nexus/session-covers/demo"
  alt="Session"
  context="session-cover"
/>
```

Contexts: `card` · `hero` · `avatar` · `session-cover` · `thumbnail` · `social` · `sauce-preview`

## Named transforms

Defined in `CLOUDINARY_TRANSFORMS` (`g_auto` / `g_face` for crop bias). Mirror as named transformations in the Cloudinary console when you enable the account.

## Catalogue covers

Keep `AnimeImage` — do not upload third-party posters to Cloudinary without rights review.
