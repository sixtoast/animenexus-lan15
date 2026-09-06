"use client";

import { useEffect, useMemo, useState } from "react";
import { useWatchlist } from "@/components/WatchlistProvider";
import { readBehaviourEvents } from "@/lib/behaviour-events";
import { readMemory } from "@/lib/lantern-memory";

const HIDE_KEY = "anime_nexus_session_quiet_hide";

/**
 * Quiet footer note after a meaningful local session — not a modal.
 */
export function SessionQuietNote() {
  const { entries, ready } = useWatchlist();
  const [show, setShow] = useState(false);

  const note = useMemo(() => {
    if (!ready) return null;
    const since = Date.now() - 45 * 60 * 1000;
    const recent = readBehaviourEvents().filter((e) => {
      const t = e.at ? new Date(e.at).getTime() : 0;
      return t >= since;
    });
    if (recent.length < 4 && entries.length < 1) return null;

    const opens = recent.filter((e) =>
      ["detail_open", "rec_open", "search"].includes(e.kind),
    ).length;
    const seals = recent.filter((e) => e.kind === "watchlist_add").length;
    const m = readMemory();
    const views = (m.recentViews || []).filter((v) => {
      const t = v.at ? new Date(v.at).getTime() : 0;
      return t >= since;
    }).length;

    if (opens + seals + views < 3) return null;

    const bits: string[] = [];
    if (views || opens)
      bits.push(
        `${views + opens} open${views + opens === 1 ? "" : "s"} this session`,
      );
    if (seals) bits.push(`${seals} seal${seals === 1 ? "" : "s"}`);
    if (!bits.length) return null;

    return {
      line: `Quiet desk · ${bits.join(" · ")}. Lantern keeps that on this device only.`,
    };
  }, [ready, entries]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(HIDE_KEY) === "1") {
      setShow(false);
      return;
    }
    setShow(!!note);
  }, [note]);

  if (!show || !note) return null;

  return (
    <aside className="session-quiet" aria-label="Session note">
      <p className="session-quiet-line">{note.line}</p>
      <button
        type="button"
        className="session-quiet-hide"
        onClick={() => {
          sessionStorage.setItem(HIDE_KEY, "1");
          setShow(false);
        }}
      >
        Hide
      </button>
    </aside>
  );
}
