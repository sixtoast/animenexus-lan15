"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "@/components/SessionProvider";
import { useWatchlist } from "@/components/WatchlistProvider";
import { SoundSettings } from "@/components/SoundSettings";
import type { WatchlistEntry } from "@/lib/types";
import { playCue } from "@/lib/sound-engine";

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
  const [progress, setProgress] = useState(0);
  const [flashOk, setFlashOk] = useState(false);

  if (!ready) {
    return (
      <div className="state-box">
        <div className="spinner" />
        <p>Loading session…</p>
      </div>
    );
  }

  function startProgress() {
    setProgress(8);
    const id = window.setInterval(() => {
      setProgress((p) => (p >= 88 ? p : p + 6 + Math.random() * 4));
    }, 180);
    return id;
  }

  function finishProgress(ok: boolean) {
    setProgress(100);
    if (ok) {
      setFlashOk(true);
      playCue("success");
      window.setTimeout(() => setFlashOk(false), 1200);
    } else {
      playCue("error");
    }
    window.setTimeout(() => setProgress(0), 500);
  }

  async function onConnect(e: React.FormEvent) {
    e.preventDefault();
    setSyncMsg(null);
    clearError();
    const timer = startProgress();
    try {
      await connect(username);
      finishProgress(true);
    } catch {
      finishProgress(false);
    } finally {
      window.clearInterval(timer);
    }
  }

  async function onSync() {
    setSyncMsg(null);
    const timer = startProgress();
    try {
      const n = await syncLists();
      window.clearInterval(timer);
      if (n > 0) {
        setSyncMsg(
          `Imported ${n} titles from AniList into your local watchlist.`,
        );
        finishProgress(true);
      } else {
        finishProgress(true);
        setSyncMsg("Sync finished — no new titles.");
      }
    } catch {
      window.clearInterval(timer);
      finishProgress(false);
    }
  }

  async function onMalImport(e: React.FormEvent) {
    e.preventDefault();
    setMalBusy(true);
    setMalErr(null);
    const timer = startProgress();
    try {
      const res = await fetch(
        `/api/mal-list?username=${encodeURIComponent(malUser.trim())}`,
      );
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "MAL import failed");
      const incoming = (j.entries || []) as WatchlistEntry[];
      const byId = new Map(entries.map((x) => [x.id, x]));
      for (const entry of incoming) byId.set(entry.id, entry);
      replaceAll([...byId.values()]);
      setSyncMsg(
        `Merged ${incoming.length} MAL titles (Jikan). Rate limits apply; lists must be public.`,
      );
      window.clearInterval(timer);
      finishProgress(true);
    } catch (err) {
      window.clearInterval(timer);
      setMalErr(err instanceof Error ? err.message : "MAL failed");
      finishProgress(false);
    } finally {
      setMalBusy(false);
    }
  }

  function onDisconnect() {
    disconnect();
    playCue("filter_select");
  }

  const busy = connecting || syncing || malBusy || progress > 0;

  return (
    <div className={"account-panel" + (flashOk ? " account-panel--ok" : "")}>
      {progress > 0 && progress < 100 ? (
        <div className="account-progress" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
          <span className="account-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      ) : null}

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
          className="state-box account-sync-msg"
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
              disabled={busy}
            />
            <button
              type="submit"
              className="btn btn-accent btn-sm"
              disabled={busy}
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
              disabled={busy}
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
              onClick={onDisconnect}
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
            disabled={busy}
          />
          <button
            type="submit"
            className="btn btn-outline btn-sm"
            disabled={busy || !malUser.trim()}
          >
            {malBusy ? "Importing…" : "Import MAL"}
          </button>
        </div>
      </form>

      <hr style={{ margin: "28px 0", borderColor: "var(--color-border)" }} />

      <section aria-labelledby="sound-settings-heading">
        <h2 id="sound-settings-heading" className="nx-kicker">
          Sound
        </h2>
        <p className="account-note">
          Short original UI cues — opt-in, no music, no card-hover spam.
        </p>
        <SoundSettings />
      </section>
    </div>
  );
}
