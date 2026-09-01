"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Anime } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";
import { parseIntentSearch } from "@/lib/intent-search";
import { readIntentSession, writeIntentSession } from "@/lib/intent-session";
import { sessionToSearchParams } from "@/lib/session-url";
import { playCue } from "@/lib/sound-engine";

const NAV = [
  { href: "/", label: "Home", group: "Navigate" },
  { href: "/browse", label: "Browse", group: "Navigate" },
  { href: "/seasonal", label: "Seasonal", group: "Navigate" },
  { href: "/airing", label: "Airing", group: "Navigate" },
  { href: "/daily", label: "Daily pick", group: "Navigate" },
  { href: "/watchlist", label: "Watchlist", group: "Navigate" },
  { href: "/taste", label: "Taste", group: "Navigate" },
  { href: "/tools", label: "Tools hub", group: "Navigate" },
  { href: "/tools/fusion", label: "Fusion", group: "Tools" },
  { href: "/tools/oracle", label: "Night Desk", group: "Tools" },
  { href: "/tools/challenge", label: "Challenge", group: "Tools" },
  { href: "/tools/sauce", label: "Sauce", group: "Tools" },
  { href: "/tools/radar", label: "Radar", group: "Tools" },
  { href: "/tools/completionist", label: "Completionist", group: "Tools" },
  { href: "/account", label: "Account / AniList", group: "Navigate" },
  { href: "/mood/comfort", label: "Intent · Comfort me", group: "Tonight" },
  { href: "/mood/destroy", label: "Intent · Destroy me", group: "Tonight" },
  { href: "/mood/think", label: "Intent · Make me think", group: "Tonight" },
  { href: "/mood/laugh", label: "Intent · Make me laugh", group: "Tonight" },
];

