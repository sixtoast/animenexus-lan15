"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "@/components/SessionProvider";
import { useWatchlist } from "@/components/WatchlistProvider";
import type { WatchlistEntry } from "@/lib/types";

export function AccountClient() {
  const {
    session,
    ready,
    connecting,
    syncing,
    error,
    connect,
    disconnect,
    syncLists,
    clearError,
  } = useSession();
  const { replaceAll, entries } = useWatchlist();
  const [username, setUsername] = useState("");
  const [malUser, setMalUser] = useState("");
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [malBusy, setMalBusy] = useState(false);
  const [malErr, setMalErr] = useState<string | null>(null);

  if (!ready) {
    return (
      <div className="state-box">
        <div className="spinner" />
        <p>Loading session…</p>
      </div>
    );
  }

  async function onConnect(e: React.FormEvent) {
    e.preventDefault();
    setSyncMsg(null);
    clearError();
    await connect(username);
  }

  async function onSync() {
    setSyncMsg(null);
    const n = await syncLists();
    if (n > 0) {
      setSyncMsg(
        `Imported ${n} titles from AniList into your local watchlist.`,
      );
    }
  }

  async function onMalImport(e: React.FormEvent) {
    e.preventDefault();
    setMalBusy(true);
    setMalErr(null);
    try {
      const res = await fetch(
        `/api/mal-list?username=${encodeURIComponent(malUser.trim())}`,
      );
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "MAL import failed");
      const incoming = (j.entries || []) as WatchlistEntry[];
      const byId = new Map(entries.map((x) => [x.id, x]));
      for (const e of incoming) byId.set(e.id, e);
      replaceAll([...byId.values()]);
      setSyncMsg(
        `Merged ${incoming.length} MAL titles (Jikan). Rate limits apply; lists must be public.`,
      );
    } catch (err) {
      setMalErr(err instanceof Error ? err.message : "MAL failed");
    } finally {
      setMalBusy(false);
    }
  }

  return (
    <div className="account-panel">
      {error ? (
        <div className="state-box error" style={{ marginBottom: 16 }}>
          <p>{error}</p>
        </div>
      ) : null}
      {malErr ? (
        <div className="state-box error" style={{ marginBottom: 16 }}>
          <p>{malErr}</p>
        </div>
      ) : null}
      {syncMsg ? (
        <div
          className="state-box"
          style={{
            marginBottom: 16,
            borderColor: "rgba(240,160,144,0.35)",
          }}
        >
          <p>{syncMsg}</p>
          <p style={{ marginTop: 10 }}>
            <Link href="/watchlist" className="btn btn-accent btn-sm">
              Open watchlist →
            </Link>
          </p>
        </div>
      ) : null}

      {!session ? (
        <form className="account-form" onSubmit={onConnect}>
          <p className="account-note">
            Connect with a public AniList username (no password). We only read
            lists that are already public on AniList — nothing is written back.
          </p>
          <label className="filter-label" htmlFor="anilist-user">
            AniList username
          </label>
          <div className="account-row">
            <input
              id="anilist-user"
              className="filter-input"
              placeholder="e.g. Josh"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              disabled={connecting}
            />
            <button
              type="submit"
              className="btn btn-accent btn-sm"
              disabled={connecting}
            >
              {connecting ? "Connecting…" : "Connect"}
            </button>
          </div>
        </form>
      ) : (
        <div className="account-connected">
          <div className="account-profile">
            {session.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.avatar} alt="" className="account-avatar" />
            ) : (
              <div className="account-avatar account-avatar-fallback">
                {session.username.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <p className="account-name">{session.username}</p>
              <p className="account-meta">
                Connected{" "}
                {new Date(session.connectedAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
              {session.lastSyncAt ? (
                <p className="account-meta">
                  Last sync: {new Date(session.lastSyncAt).toLocaleString()} ·{" "}
                  {session.lastSyncCount ?? 0} titles
                </p>
              ) : (
                <p className="account-meta">Not synced yet</p>
              )}
            </div>
          </div>

          <div className="account-actions">
            <button
              type="button"
              className="btn btn-accent btn-sm"
              onClick={onSync}
              disabled={syncing}
            >
              {syncing ? "Syncing…" : "Sync AniList lists → watchlist"}
            </button>
            <a
              href={`https://anilist.co/user/${encodeURIComponent(session.username)}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline btn-sm"
            >
              Open on AniList ↗
            </a>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={disconnect}
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      <hr style={{ margin: "28px 0", borderColor: "var(--color-border)" }} />

      <form className="account-form" onSubmit={onMalImport}>
        <p className="account-note">
          Public MAL username via Jikan. Rate-limited; private lists will fail.
          Titles merge into local watchlist by id (MAL ids — may not match
          AniList ids for the same show).
        </p>
        <label className="filter-label" htmlFor="mal-user">
          MAL username
        </label>
        <div className="account-row">
          <input
            id="mal-user"
            className="filter-input"
            placeholder="MAL username"
            value={malUser}
            onChange={(e) => setMalUser(e.target.value)}
            disabled={malBusy}
          />
          <button
            type="submit"
            className="btn btn-outline btn-sm"
            disabled={malBusy || !malUser.trim()}
          >
            {malBusy ? "Importing…" : "Import MAL"}
          </button>
        </div>
      </form>
    </div>
  );
}
