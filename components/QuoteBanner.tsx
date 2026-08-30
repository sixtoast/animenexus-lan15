"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { Button } from "@/components/ui/Button";

type Quote = { quote: string; character?: string; anime?: string };

const CYCLE_MS = 14000;

const FALLBACKS: Quote[] = [
  {
    quote: "Whatever you lose, you’ll find it again.",
    character: "Haku",
    anime: "Spirited Away",
  },
  {
    quote: "It’s not the face that makes someone a monster.",
    character: "The Cat",
    anime: "Howl’s Moving Castle",
  },
  {
    quote: "If you don’t take risks, you can’t create a future.",
    character: "Monkey D. Luffy",
    anime: "One Piece",
  },
  {
    quote: "A lesson without pain is meaningless.",
    character: "Edward Elric",
    anime: "Fullmetal Alchemist",
  },
  {
    quote:
      "The world isn’t perfect. But it’s there for us, doing the best it can.",
    character: "Okabe Rintarou",
    anime: "Steins;Gate",
  },
];

function asName(v: unknown): string | undefined {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (v && typeof v === "object" && "name" in v) {
    const n = (v as { name?: unknown }).name;
    if (typeof n === "string" && n.trim()) return n.trim();
  }
  return undefined;
}

function parseQuotePayload(data: unknown): Quote | null {
  if (!data || typeof data !== "object") return null;
  const root = data as Record<string, unknown>;
  const nested =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root;

  const qRaw =
    nested.quote ?? nested.content ?? root.quote ?? root.content;
  if (typeof qRaw !== "string" || !qRaw.trim()) return null;

  const character =
    asName(nested.character) ||
    asName(root.character) ||
    asName(nested.characterName);
  const anime =
    asName(nested.anime) ||
    asName(root.anime) ||
    asName(nested.animeName);

  return {
    quote: qRaw.trim(),
    character,
    anime,
  };
}

async function fetchQuoteChain(): Promise<Quote> {
  const endpoints = [
    "https://api.animechan.io/v1/quotes/random",
    "https://animechan.xyz/api/random",
  ];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
      if (!res.ok) continue;
      const data = await res.json();
      const parsed = parseQuotePayload(data);
      if (parsed) return parsed;
    } catch {
      /* try next */
    }
  }
  return FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
}

export function QuoteBanner() {
  const [q, setQ] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [fade, setFade] = useState(false);
  const { showToast } = useToast();

  const accumulated = useRef(0);
  const lastTs = useRef<number | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const load = useCallback(async () => {
    setBusy(true);
    setFade(true);
    try {
      const next = await fetchQuoteChain();
      setQ(next);
    } finally {
      setBusy(false);
      window.setTimeout(() => setFade(false), 40);
      accumulated.current = 0;
      setProgress(0);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let raf = 0;
    const tick = (ts: number) => {
      if (lastTs.current == null) lastTs.current = ts;
      const dt = ts - lastTs.current;
      lastTs.current = ts;
      if (!pausedRef.current) {
        accumulated.current += dt;
        const p = Math.min(1, accumulated.current / CYCLE_MS);
        setProgress(p);
        if (p >= 1) {
          accumulated.current = 0;
          void load();
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [load]);

  const pct = Math.round(progress * 100);
  const secsLeft = Math.max(0, Math.ceil((1 - progress) * (CYCLE_MS / 1000)));

  function copy() {
    if (!q) return;
    const line =
      q.character || q.anime
        ? `“${q.quote}” — ${q.character || "Unknown"}${q.anime ? ` (${q.anime})` : ""}`
        : `“${q.quote}”`;
    void navigator.clipboard.writeText(line).then(() => {
      showToast("Quote copied", "📖");
    });
  }

  return (
    <div
      className={"quote-banner" + (paused ? " is-paused" : "")}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="quote-signal-row">
        <span className="quote-kicker">
          <span className="quote-live-dot" aria-hidden />
          Signal quote
        </span>
        <span className="quote-timer-label" aria-live="polite">
          {paused ? "Paused" : `${secsLeft}s`}
        </span>
      </div>

      <div className="quote-top">
        <p className={"quote-text" + (fade ? " is-fading" : "")}>
          <span className="quote-mark">“</span>
          {q ? q.quote : busy ? "Tuning the desk…" : "…"}
          <span className="quote-mark">”</span>
        </p>
        <div className="quote-actions">
          <Button
            variant="icon"
            size="sm"
            title="Next quote"
            aria-label="Next quote"
            onClick={() => load()}
            loading={busy}
            disabled={busy}
          >
            ↻
          </Button>
          <Button
            variant="icon"
            size="sm"
            title="Copy"
            aria-label="Copy quote"
            onClick={copy}
            disabled={!q}
          >
            ⎘
          </Button>
        </div>
      </div>

      {q ? (
        <p className="quote-source">
          <span className="quote-character">
            {q.character || "Unknown speaker"}
          </span>
          {q.anime ? (
            <>
              <span className="quote-source-sep" aria-hidden>
                {" · "}
              </span>
              <span className="quote-anime">{q.anime}</span>
            </>
          ) : null}
        </p>
      ) : null}

      <div
        className="quote-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label="Time until next quote"
      >
        <div
          className="quote-progress-fill"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
    </div>
  );
}