const DIAL_ACTIONS: {
  label: string;
  meta: string;
  partial: Parameters<typeof writeIntentSession>[0];
}[] = [
  { label: "Intensity · light", meta: "Dials", partial: { intensity: "light" } },
  {
    label: "Intensity · moderate",
    meta: "Dials",
    partial: { intensity: "moderate" },
  },
  {
    label: "Intensity · maximum",
    meta: "Dials",
    partial: { intensity: "maximum" },
  },
  { label: "Energy · low", meta: "Dials", partial: { energy: "low" } },
  { label: "Energy · medium", meta: "Dials", partial: { energy: "medium" } },
  { label: "Energy · high", meta: "Dials", partial: { energy: "high" } },
  {
    label: "Time · 20 minutes",
    meta: "Dials",
    partial: { minutesAvailable: 20 },
  },
  {
    label: "Time · 30 minutes",
    meta: "Dials",
    partial: { minutesAvailable: 30 },
  },
  {
    label: "Time · 45 minutes",
    meta: "Dials",
    partial: { minutesAvailable: 45 },
  },
  {
    label: "Clear session dials",
    meta: "Dials",
    partial: {
      slug: null,
      intensity: "moderate",
      energy: "medium",
      minutesAvailable: null,
    },
  },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Anime[]>([]);
  const [searching, setSearching] = useState(false);
  const [parsedSummary, setParsedSummary] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) {
      setQ("");
      setHits([]);
      setParsedSummary(null);
    }
  }, [open]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      setParsedSummary(null);
      return;
    }
    const intent = parseIntentSearch(q.trim());
    setParsedSummary(intent.isIntentQuery ? intent.summary : null);
    let cancelled = false;
    const t = setTimeout(() => {
      setSearching(true);
      fetch(`/api/search?q=${encodeURIComponent(q.trim())}&perPage=6`)
        .then((r) => r.json())
        .then((j) => {
          if (!cancelled) setHits((j.data || []) as Anime[]);
        })
        .catch(() => {
          if (!cancelled) setHits([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  const nav = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return NAV;
    return NAV.filter(
      (n) =>
        n.label.toLowerCase().includes(needle) ||
        n.group.toLowerCase().includes(needle),
    );
  }, [q]);

  const intent = useMemo(
    () => (q.trim().length >= 3 ? parseIntentSearch(q.trim()) : null),
    [q],
  );

  const dialHits = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return DIAL_ACTIONS.slice(0, 4);
    return DIAL_ACTIONS.filter((d) => d.label.toLowerCase().includes(needle));
  }, [q]);

  function go(href: string) {
    const moodMatch = href.match(/\/mood\/([^/?#]+)/);
    if (moodMatch) {
      writeIntentSession({ slug: moodMatch[1] });
      playCue("filter_select");
    }
    const expMatch = href.match(/[?&]experience=([^&]+)/);
    if (expMatch) {
      writeIntentSession({ slug: decodeURIComponent(expMatch[1]) });
      playCue("filter_select");
    }
    setOpen(false);
    router.push(href);
  }

  function applyDial(partial: Parameters<typeof writeIntentSession>[0]) {
    writeIntentSession(partial);
    playCue("filter_select");
    setOpen(false);
    router.push("/");
  }

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      label="Command palette"
      variant="center"
      size="md"
      hideClose
      panelClassName="nx-modal-cmdk cmdk-box"
    >
      <div className="cmdk-input-row">
        <span aria-hidden>⌘</span>
        <input
          data-autofocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search anime, intent, or jump…"
        />
        <span className="cmdk-esc">esc</span>
      </div>
      {parsedSummary ? (
        <p className="cmdk-intent-hint" role="status">
          Understood as · {parsedSummary}
        </p>
      ) : null}
      <div className="cmdk-results">
        {intent?.isIntentQuery ? (
          <>
            <div className="cmdk-section-label">Intent</div>
            <button
              type="button"
              className="cmdk-item"
              onClick={() => {
                if (intent.experienceSlug) {
                  writeIntentSession({ slug: intent.experienceSlug });
                }
                playCue("filter_select");
                go(`/browse?q=${encodeURIComponent(q.trim())}`);
              }}
            >
              Browse as “{q.trim()}”
              <span className="cmdk-item-meta">catalog + shelf blend</span>
            </button>
            {intent.experienceSlug ? (
              <button
                type="button"
                className="cmdk-item"
                onClick={() => {
                  writeIntentSession({ slug: intent.experienceSlug });
                  playCue("filter_select");
                  const qs = sessionToSearchParams({
                    ...readIntentSession(),
                    slug: intent.experienceSlug,
                  }).toString();
                  go(`/browse?${qs}`);
                }}
              >
                Open intent · {intent.experienceSlug}
                <span className="cmdk-item-meta">Tonight + dials</span>
              </button>
            ) : null}
          </>
        ) : null}
        {dialHits.length > 0 ? (
          <>
            <div className="cmdk-section-label">Session dials</div>
            {dialHits.map((d) => (
              <button
                key={d.label}
                type="button"
                className="cmdk-item"
                onClick={() => applyDial(d.partial)}
              >
                {d.label}
                <span className="cmdk-item-meta">{d.meta}</span>
              </button>
            ))}
          </>
        ) : null}
        {nav.length > 0 ? (
          <>
            <div className="cmdk-section-label">Navigate</div>
            {nav.map((n) => (
              <button
                key={n.href + n.label}
                type="button"
                className="cmdk-item"
                onClick={() => go(n.href)}
              >
                {n.label}
                <span className="cmdk-item-meta">{n.group}</span>
              </button>
            ))}
          </>
        ) : null}
        {q.trim().length >= 2 ? (
          <>
            <div className="cmdk-section-label">
              Catalog {searching ? "…" : ""}
            </div>
            {hits.map((a) => (
              <button
                key={a.id}
                type="button"
                className="cmdk-item"
                onClick={() => go(`/anime/${a.id}`)}
              >
                {a.title}
                <span className="cmdk-item-meta">
                  {a.year || a.format || "title"}
                </span>
              </button>
            ))}
            {!searching && hits.length === 0 ? (
              <p className="cmdk-empty">No titles matched.</p>
            ) : null}
          </>
        ) : null}
      </div>
    </Modal>
  );
}
