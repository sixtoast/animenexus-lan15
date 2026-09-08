/**
 * Anime GIF sources for Motion room.
 * Primary (no key): Gifukai + nekos.best
 * Optional: TENOR_API_KEY / GIPHY_API_KEY for broader title search
 */

export type GifHit = {
  id: string;
  url: string;
  thumb?: string;
  label: string;
  source: "gifukai" | "nekos.best" | "tenor" | "giphy" | "waifu.pics";
  animeName?: string;
};

const UA =
  "AnimeNexus/1.0 (motion; https://github.com/sixtoast/animenexus-lan15)";

const GIFUKAI_ACTIONS = [
  "hug",
  "kiss",
  "pat",
  "cry",
  "sleep",
  "pout",
  "blush",
  "dance",
  "wave",
  "smile",
  "wink",
  "happy",
] as const;

const NEKOS_GIF_CATEGORIES = [
  "hug",
  "kiss",
  "pat",
  "dance",
  "wave",
  "happy",
  "smile",
  "wink",
  "cry",
  "blush",
  "laugh",
  "thumbsup",
] as const;

function tenorKey() {
  return (process.env.TENOR_API_KEY || "").trim();
}

function giphyKey() {
  return (process.env.GIPHY_API_KEY || "").trim();
}

/** Always true — free sources ship without keys */
export function isGifSearchConfigured(): boolean {
  return true;
}

function titleTokens(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3)
    .slice(0, 8);
}

function nameMatchesTitle(
  animeName: string | undefined,
  title: string,
): boolean {
  if (!animeName) return false;
  const name = animeName.toLowerCase();
  const full = title.toLowerCase();
  if (
    name.includes(full.slice(0, Math.min(full.length, 24))) ||
    full.includes(name.slice(0, 16))
  ) {
    return true;
  }
  const tokens = titleTokens(title);
  if (!tokens.length) return false;
  let hits = 0;
  for (const t of tokens) {
    if (name.includes(t)) hits++;
  }
  return hits >= Math.min(2, tokens.length) || (tokens.length === 1 && hits === 1);
}

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": UA },
      next: { revalidate: 1800 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function gifukaiRandom(action: string): Promise<GifHit | null> {
  const j = (await fetchJson(`https://api.gifukai.com/v1/${action}`)) as {
    url?: string;
    anime?: string;
    action?: string;
    filename?: string;
  } | null;
  if (!j?.url) return null;
  return {
    id: `gifukai-${j.filename || action}-${j.url.slice(-12)}`,
    url: j.url,
    thumb: j.url,
    label: j.anime ? `${j.action || action} · ${j.anime}` : action,
    source: "gifukai",
    animeName: j.anime,
  };
}

/** Sample board: mixed Gifukai + nekos (no title filter) */
export async function fetchSampleGifs(limit = 12): Promise<GifHit[]> {
  const out: GifHit[] = [];
  const seen = new Set<string>();
  const actions = [...GIFUKAI_ACTIONS].sort(() => Math.random() - 0.5);

  for (const action of actions) {
    if (out.length >= limit) break;
    const hit = await gifukaiRandom(action);
    if (!hit || seen.has(hit.url)) continue;
    seen.add(hit.url);
    out.push(hit);
  }

  if (out.length < limit) {
    for (const cat of NEKOS_GIF_CATEGORIES) {
      if (out.length >= limit) break;
      const j = (await fetchJson(
        `https://nekos.best/api/v2/${cat}?amount=2`,
      )) as {
        results?: { url?: string; anime_name?: string }[];
      } | null;
      for (const r of j?.results || []) {
        if (!r.url || seen.has(r.url)) continue;
        seen.add(r.url);
        out.push({
          id: `nekos-${cat}-${r.url.slice(-16)}`,
          url: r.url,
          thumb: r.url,
          label: r.anime_name ? `${cat} · ${r.anime_name}` : cat,
          source: "nekos.best",
          animeName: r.anime_name,
        });
        if (out.length >= limit) break;
      }
    }
  }

  return out;
}

async function searchNekosBest(
  title: string,
  limit: number,
): Promise<GifHit[]> {
  const out: GifHit[] = [];
  const seen = new Set<string>();
  const queries = [
    title,
    title.split(/[:\-–—]/)[0]?.trim() || title,
    ...titleTokens(title).slice(0, 2),
  ].filter((q, i, arr) => q && q.length >= 2 && arr.indexOf(q) === i);

  for (const q of queries) {
    if (out.length >= limit) break;
    const j = (await fetchJson(
      `https://nekos.best/api/v2/search?query=${encodeURIComponent(q)}&type=2&amount=${Math.min(20, limit * 2)}`,
    )) as {
      results?: { url?: string; anime_name?: string }[];
    } | null;
    for (const r of j?.results || []) {
      if (!r.url || seen.has(r.url)) continue;
      const prefer = nameMatchesTitle(r.anime_name, title);
      if (!prefer && out.length > 2) continue;
      seen.add(r.url);
      out.push({
        id: `nekos-search-${r.url.slice(-16)}`,
        url: r.url,
        thumb: r.url,
        label: r.anime_name || `GIF · ${q}`,
        source: "nekos.best",
        animeName: r.anime_name,
      });
      if (out.length >= limit) break;
    }
  }
  return out;
}

async function searchGifukaiByTitle(
  title: string,
  limit: number,
  attempts = 24,
): Promise<GifHit[]> {
  const out: GifHit[] = [];
  const seen = new Set<string>();
  const actions = [...GIFUKAI_ACTIONS];
  for (let i = 0; i < attempts && out.length < limit; i++) {
    const action = actions[i % actions.length];
    const hit = await gifukaiRandom(action);
    if (!hit || seen.has(hit.url)) continue;
    seen.add(hit.url);
    if (nameMatchesTitle(hit.animeName, title)) {
      out.push(hit);
    }
  }
  return out;
}

async function searchTenor(q: string, limit: number): Promise<GifHit[]> {
  const key = tenorKey();
  if (!key) return [];
  const url =
    `https://tenor.googleapis.com/v2/search` +
    `?q=${encodeURIComponent(q)}` +
    `&key=${encodeURIComponent(key)}` +
    `&client_key=animenexus_motion` +
    `&limit=${limit}` +
    `&media_filter=gif` +
    `&contentfilter=medium`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const j = (await res.json()) as {
      results?: {
        id?: string;
        content_description?: string;
        media_formats?: {
          gif?: { url?: string };
          tinygif?: { url?: string };
          mediumgif?: { url?: string };
        };
      }[];
    };
    const out: GifHit[] = [];
    for (const r of j.results || []) {
      const gif =
        r.media_formats?.mediumgif?.url ||
        r.media_formats?.gif?.url ||
        r.media_formats?.tinygif?.url;
      if (!gif) continue;
      out.push({
        id: `tenor-${r.id || out.length}`,
        url: gif,
        thumb: r.media_formats?.tinygif?.url || gif,
        label: r.content_description || "GIF",
        source: "tenor",
      });
    }
    return out;
  } catch {
    return [];
  }
}

