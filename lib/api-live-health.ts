import { getSupabaseProjectUrl } from "@/lib/supabase/config";
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
  detail: string;
  group: string;
};

async function timedFetch(
  url: string,
  init?: RequestInit,
  timeoutMs = 8000,
): Promise<{ ok: boolean; status: number; ms: number; err?: string }> {
  const t0 = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: ctrl.signal,
      cache: "no-store",
    });
    return {
      ok: res.ok,
      status: res.status,
      ms: Date.now() - t0,
    };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      ms: Date.now() - t0,
      err: e instanceof Error ? e.message : "fetch failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

function classify(ms: number, ok: boolean, status: number): {
  status: LiveStatus;
  detail: string;
} {
  if (!ok && status === 0) return { status: "down", detail: "unreachable" };
  if (ok || status === 401 || status === 403) {
    if (ms > 3500) return { status: "degraded", detail: `${ms}ms` };
    return { status: "online", detail: `${ms}ms` };
  }
  if (status >= 500) return { status: "down", detail: `HTTP ${status}` };
  if (status === 404) return { status: "online", detail: `${ms}ms (HTTP 404)` };
  return { status: "degraded", detail: `HTTP ${status} ${ms}ms` };
}

async function probeAnilist(): Promise<LiveHealthRow> {
  const r = await timedFetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: "{ Page(page:1,perPage:1){ media{ id } } }" }),
  });
  const c = classify(r.ms, r.ok, r.status);
  return {
    id: "anilist",
    label: "AniList",
    status: c.status,
    latencyMs: r.ms,
    detail: c.detail,
    group: "catalog",
  };
}

async function probeJikan(): Promise<LiveHealthRow> {
  const r = await timedFetch("https://api.jikan.moe/v4/anime/1");
  const c = classify(r.ms, r.ok, r.status);
  return {
    id: "jikan",
    label: "Jikan (MAL)",
    status: c.status,
    latencyMs: r.ms,
    detail: c.detail,
    group: "catalog",
  };
}

async function probeKitsu(): Promise<LiveHealthRow> {
  const r = await timedFetch(
    "https://kitsu.io/api/edge/anime?page[limit]=1",
    { headers: { Accept: "application/vnd.api+json" } },
  );
  const c = classify(r.ms, r.ok, r.status);
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
  const r = await timedFetch(
    "https://shikimori.one/api/animes?limit=1",
    { headers: { "User-Agent": "AnimeNexus-Lantern" } },
  );
  const c = classify(r.ms, r.ok, r.status);
  return {
    id: "shikimori",
    label: "Shikimori",
    status: c.status,
    latencyMs: r.ms,
    detail: c.detail,
    group: "catalog",
  };
}

async function probeMalOfficial(): Promise<LiveHealthRow> {
  const id = (process.env.MAL_CLIENT_ID || "").trim();
  if (!id) {
    return {
      id: "mal_official",
      label: "MAL Official",
      status: "skipped",
      latencyMs: null,
      detail: "No MAL_CLIENT_ID",
      group: "catalog",
    };
  }
  const r = await timedFetch("https://api.myanimelist.net/v2/anime/1?fields=id",
    { headers: { "X-MAL-CLIENT-ID": id } },
  );
  const c = classify(r.ms, r.ok, r.status);
  return {
    id: "mal_official",
    label: "MAL Official",
    status: c.status,
    latencyMs: r.ms,
    detail: c.detail,
    group: "catalog",
  };
}

async function probeTmdb(): Promise<LiveHealthRow> {
  const key =
    process.env.TMDB_API_KEY ||
    process.env.TMDB_READ_ACCESS_TOKEN ||
    "";
  if (!String(key).trim()) {
    return {
      id: "tmdb",
      label: "TMDB",
      status: "skipped",
      latencyMs: null,
      detail: "No TMDB key",
      group: "enrichment",
    };
  }
  const r = await timedFetch(
    `https://api.themoviedb.org/3/configuration?api_key=${encodeURIComponent(String(key).trim())}`,
  );
  const c = classify(r.ms, r.ok, r.status);
  return {
    id: "tmdb",
    label: "TMDB",
    status: c.status,
    latencyMs: r.ms,
    detail: c.detail,
    group: "enrichment",
  };
}

async function probeSimkl(): Promise<LiveHealthRow> {
  const id = (process.env.SIMKL_CLIENT_ID || "").trim();
  if (!id) {
    return {
      id: "simkl",
      label: "Simkl",
      status: "skipped",
      latencyMs: null,
      detail: "No SIMKL_CLIENT_ID",
      group: "enrichment",
    };
  }
  const r = await timedFetch("https://api.simkl.com/", {
    headers: { "simkl-api-key": id },
  });
  const c = classify(r.ms, r.ok || r.status === 404, r.status);
  return {
    id: "simkl",
    label: "Simkl",
    status: c.status,
    latencyMs: r.ms,
    detail: c.detail,
    group: "enrichment",
  };
}

async function probeOpenMeteo(): Promise<LiveHealthRow> {
  const r = await timedFetch(
    "https://api.open-meteo.com/v1/forecast?latitude=0&longitude=0&current=temperature_2m",
  );
  const c = classify(r.ms, r.ok, r.status);
  return {
    id: "open_meteo",
    label: "Open-Meteo",
    status: c.status,
    latencyMs: r.ms,
    detail: c.detail,
    group: "enrichment",
  };
}

async function probeSupabase(): Promise<LiveHealthRow> {
  let base: string | null = null;
  try {
    base = getSupabaseProjectUrl();
  } catch {
    return {
      id: "supabase",
      label: "Supabase",
      status: "down",
      latencyMs: null,
      detail:
        "Invalid NEXT_PUBLIC_SUPABASE_URL (use bare https://….supabase.co origin)",
      group: "infra",
    };
  }
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

export async function probeAllLiveHealth(): Promise<LiveHealthRow[]> {
  const rows = await Promise.all([
    probeAnilist(),
    probeJikan(),
    probeKitsu(),
    probeShikimori(),
    probeMalOfficial(),
    probeTmdb(),
    probeSimkl(),
    probeOpenMeteo(),
    probeSupabase(),
  ]);
  return rows;
}
