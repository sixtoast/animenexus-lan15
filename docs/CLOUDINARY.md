# Cloudinary foundation (Creative Sprint 12)

## Scope

Cloudinary manages **AnimeNexus-owned / ingested** media:

- Session covers, site artwork, promo
- Allowed UGC / processed sauce previews
- Export assets

**Do not** auto-upload AniList / MAL catalogue covers without rights review. Those stay on `AnimeImage` + Next/Image remote patterns.

## Env

```bash
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
# Server-only upload (future pipelines — never expose to client):
# CLOUDINARY_API_KEY=
# CLOUDINARY_API_SECRET=
```

## API

```ts
import { buildCloudinaryUrl, CLOUDINARY_TRANSFORMS } from "@/lib/media/cloudinary";
import { NexusCloudImage } from "@/components/media/NexusCloudImage";
import { NexusCloudVideo } from "@/components/media/NexusCloudVideo";

const url = buildCloudinaryUrl({
  publicId: "nexus/session-covers/demo",
  transform: "nexus-session-cover",
});

<NexusCloudImage
  publicId="nexus/art/logo"
  alt="AnimeNexus"
  width={360}
  height={540}
  transform="nexus-card"
/>
```

## Named transforms (Sprint 13 prep)

| Name | Intent |
|------|--------|
| `nexus-card` | Poster 360×540 |
| `nexus-hero` | Wide hero |
| `nexus-avatar` | Circle avatar |
| `nexus-session-cover` | 1200×630 share |
| `nexus-thumbnail` | Small thumb |
| `nexus-social` | OG-sized |
| `nexus-sauce-preview` | Sauce preview limit |

Mirror these as **named transformations** in the Cloudinary console when ready.

## Next/Image

`res.cloudinary.com` is on `images.remotePatterns`. Prefer Cloudinary `f_auto,q_auto` — avoid stacking aggressive Next optimizers on top of already-optimized Cloudinary URLs when possible (Sprint 13).