async function searchGiphy(q: string, limit: number): Promise<GifHit[]> {
  const key = giphyKey();
  if (!key) return [];
  const url =
    `https://api.giphy.com/v1/gifs/search` +
    `?api_key=${encodeURIComponent(key)}` +
    `&q=${encodeURIComponent(q)}` +
    `&limit=${limit}` +
    `&rating=pg-13` +
    `&lang=en`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const j = (await res.json()) as {
      data?: {
        id?: string;
        title?: string;
        images?: {
          original?: { url?: string };
          downsized?: { url?: string };
          fixed_height_small?: { url?: string };
        };
      }[];
    };
    const out: GifHit[] = [];
    for (const r of j.data || []) {
      const gif =
        r.images?.downsized?.url ||
        r.images?.original?.url ||
        r.images?.fixed_height_small?.url;
      if (!gif) continue;
      out.push({
        id: `giphy-${r.id || out.length}`,
        url: gif,
        thumb: r.images?.fixed_height_small?.url || gif,
        label: r.title || "GIF",
        source: "giphy",
      });
    }
    return out;
  } catch {
    return [];
  }
}

export async function searchAnimeGifs(
  title: string,
  opts?: { limit?: number },
): Promise<{ hits: GifHit[]; notes: string[] }> {
  const q = title.trim();
  const limit = opts?.limit ?? 12;
  const notes: string[] = [];
  if (q.length < 2) return { hits: [], notes: ["query too short"] };

  const hits: GifHit[] = [];
  const seen = new Set<string>();

  const pushAll = (batch: GifHit[], label: string) => {
    let n = 0;
    for (const h of batch) {
      if (seen.has(h.url)) continue;
      seen.add(h.url);
      hits.push(h);
      n++;
      if (hits.length >= limit) break;
    }
    if (n) notes.push(`${label} (+${n})`);
    else notes.push(`${label}: none`);
  };

  try {
    const nekos = await searchNekosBest(q, limit);
    pushAll(nekos, "nekos.best");
  } catch {
    notes.push("nekos.best: failed");
  }

  if (hits.length < limit) {
    try {
      const gk = await searchGifukaiByTitle(q, limit - hits.length);
      pushAll(gk, "Gifukai");
    } catch {
      notes.push("Gifukai: failed");
    }
  }

  if (hits.length < limit && tenorKey()) {
    const batch = await searchTenor(`${q} anime`, limit - hits.length);
    pushAll(batch, "Tenor");
  }
  if (hits.length < limit && giphyKey()) {
    const batch = await searchGiphy(`${q} anime`, limit - hits.length);
    pushAll(batch, "Giphy");
  }

  if (!hits.length) {
    notes.push("No title-tagged GIFs — try Sample GIFs tab");
  }

  return { hits: hits.slice(0, limit), notes };
}
