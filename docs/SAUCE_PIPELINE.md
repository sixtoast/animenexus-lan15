# Sauce upload pipeline (Creative Sprint 15)

## Flow

```
local preview
  → canvas redraw (strips EXIF / orientation metadata)
  → resize long edge ≤ 1280, JPEG ~0.85
  → POST multipart to /api/sauce
  → trace.moe (optional SauceNAO on URL path)
  → results only — no Cloudinary retention
```

## Privacy

- Preprocess runs **in the browser** (`lib/sauce-preprocess.ts`).
- AnimeNexus does **not** store screenshots on Cloudinary for recognition.
- Server receives a compressed frame for the provider request only.

## Progress UI

| Phase | Label |
|-------|--------|
| `prepare` | Preparing frame… |
| `search` | Tracing… |
| `done` | Results / prep note |

## API

Unchanged: `POST /api/sauce` with `multipart/form-data` (`image`) or JSON `{ url }`.
