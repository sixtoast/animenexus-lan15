/**
 * Desk pack — portable local state for soft cross-device transfer.
 * Not cloud sync: user copies JSON or file between browsers.
 */

import type { WatchlistEntry } from "./types";
import { listDeskNotes, writeDeskNote, type DeskNote } from "./desk-notes";
import {
  readIntentSession,
  writeIntentSession,
  type IntentSession,
} from "./intent-session";
import { readMyServices, writeMyServices, type MyServicesPrefs } from "./my-services";

export const DESK_PACK_VERSION = 1 as const;

export type DeskPack = {
  version: typeof DESK_PACK_VERSION;
  exportedAt: string;
  intent: IntentSession;
  services: MyServicesPrefs;
  deskNotes: DeskNote[];
  /** Optional shelf snapshot — may be large */
  watchlist?: WatchlistEntry[];
};

export function buildDeskPack(
  entries?: WatchlistEntry[],
  opts?: { includeWatchlist?: boolean },
): DeskPack {
  return {
    version: DESK_PACK_VERSION,
    exportedAt: new Date().toISOString(),
    intent: readIntentSession(),
    services: readMyServices(),
    deskNotes: listDeskNotes(50),
    watchlist: opts?.includeWatchlist === false ? undefined : entries,
  };
}

export function deskPackToJson(pack: DeskPack): string {
  return JSON.stringify(pack, null, 2);
}

export function parseDeskPack(raw: string): DeskPack {
  const p = JSON.parse(raw) as DeskPack;
  if (!p || typeof p !== "object") throw new Error("Invalid desk pack");
  if (p.version !== 1) throw new Error(`Unsupported pack version: ${p.version}`);
  return p;
}

export type DeskPackApplyReport = {
  notes: number;
  intent: boolean;
  services: boolean;
  watchlistIds: number;
};

/** Apply pack into local storage. Watchlist merge is left to the caller. */
export function applyDeskPackMeta(pack: DeskPack): DeskPackApplyReport {
  let notes = 0;
  for (const n of pack.deskNotes || []) {
    if (!n?.animeId || !n.note) continue;
    writeDeskNote(n.animeId, n.title || `Title #${n.animeId}`, n.note);
    notes += 1;
  }
  if (pack.intent) {
    writeIntentSession(pack.intent);
  }
  if (pack.services) {
    writeMyServices({
      services: pack.services.services || [],
      region: pack.services.region || "US",
    });
  }
  return {
    notes,
    intent: Boolean(pack.intent),
    services: Boolean(pack.services),
    watchlistIds: pack.watchlist?.length || 0,
  };
}

/** Compact share of notes + intent only (for clipboard / URL fragment). */
export function encodeDeskShareLite(): string {
  const lite = {
    v: 1,
    intent: readIntentSession(),
    notes: listDeskNotes(20).map((n) => ({
      id: n.animeId,
      t: n.title,
      n: n.note,
    })),
  };
  const json = JSON.stringify(lite);
  if (typeof window === "undefined") return "";
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeDeskShareLite(token: string): {
  intent?: IntentSession;
  notes: DeskNote[];
} | null {
  try {
    const pad = token.length % 4 === 0 ? "" : "=".repeat(4 - (token.length % 4));
    const b64 = token.replace(/-/g, "+").replace(/_/g, "/") + pad;
    const json = decodeURIComponent(escape(atob(b64)));
    const p = JSON.parse(json) as {
      v?: number;
      intent?: IntentSession;
      notes?: { id: number; t: string; n: string }[];
    };
    if (p.v !== 1) return null;
    return {
      intent: p.intent,
      notes: (p.notes || []).map((x) => ({
        animeId: x.id,
        title: x.t,
        note: x.n,
        updatedAt: new Date().toISOString(),
      })),
    };
  } catch {
    return null;
  }
}

export function applyDeskShareLite(data: {
  intent?: IntentSession;
  notes: DeskNote[];
}): number {
  if (data.intent) writeIntentSession(data.intent);
  let n = 0;
  for (const note of data.notes) {
    writeDeskNote(note.animeId, note.title, note.note);
    n += 1;
  }
  return n;
}
