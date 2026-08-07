"use client";

import { useCallback, useState } from "react";
import type { Anime } from "@/lib/types";

type Props = {
  label: string;
  selected: Anime | null;
  onSelect: (anime: Anime | null) => void;
};

export function AnimeSearchPicker({ label, selected, onSelect }: Props) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const search = useCallback(async () => {
    const term = q.trim();
    if (term.length < 2) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(term)}&perPage=8`,
      );
      if (!res.ok) throw new Error(`Search failed (${res.status})`);
      const json = (await res.json()) as { data: Anime[] };
      setResults(json.data || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [q]);

  return (
    <div className="picker">
      <div className="filter-label">{label}</div>
      {selected ? (
        <div className="picker-selected">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={selected.image} alt="" />
          <div>
            <div className="picker-title">{selected.title}</div>
            <div className="picker-meta">
              {selected.format} · {selected.year || "—"} · ★{" "}
              {selected.score > 0 ? selected.score.toFixed(1) : "—"}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              onSelect(null);
              setResults([]);
            }}
          >
            Clear
          </button>
        </div>
      ) : (
        <>
          <div className="picker-row">
            <input
              className="filter-input"
              placeholder="Search title…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  search();
                }
              }}
            />
            <button
              type="button"
              className="btn btn-accent btn-sm"
              onClick={search}
              disabled={loading}
            >
              {loading ? "…" : "Search"}
            </button>
          </div>
          {err ? <p className="picker-err">{err}</p> : null}
          {results.length > 0 ? (
            <ul className="picker-results">
              {results.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    className="picker-result"
                    onClick={() => {
                      onSelect(a);
                      setResults([]);
                      setQ("");
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.image} alt="" />
                    <span>
                      {a.title}
                      <small>
                        {a.format} · {a.year || "—"}
                      </small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </div>
  );
}
