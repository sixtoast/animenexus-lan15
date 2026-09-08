"use client";

/**
 * Motion room — clip generator.
 * GIFs (Tenor/Giphy), AnimeThemes OP/ED, trailers, fanart/cover stills, samples, compose.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimeSearchPicker } from "@/components/AnimeSearchPicker";
import type { Anime } from "@/lib/types";
import { useWatchlist } from "@/components/WatchlistProvider";

const RECENT_KEY = "anime_nexus_motion_recent_v1";
const COMPOSE_KEY = "anime_nexus_motion_compose_v1";

export type MotionAsset = {
  id: string;
  kind: "gif" | "video" | "still" | "youtube";
  url: string;
  thumb?: string;
  label: string;
  source: string;
  animeTitle?: string;
};

type Tab = "samples" | "anime" | "compose" | "url";
type ComposeItem = MotionAsset & { dwellMs: number };

const SAMPLE_ENDPOINTS = [
  "https://api.waifu.pics/sfw/dance",
  "https://api.waifu.pics/sfw/happy",
  "https://api.waifu.pics/sfw/wave",
  "https://api.waifu.pics/sfw/smile",
  "https://api.waifu.pics/sfw/wink",
  "https://api.waifu.pics/sfw/pat",
];

function assetThumb(a: MotionAsset): string {
  if (a.thumb) return a.thumb;
  if (a.kind === "still" || a.kind === "gif") return a.url;
  return "";
}

function Stage({
  asset,
  playing,
}: {
  asset: MotionAsset | null;
  playing: boolean;
}) {
  if (!asset) {
    return (
      <div className="motion-stage motion-stage-empty">
        <span className="meta">Pick an asset or play a composition</span>
      </div>
    );
  }
  if (asset.kind === "youtube") {
    return (
      <div className="motion-stage">
        <iframe
          key={asset.url}
          src={asset.url + (playing ? "?autoplay=1" : "")}
          title={asset.label}
          className="motion-stage-media"
          style={{ width: "100%", minHeight: 280, border: 0 }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
        <div className="motion-stage-caption meta">
          {asset.label} · {asset.source}
        </div>
      </div>
    );
  }
  if (asset.kind === "video") {
    return (
      <div className="motion-stage">
        <video
          key={asset.url}
          src={asset.url}
          controls
          autoPlay={playing}
          loop
          playsInline
          className="motion-stage-media"
        />
        <div className="motion-stage-caption meta">
          {asset.label} · {asset.source}
        </div>
      </div>
    );
  }
  if (asset.kind === "gif") {
    return (
      <div className="motion-stage">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset.url} alt={asset.label} className="motion-stage-media" />
        <div className="motion-stage-caption meta">
          {asset.label} · {asset.source}
        </div>
      </div>
    );
  }
  return (
    <div className="motion-stage motion-stage-kenburns">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={asset.url + String(playing)}
        src={asset.url}
        alt={asset.label}
        className={`motion-kenburns ${playing ? "is-playing" : ""}`}
      />
      <div className="motion-stage-caption meta">
        {asset.label} · {asset.source} · Ken Burns
      </div>
    </div>
  );
}

export function MotionClient() {
  const { entries } = useWatchlist();
  const [tab, setTab] = useState<Tab>("anime");
  const [url, setUrl] = useState("");
  const [samples, setSamples] = useState<MotionAsset[]>([]);
  const [animeAssets, setAnimeAssets] = useState<MotionAsset[]>([]);
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<MotionAsset | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [compose, setCompose] = useState<ComposeItem[]>([]);
  const [composePlaying, setComposePlaying] = useState(false);
  const [composeIndex, setComposeIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw) as string[]);
      const c = localStorage.getItem(COMPOSE_KEY);
      if (c) setCompose(JSON.parse(c) as ComposeItem[]);
    } catch {
      /* */
    }
  }, []);

  const persistCompose = useCallback((next: ComposeItem[]) => {
    setCompose(next);
    try {
      localStorage.setItem(COMPOSE_KEY, JSON.stringify(next.slice(0, 24)));
    } catch {
      /* */
    }
  }, []);

  const pushRecent = useCallback((u: string) => {
    setRecent((prev) => {
      const next = [u, ...prev.filter((x) => x !== u)].slice(0, 10);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        /* */
      }
      return next;
    });
  }, []);

  const openAsset = useCallback(
    (a: MotionAsset) => {
      setPreview(a);
      setComposePlaying(false);
      pushRecent(a.url);
    },
    [pushRecent],
  );

  const addToCompose = useCallback(
    (a: MotionAsset) => {
      const dwell =
        a.kind === "still" ? 4500 : a.kind === "gif" ? 3500 : 8000;
      persistCompose([
        ...compose,
        { ...a, id: `${a.id}-${Date.now()}`, dwellMs: dwell },
      ]);
    },
    [compose, persistCompose],
  );

  async function loadSamples() {
    setBusy(true);
    setErr(null);
    try {
      const results: MotionAsset[] = [];
      for (const ep of SAMPLE_ENDPOINTS) {
        try {
          const res = await fetch(ep);
          if (!res.ok) continue;
          const j = (await res.json()) as { url?: string };
          if (j.url) {
            results.push({
              id: `sample-${results.length}`,
              kind: /\.gif(\?|$)/i.test(j.url) ? "gif" : "still",
              url: j.url,
              thumb: j.url,
              label: ep.split("/").pop() || "sample",
              source: "waifu.pics",
            });
          }
        } catch {
          /* */
        }
      }
      if (!results.length) throw new Error("Sample APIs returned nothing");
      setSamples(results);
      setTab("samples");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load samples");
    } finally {
      setBusy(false);
    }
  }

  async function loadForAnime(anime: Anime) {
    setBusy(true);
    setErr(null);
    setAnimeAssets([]);
    setNotes([]);
    try {
      const res = await fetch(
        `/api/motion-assets?id=${anime.id}&title=${encodeURIComponent(anime.title)}`,
      );
      const json = (await res.json()) as {
        assets?: MotionAsset[];
        notes?: string[];
        error?: string;
        gifSearchConfigured?: boolean;
      };
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setAnimeAssets(json.assets || []);
      const n = [...(json.notes || [])];
      if (json.gifSearchConfigured === false) {
        n.push("Add TENOR_API_KEY (or GIPHY_API_KEY) for title GIFs");
      }
      setNotes(n);
      if (!(json.assets || []).length) {
        setErr("No assets found — try samples or paste a URL.");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Asset fetch failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (selectedAnime) void loadForAnime(selectedAnime);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAnime?.id]);

  useEffect(() => {
    if (!composePlaying || !compose.length) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    const item = compose[composeIndex];
    if (!item) {
      setComposePlaying(false);
      return;
    }
    setPreview(item);
    timerRef.current = setTimeout(() => {
      setComposeIndex((i) => {
        const next = i + 1;
        if (next >= compose.length) {
          setComposePlaying(false);
          return 0;
        }
        return next;
      });
    }, item.dwellMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [composePlaying, composeIndex, compose]);

  const shelfQuick = useMemo(
    () =>
      entries
        .filter((e) => e.image)
        .slice(0, 8)
        .map((e) => ({ id: e.id, title: e.title, image: e.image! })),
    [entries],
  );

  function AssetGrid({ list, empty }: { list: MotionAsset[]; empty: string }) {
    if (!list.length) return <p className="meta">{empty}</p>;
    return (
      <div className="motion-grid">
        {list.map((a) => (
          <div key={a.id} className="motion-card">
            <button
              type="button"
              className="motion-card-thumb"
              onClick={() => openAsset(a)}
            >
              {assetThumb(a) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={assetThumb(a)} alt="" />
              ) : (
                <span className="meta">▶</span>
              )}
              <span className="motion-card-kind">{a.kind}</span>
            </button>
            <div className="motion-card-meta">
              <div className="motion-card-label">{a.label}</div>
              <div className="meta">{a.source}</div>
              <div className="motion-card-actions">
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => openAsset(a)}
                >
                  Preview
                </button>
                <button
                  type="button"
                  className="btn btn-accent btn-sm"
                  onClick={() => addToCompose(a)}
                >
                  + Compose
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const stageAsset =
    composePlaying && compose[composeIndex]
      ? compose[composeIndex]
      : preview;

  return (
    <div className="tools-panel motion-room">
      <style>{`
.motion-room .motion-tabs{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}
.motion-room .motion-tabs button[aria-pressed="true"]{outline:2px solid var(--accent,#c9a227)}
.motion-stage{position:relative;width:100%;min-height:280px;max-height:420px;background:#0c0c10;border-radius:12px;overflow:hidden;display:flex;align-items:center;justify-content:center;margin-bottom:12px}
.motion-stage-empty{border:1px dashed rgba(255,255,255,.15)}
.motion-stage-media{max-width:100%;max-height:400px;object-fit:contain}
.motion-kenburns{width:100%;height:100%;min-height:280px;object-fit:cover;transform:scale(1.05)}
.motion-kenburns.is-playing{animation:motionKenBurns 5s ease-in-out forwards}
@keyframes motionKenBurns{from{transform:scale(1.05)}to{transform:scale(1.18) translate(-2%,-1%)}}
.motion-stage-caption{position:absolute;left:0;right:0;bottom:0;padding:8px 12px;background:linear-gradient(transparent,rgba(0,0,0,.75))}
.motion-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px}
.motion-card{border:1px solid rgba(255,255,255,.08);border-radius:10px;overflow:hidden;background:rgba(255,255,255,.03)}
.motion-card-thumb{display:block;width:100%;aspect-ratio:16/10;padding:0;border:0;background:#111;cursor:pointer;position:relative}
.motion-card-thumb img{width:100%;height:100%;object-fit:cover}
.motion-card-kind{position:absolute;top:6px;right:6px;font-size:10px;text-transform:uppercase;background:rgba(0,0,0,.65);padding:2px 6px;border-radius:4px}
.motion-card-meta{padding:8px}
.motion-card-label{font-size:12px;line-height:1.3;margin-bottom:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.motion-card-actions{display:flex;gap:6px;margin-top:6px;flex-wrap:wrap}
.motion-compose-list{list-style:none;padding:0;margin:0 0 12px}
.motion-compose-list li{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.06)}
.motion-compose-list img{width:48px;height:32px;object-fit:cover;border-radius:4px}
@media (prefers-reduced-motion:reduce){.motion-kenburns.is-playing{animation:none}}
:root[data-reduce-motion="true"] .motion-kenburns.is-playing{animation:none}
      `}</style>

      <p className="tools-hint" style={{ marginBottom: 16 }}>
        Title GIFs need <code>TENOR_API_KEY</code> or <code>GIPHY_API_KEY</code>.
        Clips: AnimeThemes OP/ED + YouTube trailers. Stills: cover + fanart (
        <code>FANART_API_KEY</code> + TVDB). Sample GIFs work without keys.
      </p>

      <Stage asset={stageAsset} playing={composePlaying || !!preview} />

      <div className="motion-tabs" role="tablist">
        {(
          [
            ["anime", "From anime"],
            ["samples", "Sample GIFs"],
            ["compose", `Compose (${compose.length})`],
            ["url", "Paste URL"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="btn btn-outline btn-sm"
            role="tab"
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {err ? (
        <p className="meta" style={{ color: "var(--danger,#f88)", marginBottom: 12 }}>
          {err}
        </p>
      ) : null}

      {tab === "anime" ? (
        <div>
          <AnimeSearchPicker
            label="Title to gather motion from"
            selected={selectedAnime}
            onSelect={(a) => {
              setSelectedAnime(a);
              setTab("anime");
            }}
          />
          {shelfQuick.length ? (
            <div style={{ marginTop: 12, marginBottom: 12 }}>
              <div className="filter-label">From your shelf</div>
              <div className="daily-actions" style={{ flexWrap: "wrap" }}>
                {shelfQuick.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() =>
                      setSelectedAnime({
                        id: s.id,
                        title: s.title,
                        description: "",
                        genre: "",
                        tags: [],
                        status: "FINISHED",
                        format: "TV",
                        year: "",
                        score: 0,
                        popularity: 0,
                        image: s.image,
                        anilist_id: s.id,
                        episodes: "?",
                        duration: 24,
                      })
                    }
                  >
                    {s.title.length > 28 ? s.title.slice(0, 26) + "…" : s.title}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {busy ? <p className="meta">Gathering GIFs, themes & art…</p> : null}
          {notes.length ? (
            <p className="meta" style={{ marginBottom: 8 }}>
              {notes.join(" · ")}
            </p>
          ) : null}
          <AssetGrid
            list={animeAssets}
            empty={
              selectedAnime
                ? "No assets yet — add TENOR_API_KEY for GIFs, or try Sample GIFs."
                : "Search a title or pick from your shelf."
            }
          />
        </div>
      ) : null}

      {tab === "samples" ? (
        <div>
          <button
            type="button"
            className="btn btn-accent"
            disabled={busy}
            onClick={() => void loadSamples()}
            style={{ marginBottom: 12 }}
          >
            {busy ? "Loading…" : "Load sample GIFs"}
          </button>
          <AssetGrid list={samples} empty="Press Load sample GIFs (waifu.pics SFW)." />
        </div>
      ) : null}

      {tab === "compose" ? (
        <div>
          {!compose.length ? (
            <p className="meta">
              Add assets with <strong>+ Compose</strong>.
            </p>
          ) : (
            <>
              <div className="daily-actions" style={{ marginBottom: 12 }}>
                <button
                  type="button"
                  className="btn btn-accent"
                  onClick={() => {
                    setComposeIndex(0);
                    setComposePlaying(true);
                  }}
                >
                  Play composition
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setComposePlaying(false)}
                >
                  Stop
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => persistCompose([])}
                >
                  Clear
                </button>
              </div>
              <ol className="motion-compose-list">
                {compose.map((item, i) => (
                  <li key={item.id}>
                    {assetThumb(item) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={assetThumb(item)} alt="" />
                    ) : (
                      <span className="meta">▶</span>
                    )}
                    <div style={{ flex: 1 }}>
                      <div>{item.label}</div>
                      <div className="meta">
                        {item.kind} · {(item.dwellMs / 1000).toFixed(1)}s
                        {composePlaying && composeIndex === i ? " · now" : ""}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() =>
                        persistCompose(compose.filter((x) => x.id !== item.id))
                      }
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      ) : null}

      {tab === "url" ? (
        <div>
          <div className="picker-row" style={{ display: "flex", gap: 8 }}>
            <input
              className="filter-input"
              style={{ flex: 1 }}
              placeholder="https://… gif, image, or video"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-accent"
              onClick={() => {
                const u = url.trim();
                if (!u) return;
                const kind: MotionAsset["kind"] = /\.(mp4|webm|mov)(\?|$)/i.test(u)
                  ? "video"
                  : /\.gif(\?|$)/i.test(u)
                    ? "gif"
                    : "still";
                const a: MotionAsset = {
                  id: `user-${Date.now()}`,
                  kind,
                  url: u,
                  thumb: kind !== "video" ? u : undefined,
                  label: "Your media",
                  source: "user",
                };
                openAsset(a);
                addToCompose(a);
              }}
            >
              Preview & add
            </button>
          </div>
          {recent.length ? (
            <div style={{ marginTop: 16 }}>
              <div className="filter-label">Recent URLs</div>
              <ul className="meta">
                {recent.map((u) => (
                  <li key={u}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ marginRight: 8 }}
                      onClick={() =>
                        openAsset({
                          id: `recent-${u}`,
                          kind: /\.gif/i.test(u)
                            ? "gif"
                            : /\.(mp4|webm)/i.test(u)
                              ? "video"
                              : "still",
                          url: u,
                          label: "Recent",
                          source: "user",
                        })
                      }
                    >
                      Open
                    </button>
                    <span style={{ wordBreak: "break-all" }}>{u}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      <p className="meta" style={{ marginTop: 24 }}>
        <Link href="/tools">Back to tools</Link>
      </p>
    </div>
  );
}
