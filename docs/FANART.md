# Fanart.tv

Optional supplemental artwork. Soft-fails without key or TVDB id.

## Env

```
FANART_API_KEY=your_project_key
```

Get a key: https://fanart.tv/get-an-api-key/

## Behaviour

- Looks up `webservice.fanart.tv/v3/tv/{tvdbId}`
- Requires `identity.tvdbId` — never invents TVDB from title alone
- AniList cover/banner remain canonical on Detail
- Gallery is collapsible and labeled as community art

## Code

- `lib/providers/fanart.ts`
- `components/ArtworkGallery.tsx`
