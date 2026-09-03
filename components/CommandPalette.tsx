"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Anime } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";
import { parseIntentSearch } from "@/lib/intent-search";
import { readIntentSession, writeIntentSession } from "@/lib/intent-session";
import { sessionToSearchParams } from "@/lib/session-url";
import { playCue } from "@/lib/sound-engine";
import { withViewTransition } from "@/lib/view-transition";

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
];

const DIAL_ACTIONS: {
  id: string;
  label: string;
  partial: Parameters<typeof writeIntentSession>[0];
}[] = [
  { id: "int-light", label: "Intensity · light", partial: { intensity: "light" } },
  {
    id: "int-mod",
    label: "Intensity · moderate",
    partial: { intensity: "moderate" },
  },
  {
    id: "int-max",
    label: "Intensity · maximum",
    partial: { intensity: "maximum" },
  },
  { id: "en-low", label: "Energy · low", partial: { energy: "low" } },
  { id: "en-med", label: "Energy · medium", partial: { energy: "medium" } },
  { id: "en-high", label: "Energy · high", partial: { energy: "high" } },
  {
    id: "min-25",
    label: "Time budget · 25m",
    partial: { minutesAvailable: 25 },
  },
  {
    id: "min-45",
    label: "Time budget · 45m",
    partial: { minutesAvailable: 45 },
  },
  {
    id: "min-90",
    label: "Time budget · 90m",
    partial: { minutesAvailable: 90 },
  },
  {
    id: "min-clear",
    label: "Time budget · clear",
    partial: { minutesAvailable: null },
  },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        setQ("");
        setHits([]);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open || !q.trim()) {
      setHits([]);
      return;
    }
    const parsed = parseIntentSearch(q);
    const term = parsed.filters.search || q.trim();
    if (term.length < 2) {
      setHits([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = window.setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(term)}&perPage=8`)
        .then((r) => r.json())
        .then((j) => {
          if (!cancelled) setHits((j.data || []) as Anime[]);
        })
        .catch(() => {
          if (!cancelled) setHits([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [q, open]);

  const filteredNav = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return NAV;
    return NAV.filter(
      (n) =>
        n.label.toLowerCase().includes(qq) ||
        n.href.toLowerCase().includes(qq) ||
        n.group.toLowerCase().includes(qq),
    );
  }, [q]);

  const dialHits = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return DIAL_ACTIONS.slice(0, 6);
    return DIAL_ACTIONS.filter((d) => d.label.toLowerCase().includes(qq));
  }, [q]);

  const sessionLine = useMemo(() => {
    const s = readIntentSession();
    const bits: string[] = [];
    if (s.slug) bits.push(s.slug);
    if (s.intensity !== "moderate") bits.push(s.intensity);
    if (s.energy !== "medium") bits.push(s.energy);
    if (s.minutesAvailable) bits.push(`${s.minutesAvailable}m`);
    return bits.join(" · ");
  }, [open, q]);

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
    withViewTransition(() => {
      router.push(href);
    });
  }

  function applyDial(partial: Parameters<typeof writeIntentSession>[0]) {
    writeIntentSession(partial);
    playCue("filter_select");
    setOpen(false);
    withViewTransition(() => {
      router.push("/");
    });
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
          className="cmdk-input"
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Jump, search, dial intensity…"
          aria-label="Command palette search"
        />
      </div>
      {sessionLine ? (
        <p className="tools-hint" style={{ margin: "8px 12px 0" }}>
          Session · {sessionLine}
        </p>
      ) : null}
      <div className="cmdk-list" role="listbox">
        {dialHits.length > 0 ? (
          <>
            <p className="cmdk-group">Session dials</p>
            {dialHits.map((d) => (
              <button
                key={d.id}
                type="button"
                className="cmdk-item"
                role="option"
                onClick={() => applyDial(d.partial)}
              >
                {d.label}
              </button>
            ))}
          </>
        ) : null}
        {filteredNav.length > 0 ? (
          <>
            <p className="cmdk-group">Navigate</p>
            {filteredNav.map((n) => (
              <button
                key={n.href + n.label}
                type="button"
                className="cmdk-item"
                role="option"
                onClick={() => go(n.href)}
              >
                <span>{n.label}</span>
                <span className="cmdk-meta">{n.group}</span>
              </button>
            ))}
          </>
        ) : null}
        {q.trim().length >= 2 ? (
          <>
            <p className="cmdk-group">
              Search{loading ? " …" : ""}
            </p>
            {hits.map((a) => (
              <button
                key={a.id}
                type="button"
                className="cmdk-item"
                role="option"
                onClick={() => go(`/anime/${a.id}`)}
              >
                {a.title}
              </button>
            ))}
            {!loading && hits.length === 0 ? (
              <p className="tools-hint" style={{ padding: "8px 12px" }}>
                No titles — try another query
              </p>
            ) : null}
            <button
              type="button"
              className="cmdk-item"
              onClick={() => {
                const params = sessionToSearchParams(readIntentSession());
                const qs = new URLSearchParams(params);
                qs.set("q", q.trim());
                go(`/browse?${qs.toString()}`);
              }}
            >
              Open “{q.trim()}” in browse
            </button>
          </>
        ) : null}
      </div>
    </Modal>
  );
}
