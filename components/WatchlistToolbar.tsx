"use client";

import { useRef } from "react";
import { useWatchlist } from "@/components/WatchlistProvider";
import { useToast } from "@/components/ToastProvider";
import {
  downloadWatchlist,
  mergeWatchlistImport,
  parseWatchlistImport,
} from "@/lib/watchlist-io";
import { readWatchlist } from "@/lib/watchlist-storage";

export function WatchlistToolbar() {
  const { entries, replaceAll } = useWatchlist();
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="wl-toolbar">
      <button
        type="button"
        className="btn btn-outline btn-sm"
        onClick={() => {
          downloadWatchlist(entries);
          showToast("Watchlist exported", "📤");
        }}
        disabled={entries.length === 0}
      >
        Export JSON
      </button>
      <button
        type="button"
        className="btn btn-outline btn-sm"
        onClick={() => fileRef.current?.click()}
      >
        Import JSON
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={async (ev) => {
          const file = ev.target.files?.[0];
          ev.target.value = "";
          if (!file) return;
          try {
            const text = await file.text();
            const incoming = parseWatchlistImport(text);
            if (!incoming.length) throw new Error("No valid entries");
            const { added, updated, total } = mergeWatchlistImport(incoming);
            replaceAll(readWatchlist());
            showToast(`Import: +${added} · ~${updated} · ${total} total`, "📥");
          } catch (e) {
            showToast(e instanceof Error ? e.message : "Import failed", "😅");
          }
        }}
      />
    </div>
  );
}
