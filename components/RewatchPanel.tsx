"use client";

import { useCallback, useEffect, useState } from "react";
import {
  activeRewatchFor,
  endRewatch,
  listRewatchSessions,
  rewatchCountFor,
  startRewatch,
  updateRewatch,
  type RewatchSession,
} from "@/lib/rewatch-sessions";

type Props = {
  animeId: number;
  title: string;
  image?: string;
};

export function RewatchPanel({ animeId, title, image }: Props) {
  const [active, setActive] = useState<RewatchSession | null>(null);
  const [history, setHistory] = useState<RewatchSession[]>([]);
  const [count, setCount] = useState(0);
  const [ep, setEp] = useState("");

  const refresh = useCallback(() => {
    setActive(activeRewatchFor(animeId) || null);
    setHistory(
      listRewatchSessions().filter((s) => s.animeId === animeId).slice(0, 8),
    );
    setCount(rewatchCountFor(animeId));
  }, [animeId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function onStart() {
    const n = parseInt(ep, 10);
    startRewatch({
      animeId,
      title,
      image,
      episode: Number.isFinite(n) ? n : undefined,
    });
    refresh();
  }

  function onSaveEp() {
    if (!active) return;
    const n = parseInt(ep, 10);
    if (!Number.isFinite(n)) return;
    updateRewatch(active.id, { episode: n });
    refresh();
  }

  function onEnd() {
    if (!active) return;
    const n = parseInt(ep, 10);
    endRewatch(active.id, Number.isFinite(n) ? n : active.episode);
    setEp("");
    refresh();
  }

  return (
    <section className="detail-section" aria-labelledby="rewatch-heading">
      <h2 id="rewatch-heading">Rewatch</h2>
      <p className="tools-hint" style={{ marginBottom: 12 }}>
        Local pass tracker for this title. Simkl sync can attach later — your
        shelf stays the source of truth here.
        {count > 0 ? ` · ${count} session(s) recorded` : ""}
      </p>

      {active ? (
        <div
          style={{
            padding: 12,
            borderRadius: 10,
            border: "1px solid var(--color-border, rgba(128,128,128,0.25))",
            marginBottom: 12,
          }}
        >
          <p style={{ margin: "0 0 8px", fontSize: 14 }}>
            <strong>Active pass</strong> since{" "}
            {new Date(active.startedAt).toLocaleString()}
            {active.episode != null ? ` · ep ${active.episode}` : ""}
          </p>
          <div className="account-row" style={{ gap: 8, flexWrap: "wrap" }}>
            <input
              className="filter-input"
              style={{ maxWidth: 100 }}
              placeholder="Ep #"
              value={ep}
              onChange={(e) => setEp(e.target.value)}
              inputMode="numeric"
            />
            <button type="button" className="btn btn-outline btn-sm" onClick={onSaveEp}>
              Update episode
            </button>
            <button type="button" className="btn btn-accent btn-sm" onClick={onEnd}>
              End rewatch
            </button>
          </div>
        </div>
      ) : (
        <div className="account-row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <input
            className="filter-input"
            style={{ maxWidth: 100 }}
            placeholder="Start ep"
            value={ep}
            onChange={(e) => setEp(e.target.value)}
            inputMode="numeric"
          />
          <button type="button" className="btn btn-accent btn-sm" onClick={onStart}>
            Start rewatch
          </button>
        </div>
      )}

      {history.length > 0 ? (
        <ul className="theme-ul">
          {history.map((s) => (
            <li key={s.id}>
              {new Date(s.startedAt).toLocaleDateString()}
              {s.endedAt
                ? ` → ${new Date(s.endedAt).toLocaleDateString()}`
                : " · active"}
              {s.episode != null ? ` · ep ${s.episode}` : ""}
              <span className="tools-hint"> · {s.source}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
