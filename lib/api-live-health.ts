/**
 * Live reachability probes for public / optional APIs.
 * Server-only. Never logs secrets. Soft timeouts.
 */

export type LiveStatus = "online" | "degraded" | "down" | "skipped";

export type LiveHealthRow = {
  id: string;
  label: string;
  status: LiveStatus;
  latencyMs: number | null;
  detail?: string;
  group?: string;
};

const TIMEOUT_MS = 6000;

async function timedFetch(
  url: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; ms: number; err?: string }> {
  const started = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...init,
      signal: ctrl.signal,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": "AnimeNexus-Lantern/1.0 (health check)",
        ...(init?.headers || {}),
      },
    });
    return { ok: res.ok, status: res.status, ms: Date.now() - started };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      ms: Date.now() - started,
      err: e instanceof Error ? e.message : "fetch failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

function classify(
  r: { ok: boolean; status: number; ms: number; err?: string },
  softOk?: (status: number) => boolean,
): { status: LiveStatus; detail: string } {
  if (r.ok || (softOk && softOk(r.status))) {
    if (r.ms > 3500) return { status: "degraded", detail: `${r.ms}ms (slow)` };
    return { status: "online", detail: `${r.ms}ms` };
  }
  if (r.err?.includes("abort")) {
    return { status: "down", detail: `timeout >${TIMEOUT_MS}ms` };
  }
  return {
    status: "down",
    detail: r.err || `HTTP ${r.status || "—"}`,
  };
}

async function probeAniList(): Promise<LiveHealthRow> {
  const r = await timedFetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: "{ Media(id: 1) { id title { romaji } } }",
    }),
  });
  const c = classify(r);
  return {
    id: "anilist",
    label: "AniList GraphQL",
    status: c.status,
    latencyMs: r.ms,
    detail: c.detail,
    group: "catalog",
  };
}

async function probeJikan(): Promise<LiveHealthRow> {
  const r = await timedFetch("https://api.jikan.moe/v4");
  const c = classify(r, (s) => s === 200 || s === 429);
  return {
    id: "jikan",
    label: "Jikan (MAL)",
    status: r.status === 429 ? "degraded" : c.status,
    latencyMs: r.ms,
    detail: r.status === 429 ? `${r.ms}ms · rate limited` : c.detail,
    group: "catalog",
  };
}

async function probeKitsu(): Promise<LiveHealthRow> {
  const r = await timedFetch(
    "https://kitsu.io/api/edge/anime?page%5Blimit%5D=1",
  );
  const c = classify(r);
  return {
    id: "kitsu",
    label: "Kitsu",
    status: c.status,
    latencyMs: r.ms,
    detail: c.detail,
    group: "catalog",
  };
}

async function probeShikimori(): Promise<LiveHealthRow> {
  const r = await timedFetch("https://shikimori.one/api/animes?limit=1");
  const c = classify(r);
  return {
    id: "shikimori",
    label: "Shikimori",
    status: c.status,
    latencyMs: r.ms,
    detail: c.detail,
    group: "catalog",
  };
}

async function probeOpenMeteo(): Promise<LiveHealthRow> {
  const r = await timedFetch(
    "https://api.open-meteo.com/v1/forecast?latitude=0&longitude=0&current_weather=true",
  );
  const c = classify(r);
  return {
    id: "open-meteo",
    label: "Open-Meteo",
    status: c.status,
    latencyMs: r.ms,
    detail: c.detail,
    group: "enrichment",
  };
}

async function probeSupabase(): Promise<LiveHealthRow> {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  if (!base) {
    return {
      id: "supabase",
      label: "Supabase",
      status: "skipped",
      latencyMs: null,
      detail: "Not configured",
      group: "infra",
    };
  }
  const r = await timedFetch(base.replace(/\/$/, "") + "/rest/v1/", {
    headers: {
      apikey: (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim(),
      Authorization: `Bearer ${(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim()}`,
    },
  });
  const reachable =
    r.ok || r.status === 401 || r.status === 404 || r.status === 200;
  return {
    id: "supabase",
    label: "Supabase",
    status: reachable ? (r.ms > 3500 ? "degraded" : "online") : "down",
    latencyMs: r.ms,
    detail: reachable ? `${r.ms}ms` : r.err || `HTTP ${r.status}`,
    group: "infra",
  };
}

async function probeSiteSelf(
  origin?: string | null,
): Promise<LiveHealthRow> {
  const site =
    (process.env.NEXT_PUBLIC_SITE_URL || "").trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  if (!site && !origin) {
    return {
      id: "cover-proxy",
      label: "Cover proxy",
      status: "skipped",
      latencyMs: null,
      detail: "No site URL",
      group: "infra",
    };
  }
  const base = (origin || site).replace(/\/$/, "");
  const sample =
    "https://s4.anilist.co/file/anilistcdn/media/anime/cover/small/bx1-CXtrrkMpOW7.jpg";
  const r = await timedFetch(
    `${base}/api/cover?u=${encodeURIComponent(sample)}`,
  );
  const c = classify(r);
  return {
    id: "cover-proxy",
    label: "Cover proxy",
    status: c.status,
    latencyMs: r.ms,
    detail: c.detail,
    group: "infra",
  };
}

export async function runLiveHealthProbes(opts?: {
  origin?: string | null;
}): Promise<{ checkedAt: string; probes: LiveHealthRow[] }> {
  const results = await Promise.all([
    probeAniList(),
    probeJikan(),
    probeKitsu(),
    probeShikimori(),
    probeOpenMeteo(),
    probeSupabase(),
    probeSiteSelf(opts?.origin),
  ]);

  return {
    checkedAt: new Date().toISOString(),
    probes: results,
  };
}
