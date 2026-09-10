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
import { caseInsensitiveIncludes, didYouMean } from "@/lib/did-you-mean";

const NAV = [
  { href: "/", label: "Home", group: "Navigate", hint: "Signal" },
  { href: "/browse", label: "Full catalog", group: "Navigate", hint: "Filters" },
  { href: "/seasonal", label: "Seasonal", group: "Navigate", hint: "Season" },
  { href: "/airing", label: "Airing", group: "Navigate", hint: "On air" },
  { href: "/daily", label: "Daily pick", group: "Navigate", hint: "Ritual" },
  { href: "/watchlist", label: "Watchlist", group: "Navigate", hint: "Shelf" },
  { href: "/taste", label: "Taste", group: "Navigate", hint: "You" },
  { href: "/journey", label: "Journey", group: "Navigate", hint: "Archive" },
  { href: "/tools", label: "Tools hub", group: "Tools", hint: "Desk" },
  { href: "/tools/fusion", label: "Fusion", group: "Tools", hint: "Blend" },
  { href: "/tools/oracle", label: "Night Desk", group: "Tools", hint: "Oracle" },
  { href: "/tools/challenge", label: "Challenge", group: "Tools", hint: "Dare" },
  { href: "/tools/sauce", label: "Sauce", group: "Tools", hint: "Trace" },
  { href: "/tools/radar", label: "Radar", group: "Tools", hint: "Scan" },
  { href: "/account", label: "Account", group: "Navigate", hint: "Identity" },
  { href: "/mood", label: "Moods", group: "Tonight", hint: "Intent" },
  { href: "/mood/comfort", label: "Comfort me", group: "Tonight", hint: "Soft" },
  { href: "/mood/destroy", label: "Destroy me", group: "Tonight", hint: "Heavy" },
  { href: "/mood/think", label: "Make me think", group: "Tonight", hint: "Dense" },
  { href: "/mood/laugh", label: "Make me laugh", group: "Tonight", hint: "Light" },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Anime[]>([]);
  const [searching, setSearching] = useState(false);
  const [parsedSummary, setParsedSummary] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const t = e.target as HTMLElement | null;
        if (
          t &&
          (t.tagName === "INPUT" ||
            t.tagName === "TEXTAREA" ||
            t.isContentEditable)
        )
          return;
        e.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("animenexus:open-search", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("animenexus:open-search", onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setQ("");
      setHits([]);
      setParsedSummary(null);
      setSuggestions([]);
    }
  }, [open]);

  useEffect(() => {
    const raw = q.trim();
    if (raw.length < 2) {
      setHits([]);
      setParsedSummary(null);
      setSuggestions([]);
      return;
    }
    const intent = parseIntentSearch(raw);
    setParsedSummary(intent.isIntentQuery ? intent.summary : null);
    let cancelled = false;
    const t = setTimeout(() => {
      setSearching(true);
      fetch(`/api/search?q=${encodeURIComponent(raw)}&perPage=8`)
        .then((r) => r.json())
        .then((j) => {
          if (cancelled) return;
          const data = (j.data || []) as Anime[];
          setHits(data);
          setSuggestions(
            data.length === 0
              ? didYouMean(raw, {
                  limit: 4,
                  extraTitles: NAV.map((n) => n.label),
                })
              : [],
          );
        })
        .catch(() => {
          if (!cancelled) {
            setHits([]);
            setSuggestions(didYouMean(raw, { limit: 4 }));
          }
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  const nav = useMemo(() => {
    const needle = q.trim();
    if (!needle) {
      return NAV.filter(
        (n) => n.group === "Navigate" || n.group === "Tonight",
      ).slice(0, 10);
    }
    return NAV.filter(
      (n) =>
        caseInsensitiveIncludes(n.label, needle) ||
        caseInsensitiveIncludes(n.group, needle) ||
        caseInsensitiveIncludes(n.hint || "", needle),
    );
  }, [q]);

  const intent = useMemo(
    () => (q.trim().length >= 3 ? parseIntentSearch(q.trim()) : null),
    [q],
  );

  function go(href: string) {
    const moodMatch = href.match(/\/mood\/([^/?#]+)/);
    if (moodMatch) {
      writeIntentSession({ slug: moodMatch[1] });
      playCue("filter_select");
    }
    setOpen(false);
    withViewTransition(() => router.push(href));
  }

  const showQuick = q.trim().length < 2;

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      label="Search and jump"
      variant="center"
      size="lg"
      hideClose
      panelClassName="nx-modal-cmdk cmdk-box cmdk-box--omni"
    >
      <div className="cmdk-input-row">
        <span className="cmdk-search-icon" aria-hidden>
          \u2315
        </span>
        <input
          data-autofocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search anime, moods, or jump anywhere\u2026"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Search"
        />
        <span className="cmdk-esc">esc</span>
      </div>

      {parsedSummary ? (
        <p className="cmdk-intent-hint" role="status">
          Understood as \u00b7 {parsedSummary}
        </p>
      ) : null}

      <div className="cmdk-results">
        {showQuick ? (
          <>
            <div className="cmdk-section-label">Quick access</div>
            <div className="cmdk-quick-grid">
              {NAV.filter(
                (n) =>
                  n.group === "Navigate" ||
                  n.group === "Tonight" ||
                  n.href === "/tools",
              )
                .slice(0, 8)
                .map((n) => (
                  <button
                    key={n.href + n.label}
                    type="button"
                    className="cmdk-quick"
                    onClick={() => go(n.href)}
                  >
                    <span className="cmdk-quick-label">{n.label}</span>
                    <span className="cmdk-quick-hint">{n.hint}</span>
                  </button>
                ))}
            </div>
          </>
        ) : null}

        {intent?.isIntentQuery ? (
          <>
            <div className="cmdk-section-label">Intent</div>
            <button
              type="button"
              className="cmdk-item"
              onClick={() => {
                if (intent.experienceSlug) {
                  writeIntentSession({ slug: intent.experienceSlug ?? null });
                }
                playCue("filter_select");
                go(`/browse?q=${encodeURIComponent(q.trim())}`);
              }}
            >
              Browse as \u201c{q.trim()}\u201d
              <span className="cmdk-item-meta">catalog + shelf</span>
            </button>
            {intent.experienceSlug ? (
              <button
                type="button"
                className="cmdk-item"
                onClick={() => {
                  writeIntentSession({ slug: intent.experienceSlug ?? null });
                  playCue("filter_select");
                  const qs = sessionToSearchParams({
                    ...readIntentSession(),
                    slug: intent.experienceSlug ?? null,
                  }).toString();
                  go(`/browse?${qs}`);
                }}
              >
                Open intent \u00b7 {intent.experienceSlug}
                <span className="cmdk-item-meta">Tonight + dials</span>
              </button>
            ) : null}
          </>
        ) : null}

        {(hits.length > 0 || searching) && q.trim().length >= 2 ? (
          <>
            <div className="cmdk-section-label">
              Anime {searching ? "\u00b7 searching\u2026" : `\u00b7 ${hits.length}`}
            </div>
            {hits.map((a) => (
              <button
                key={a.id}
                type="button"
                className="cmdk-item cmdk-item--media"
                onClick={() => go(`/anime/${a.id}`)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="cmdk-thumb"
                  src={
                    a.image
                      ? `/api/cover?url=${encodeURIComponent(a.image)}`
                      : "/icon.svg"
                  }
                  alt=""
                  width={40}
                  height={56}
                  loading="lazy"
                />
                <span className="cmdk-item-body">
                  <span className="cmdk-item-title">{a.title}</span>
                  <span className="cmdk-item-meta">
                    {[a.year, a.format, a.score ? `\u2605 ${a.score}` : null]
                      .filter(Boolean)
                      .join(" \u00b7 ")}
                  </span>
                </span>
              </button>
            ))}
          </>
        ) : null}

        {!searching &&
        q.trim().length >= 2 &&
        hits.length === 0 &&
        suggestions.length > 0 ? (
          <>
            <div className="cmdk-section-label">Did you mean</div>
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                className="cmdk-item cmdk-item--suggest"
                onClick={() => {
                  setQ(s);
                  playCue("filter_select");
                }}
              >
                {s}
                <span className="cmdk-item-meta">Search this instead</span>
              </button>
            ))}
          </>
        ) : null}

        {!searching && q.trim().length >= 2 && hits.length === 0 ? (
          <p className="cmdk-empty">
            No titles matched \u201c{q.trim()}\u201d. Try another spelling or a mood word.
          </p>
        ) : null}

        {nav.length > 0 && q.trim().length >= 1 ? (
          <>
            <div className="cmdk-section-label">Jump</div>
            {nav.slice(0, 8).map((n) => (
              <button
                key={n.href + n.label}
                type="button"
                className="cmdk-item"
                onClick={() => go(n.href)}
              >
                {n.label}
                <span className="cmdk-item-meta">{n.hint || n.group}</span>
              </button>
            ))}
          </>
        ) : null}
      </div>

      <p className="cmdk-foot">
        <kbd>/</kbd> or <kbd>\u2318K</kbd> \u00b7 previews as you type \u00b7 not case-sensitive
      </p>
    </Modal>
  );
}

export function openOmniSearch() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("animenexus:open-search"));
  }
}
