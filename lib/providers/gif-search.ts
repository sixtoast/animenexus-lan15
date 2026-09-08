/**
 * Title-based anime GIF search for Motion room.
 * Soft-fail. Requires TENOR_API_KEY and/or GIPHY_API_KEY.
 * Free keys: https://developers.google.com/tenor · https://developers.giphy.com/
 */

export type GifHit = {
  id: string;
  url: string;
  thumb?: string;
  label: string;
  source: "tenor" | "giphy";
};

function tenorKey() {
  return (process.env.TENOR_API_KEY || "").trim();
}

function giphyKey() {
  return (process.env.GIPHY_API_KEY || "").trim();
}

export function isGifSearchConfigured(): boolean {
  return Boolean(tenorKey() || giphyKey());
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
    const res = await fetch(url, { next: { revalidate: 3600 } });
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
    const res = await fetch(url, { next: { revalidate: 3600 } });
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
  const limit = opts?.limit ?? 10;
  const notes: string[] = [];
  if (q.length < 2) return { hits: [], notes: ["query too short"] };

  const queries = [`${q} anime`, `${q} anime gif`];
  const hits: GifHit[] = [];
  const seen = new Set<string>();

  if (tenorKey()) {
    for (const query of queries) {
      if (hits.length >= limit) break;
      const batch = await searchTenor(query, limit);
      for (const h of batch) {
        if (seen.has(h.url)) continue;
        seen.add(h.url);
        hits.push(h);
        if (hits.length >= limit) break;
      }
    }
    notes.push(hits.length ? `Tenor (${hits.length})` : "Tenor: no results");
  } else {
    notes.push("Tenor: no TENOR_API_KEY");
  }

  if (hits.length < limit && giphyKey()) {
    const batch = await searchGiphy(`${q} anime`, limit - hits.length);
    let n = 0;
    for (const h of batch) {
      if (seen.has(h.url)) continue;
      seen.add(h.url);
      hits.push(h);
      n++;
      if (hits.length >= limit) break;
    }
    notes.push(n ? `Giphy (+${n})` : "Giphy: no extra results");
  } else if (!giphyKey()) {
    notes.push("Giphy: no GIPHY_API_KEY");
  }

  return { hits: hits.slice(0, limit), notes };
}
