"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/components/SessionProvider";
import { useWatchlist } from "@/components/WatchlistProvider";
import { SoundSettings } from "@/components/SoundSettings";
import { MyServicesSettings } from "@/components/MyServicesSettings";
import type { WatchlistEntry } from "@/lib/types";
import { playCue } from "@/lib/sound-engine";
import {
  clearMalSyncQueue,
  readMalSyncQueue,
  setMalConnectedFlag,
} from "@/lib/mal-sync";

export function AccountClient() {
  const {
    session,
    ready,
    connecting,
    syncing,
    error,
    connectQuick,
    applyOAuthSession,
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
  const [malOauth, setMalOauth] = useState<{
    configured: boolean;
    connected: boolean;
    username: string | null;
  } | null>(null);
  const [alOauthConfigured, setAlOauthConfigured] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const refreshMalOauth = useCallback(async () => {
    try {
      const res = await fetch("/api/mal/status");
      const j = await res.json();
      setMalOauth({
        configured: Boolean(j.configured),
        connected: Boolean(j.connected),
        username: j.username || null,
      });
      setMalConnectedFlag(Boolean(j.connected));
    } catch {
      setMalOauth({ configured: false, connected: false, username: null });
    }
    setPendingCount(readMalSyncQueue().length);
  }, []);

  useEffect(() => {
    if (!ready) return;
    void refreshMalOauth();
    void fetch("/api/anilist/status")
      .then((r) => r.json())
      .then((j) => setAlOauthConfigured(Boolean(j.configured)))
      .catch(() => setAlOauthConfigured(false));

    try {
      const params = new URLSearchParams(window.location.search);
      const mal = params.get("mal");
      const anilist = params.get("anilist");

      if (anilist === "connected") {
        const user = params.get("user") || "";
        const uid = parseInt(params.get("uid") || "0", 10);
        const avatar = params.get("avatar") || undefined;
        if (user && uid) {
          applyOAuthSession({ username: user, userId: uid, avatar });
          setSyncMsg(
            `AniList OAuth connected as ${user}. You can sync public lists into your local watchlist.`,
          );
          playCue("success");
        }
        window.history.replaceState({}, "", "/account");
      } else if (anilist === "denied") {
        setMalErr("AniList authorization was denied.");
        window.history.replaceState({}, "", "/account");
      } else if (anilist === "error" || anilist === "not_configured") {
        setMalErr(
          params.get("reason") ||
            "AniList OAuth failed or is not configured on the server.",
        );
        window.history.replaceState({}, "", "/account");
      }

      if (mal === "connected") {
        setSyncMsg(
          "MyAnimeList connected. Pending changes can flush when you sync.",
        );
        playCue("success");
        window.history.replaceState({}, "", "/account");
      } else if (mal === "denied") {
        setMalErr("MAL authorization was denied.");
        window.history.replaceState({}, "", "/account");
      } else if (mal === "error" || mal === "not_configured") {
        setMalErr(
          params.get("reason") ||
            "MAL OAuth failed or is not configured on the server.",
        );
        window.history.replaceState({}, "", "/account");
      }
    } catch {
      /* */
    }
  }, [ready, refreshMalOauth, applyOAuthSession]);

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

  async function onQuickLogin(e: React.FormEvent) {
    e.preventDefault();
    setSyncMsg(null);
    clearError();
    const timer = startProgress();
    try {
      await connectQuick(username);
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
      setSyncMsg(`Merged ${incoming.length} MAL titles (public list / Jikan).`);
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

  async function onMalDisconnect() {
    await fetch("/api/mal/status", { method: "DELETE" });
    setMalConnectedFlag(false);
    await refreshMalOauth();
    playCue("filter_select");
  }

  async function onMalFlush() {
    const q = readMalSyncQueue().filter((m) => m.malId);
    if (!q.length) {
      setSyncMsg("No pending MAL mutations with a MAL id.");
      return;
    }
    setMalBusy(true);
    try {
      const res = await fetch("/api/mal/flush", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: q.map((m) => ({
            malId: m.malId,
            status: m.status,
            progress: m.progress,
            score: m.score,
          })),
        }),
      });
      const j = await res.json();
      if (j.flushed > 0) {
        clearMalSyncQueue();
        setPendingCount(0);
        setSyncMsg(`Flushed ${j.flushed} change(s) to MyAnimeList.`);
        playCue("success");
      } else {
        setMalErr(
          j.reason || "Nothing flushed — check MAL connection and mal ids.",
        );
      }
      await refreshMalOauth();
    } catch (e) {
      setMalErr(e instanceof Error ? e.message : "Flush failed");
    } finally {
      setMalBusy(false);
    }
  }

  function onDisconnect() {
    disconnect();
    playCue("filter_select");
  }

  const busy = connecting || syncing || malBusy || progress > 0;
  const modeLabel =
    session?.authMode === "oauth"
      ? "OAuth"
      : session
        ? "Quick login"
        : null;

  return (
    <div className={"account-panel" + (flashOk ? " account-panel--ok" : "")}>
      {progress > 0 && progress < 100 ? (
        <div
          className="account-progress"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span
            className="account-progress-fill"
            style={{ width: `${progress}%` }}
          />
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
        <>
          <section style={{ marginBottom: 24 }}>
            <h2 className="nx-kicker">AniList · OAuth login</h2>
            {alOauthConfigured ? (
              <>
                <p className="account-note">
                  Sign in with AniList to authorize this app. Token is stored in
                  an httpOnly cookie on the server.
                </p>
                <a href="/api/anilist/auth" className="btn btn-accent btn-sm">
                  Log in with AniList
                </a>
              </>
            ) : (
              <p className="account-note">
                OAuth needs <code>ANILIST_CLIENT_ID</code>,{" "}
                <code>ANILIST_CLIENT_SECRET</code>, and{" "}
                <code>ANILIST_REDIRECT_URI</code> on the server. Use Quick login
                below until then.
              </p>
            )}
          </section>

          <hr style={{ margin: "20px 0", borderColor: "var(--color-border)" }} />

          <form className="account-form" onSubmit={onQuickLogin}>
            <h2 className="nx-kicker">AniList · Quick login</h2>
            <p className="account-note">
              No password and no OAuth — enter a <strong>public</strong> AniList
              username. We only read lists that are already public. Nothing is
              written back to AniList.
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
                className="btn btn-outline btn-sm"
                disabled={busy}
              >
                {connecting ? "Connecting…" : "Quick login"}
              </button>
            </div>
          </form>
        </>
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
                {modeLabel} · connected{" "}
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

      <section aria-labelledby="mal-oauth-heading">
        <h2 id="mal-oauth-heading" className="nx-kicker">
          MyAnimeList OAuth
        </h2>
        {!malOauth?.configured ? (
          <p className="account-note">
            Server needs <code>MAL_CLIENT_ID</code> and{" "}
            <code>MAL_REDIRECT_URI</code> (see docs/MAL_OAUTH.md). Public list
            import below still works without OAuth.
          </p>
        ) : malOauth.connected ? (
          <div className="account-actions" style={{ flexWrap: "wrap", gap: 8 }}>
            <p className="account-note" style={{ width: "100%" }}>
              Connected as{" "}
              <strong>{malOauth.username || "MAL user"}</strong>
              {pendingCount > 0
                ? ` · ${pendingCount} pending local change(s)`
                : " · queue empty"}
            </p>
            <button
              type="button"
              className="btn btn-accent btn-sm"
              onClick={() => void onMalFlush()}
              disabled={busy || pendingCount === 0}
            >
              Flush pending → MAL
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => void onMalDisconnect()}
              disabled={busy}
            >
              Disconnect MAL
            </button>
          </div>
        ) : (
          <div className="account-actions">
            <p className="account-note" style={{ width: "100%" }}>
              Authorize write access so status/progress can sync to your MAL
              list. Local watchlist always wins first.
            </p>
            <a href="/api/mal/auth" className="btn btn-accent btn-sm">
              Connect MyAnimeList
            </a>
          </div>
        )}
      </section>

      <hr style={{ margin: "28px 0", borderColor: "var(--color-border)" }} />

      <form className="account-form" onSubmit={onMalImport}>
        <p className="account-note">
          Public MAL username via Jikan (no OAuth). Titles merge into local
          watchlist; ids are resolved to AniList when possible.
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

      <section aria-labelledby="my-services-heading">
        <h2 id="my-services-heading" className="nx-kicker">
          My services
        </h2>
        <MyServicesSettings />
      </section>

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
