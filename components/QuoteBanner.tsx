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
      const q =
        data?.quote ||
        data?.content ||
        data?.data?.content ||
        data?.data?.quote;
      const character =
        data?.character?.name || data?.character || data?.data?.character;
      const anime = data?.anime?.name || data?.anime || data?.data?.anime;
      if (typeof q === "string" && q.trim()) {
        return {
          quote: q.trim(),
          character: typeof character === "string" ? character : undefined,
          anime: typeof anime === "string" ? anime : undefined,
        };
      }
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
  const segmentStart = useRef(Date.now());
  const pausedRef = useRef(false);
  const reduceMotion = useRef(false);

  useEffect(() => {
    reduceMotion.current =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const resetTimer = () => {
    accumulated.current = 0;
    segmentStart.current = Date.now();
    setProgress(0);
  };

  const load = useCallback(async (opts?: { soft?: boolean }) => {
    if (!opts?.soft) setBusy(true);
    setFade(true);
    try {
      const next = await fetchQuoteChain();
      await new Promise((r) => setTimeout(r, reduceMotion.current ? 0 : 160));
      setQ(next);
      resetTimer();
    } finally {
      setFade(false);
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!q || busy) return;

    let raf = 0;
    const tick = () => {
      if (!pausedRef.current) {
        const elapsed =
          accumulated.current + (Date.now() - segmentStart.current);
        const p = Math.min(1, elapsed / CYCLE_MS);
        setProgress(p);
        if (p >= 1) {
          load({ soft: true });
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [q, busy, load]);

  function setPause(next: boolean) {
    if (next === pausedRef.current) return;
    if (next) {
      accumulated.current += Date.now() - segmentStart.current;
      pausedRef.current = true;
      setPaused(true);
    } else {
      segmentStart.current = Date.now();
      pausedRef.current = false;
      setPaused(false);
    }
  }

  async function copy() {
    if (!q) return;
    const line = q.character
      ? `“${q.quote}” — ${q.character}${q.anime ? ` (${q.anime})` : ""}`
      : `“${q.quote}”`;
    try {
      await navigator.clipboard.writeText(line);
      showToast("Quote copied", "📖");
    } catch {
      showToast("Could not copy", "😅");
    }
  }

  const pct = Math.round(progress * 100);
  const secsLeft = Math.max(0, Math.ceil((1 - progress) * (CYCLE_MS / 1000)));

  return (
    <div
      className={"quote-banner" + (paused ? " is-paused" : "")}
      onMouseEnter={() => setPause(true)}
      onMouseLeave={() => setPause(false)}
      onFocusCapture={() => setPause(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setPause(false);
        }
      }}
    >
      <div className="quote-signal-row">
        <span className="quote-kicker">
          <span className="quote-live-dot" aria-hidden />
          Signal quote
        </span>
        <span className="quote-timer-label" aria-live="polite">
          {paused ? "Paused" : busy ? "Tuning…" : `${secsLeft}s`}
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

      {q?.character || q?.anime ? (
        <p className="quote-source">
          — {q.character}
          {q.anime ? ` · ${q.anime}` : ""}
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
