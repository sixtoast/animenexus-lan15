# Dynamic Open Graph (Creative Sprint 17)

## Endpoint

`GET /api/og?kind=site|anime|tool|compare|session|journey|taste|shelf`

Optional: `title`, `subtitle`, `tool`, `a`, `b` (compare), `share=1`.

## Privacy

| Kind | Public by default |
|------|-------------------|
| site, anime, tool, compare | Yes |
| session, journey, taste, shelf | **Only** with `share=1` |

Without `share=1`, private kinds fall back to the public site card.

## Metadata helper

```ts
import { ogImageUrl } from "@/lib/og";

openGraph: {
  images: [{ url: ogImageUrl(origin, "anime", { title: anime.title }), width: 1200, height: 630 }],
}
```

## Note

Composition uses `next/og` ImageResponse (edge). Cloudinary is not required for OG generation.
