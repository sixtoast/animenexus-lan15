# Openverse asset research workflow (Creative Sprint 27)

## Purpose

Safe discovery of **supplementary** openly licensed material — not a runtime media source.

Openverse may inform:

- textures / environmental reference
- sound *research* (final SFX still go through the audio register)
- editorial / decorative assets

## Forbidden

| Do not |
|--------|
| Use Openverse (or any CC host) as the **anime poster** pipeline |
| Fetch random Openverse URLs **live** into production UI |
| Hotlink Openverse CDN in client components |
| Skip licence / attribution recording |

Catalog posters remain AniList/MAL (or equivalent) remote URLs via existing image components.

## Ingestion rule (required path)

```
asset discovered (Openverse search)
        ↓
licence checked (CC0 / CC-BY / … — reject unclear)
        ↓
attribution requirements recorded
        ↓
asset downloaded (local working copy)
        ↓
optimised (size, format, strip excess metadata)
        ↓
served from AnimeNexus (public/ or Cloudinary owned media)
        ↓
row added to docs/OPENVERSE_ASSET_REGISTER.md
```

If any step fails → **do not ship**.

## Licence acceptance

| Accept (with attribution when required) | Reject |
|------------------------------------------|--------|
| CC0 | “All rights reserved” |
| CC-BY (keep notice) | Unknown / missing licence |
| CC-BY-SA (share-alike constraints noted) | NC-only when commercial distribution is unclear |
| Public domain mark | Scraped mirrors without provenance |

Always read the **work-level** licence on Openverse, not only the collection blurb.

## Attribution template

```
Title: …
Creator: …
Source: https://openverse.org/…
Licence: CC-BY-4.0 (link)
Modifications: resized / recolored / cropped (list)
Where used: e.g. night-desk texture (not posters)
```

## Runtime rule

Production builds may only reference assets under:

- `public/` (committed),
- or Cloudinary **owned** delivery (`NexusCloudImage` / transforms),

never `https://api.openverse…` or direct third-party CC CDN links invented at request time.

## Related docs

- [AUDIO_ASSET_REGISTER.md](./AUDIO_ASSET_REGISTER.md) — SFX provenance
- [IMAGE_OPTIMISATION.md](./IMAGE_OPTIMISATION.md) — Cloudinary vs catalog art
- [SFX_PIPELINE.md](./SFX_PIPELINE.md) — discovery vs runtime for sound
