"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Anime } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";

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
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Anime[]>([]);
  const [searching, setSearching] = useState(false);

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
    }
  }, [open]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
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
    return NAV.filter((n) => n.label.toLowerCase().includes(needle));
  }, [q]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
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
          placeholder="Search anime or jump…"
        />
        <span className="cmdk-esc">esc</span>
      </div>
      <div className="cmdk-results">
        {nav.length > 0 ? (
          <>
            <div className="cmdk-section-label">Navigate</div>
            {nav.map((n) => (
              <button
                key={n.href}
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
