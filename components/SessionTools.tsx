"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useWatchlist } from "@/components/WatchlistProvider";
import {
  buildTonightFromList,
  readTonightQueue,
  writeTonightQueue,
  type TonightItem,
} from "@/lib/tonight";
import { useToast } from "@/components/ToastProvider";

type Panel = "tonight" | "break" | "flashback" | null;

function setSessionEnv(mode: "tonight" | "break" | "idle") {
  if (typeof document === "undefined") return;
  if (mode === "idle") delete document.documentElement.dataset.session;
  else document.documentElement.dataset.session = mode;
}

export function SessionTools() {
  const { entries } = useWatchlist();
  const { showToast } = useToast();
  const [panel, setPanel] = useState<Panel>(null);
  const [queue, setQueue] = useState<TonightItem[]>([]);
  const [breakLeft, setBreakLeft] = useState(0);
  const [breakRunning, setBreakRunning] = useState(false);
  const [flash, setFlash] = useState<TonightItem | null>(null);

  const closePanel = useCallback(() => {
    setPanel(null);
    if (!breakRunning) setSessionEnv("idle");
  }, [breakRunning]);

  const openTonight = useCallback(() => {
    let q = readTonightQueue();
    if (!q.length) {
      q = buildTonightFromList(entries);
      writeTonightQueue(q);
    }
    setQueue(q);
    setPanel("tonight");
    setSessionEnv("tonight");
  }, [entries]);

  useEffect(() => {
    const onTonight = () => openTonight();
    const onBreak = () => {
      setPanel("break");
      setSessionEnv("break");
    };
    const onFlash = () => {
      const pool = entries.filter(
        (e) => e.watchStatus === "completed" || e.watchStatus === "watching",
      );
      if (!pool.length) {
        showToast("No completed/watching titles yet", "📼");
        return;
      }
      const pick = pool[Math.floor(Math.random() * pool.length)];
      setFlash({
        id: pick.id,
        title: pick.title,
        image: pick.image,
      });
      setPanel("flashback");
    };
    window.addEventListener("animenexus:tonight", onTonight);
    window.addEventListener("animenexus:break", onBreak);
    window.addEventListener("animenexus:flashback", onFlash);
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "q") {
        e.preventDefault();
        openTonight();
      } else if (k === "b") {
        e.preventDefault();
        setPanel("break");
        setSessionEnv("break");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("animenexus:tonight", onTonight);
      window.removeEventListener("animenexus:break", onBreak);
      window.removeEventListener("animenexus:flashback", onFlash);
      window.removeEventListener("keydown", onKey);
    };
  }, [openTonight, entries, showToast]);

  useEffect(() => {
    if (!breakRunning || breakLeft <= 0) return;
    const t = setInterval(() => {
      setBreakLeft((s) => {
        if (s <= 1) {
          setBreakRunning(false);
          setSessionEnv("idle");
          showToast("Break over — back to the signal", "⏰");
          try {
            navigator.vibrate?.(200);
          } catch {
            /* ignore */
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [breakRunning, breakLeft, showToast]);

  function startBreak(mins: number) {
    setBreakLeft(mins * 60);
    setBreakRunning(true);
    setPanel(null);
    setSessionEnv("break");
    showToast(`${mins} min break started`, "☕");
  }

  function rebuildQueue() {
    const q = buildTonightFromList(entries);
    writeTonightQueue(q);
    setQueue(q);
  }

  function clearQueue() {
    writeTonightQueue([]);
    setQueue([]);
  }

  return (
    <>
      {breakRunning && breakLeft > 0 ? (
        <div className="break-dock" title="Break timer">
          ☕ {Math.floor(breakLeft / 60)}:
          {String(breakLeft % 60).padStart(2, "0")}
          <button
            type="button"
            onClick={() => {
              setBreakRunning(false);
              setBreakLeft(0);
              setSessionEnv("idle");
            }}
          >
            ×
          </button>
        </div>
      ) : null}

      {panel === "tonight" ? (
        <div
          className="session-overlay open"
          onClick={(e) => {
            if (e.target === e.currentTarget) closePanel();
          }}
        >
          <div className="session-panel">
            <div className="session-head">
              <h3>Tonight queue</h3>
              <button type="button" onClick={closePanel}>
                ×
              </button>
            </div>
            <p className="tools-hint">
              Watching first, then planning. Cap 6. Shortcut <kbd>Q</kbd>.
            </p>
            <div className="daily-actions" style={{ marginBottom: 12 }}>
              <button
                type="button"
                className="btn btn-accent btn-sm"
                onClick={rebuildQueue}
              >
                Rebuild
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={clearQueue}
              >
                Clear
              </button>
            </div>
            {queue.length === 0 ? (
              <p className="tools-hint">Empty — add watching/planning titles.</p>
            ) : (
              <div className="tonight-list">
                {queue.map((item) => (
                  <Link
                    key={item.id}
                    href={`/anime/${item.id}`}
                    className="tonight-row"
                    onClick={closePanel}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.image} alt="" />
                    <span>{item.title}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {panel === "break" ? (
        <div
          className="session-overlay open"
          onClick={(e) => {
            if (e.target === e.currentTarget) closePanel();
          }}
        >
          <div className="session-panel">
            <div className="session-head">
              <h3>Break timer</h3>
              <button type="button" onClick={closePanel}>
                ×
              </button>
            </div>
            <p className="tools-hint">
              Shortcut <kbd>B</kbd>. Room dims while you rest.
            </p>
            <div className="daily-actions">
              {[5, 10, 15].map((m) => (
                <button
                  key={m}
                  type="button"
                  className="btn btn-accent btn-sm"
                  onClick={() => startBreak(m)}
                >
                  {m} min
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {panel === "flashback" && flash ? (
        <div
          className="session-overlay open"
          onClick={(e) => {
            if (e.target === e.currentTarget) closePanel();
          }}
        >
          <div className="session-panel">
            <div className="session-head">
              <h3>Flashback</h3>
              <button type="button" onClick={closePanel}>
                ×
              </button>
            </div>
            <div className="flashback-body">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={flash.image} alt="" />
              <p className="tools-hint">A title from your path:</p>
              <h4>{flash.title}</h4>
              <p className="tools-hint">
                What still sticks with you from this one?
              </p>
              <div className="daily-actions">
                <Link
                  href={`/anime/${flash.id}`}
                  className="btn btn-accent btn-sm"
                  onClick={closePanel}
                >
                  Open detail
                </Link>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    const pool = entries.filter(
                      (e) =>
                        e.watchStatus === "completed" ||
                        e.watchStatus === "watching",
                    );
                    if (!pool.length) return;
                    const pick =
                      pool[Math.floor(Math.random() * pool.length)];
                    setFlash({
                      id: pick.id,
                      title: pick.title,
                      image: pick.image,
                    });
                  }}
                >
                  Another
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
