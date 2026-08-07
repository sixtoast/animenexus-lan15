# AnimeNexus — Lantern (Next.js)

Late-night anime console: moods, watchlist, discovery tools, and AI desk.

**Repo:** https://github.com/sixtoast/animenexus-lantern  
**Parity:** [`PARITY.md`](./PARITY.md)

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Features

- Browse, moods, seasonal, daily, airing
- Detail + vis-network ancestry (CDN)
- Local watchlist; AniList + MAL public sync
- Tools: fusion, dislike, completionist, radar, stats, silhouette challenge, sauce, oracle (vibe-cast cards), fan zone, motion clip room
- Home: continue strip, streak, rails
- Session: Tonight / Break / Flashback (FAB, `Q` / `B`)
- Shortcuts `?` · Cmdk `Ctrl/⌘+K` · AI panel `A`
- **Streaming AI** in the 🤖 panel when the provider supports SSE
- PWA: `start_url: "/"`, `/icon.svg`
- **Night Signal ARG: declined**

## AI keys

1. Open **🤖** (or press `A`)
2. Set OpenRouter / OpenAI-compatible / Groq base URL + key
3. Stored as `anime_nexus_ai_settings` in localStorage

## Deploy

Vercel · Node `>=18.18` · `next build`
