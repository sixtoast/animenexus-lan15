"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Item = {
  route: string; title?: string; english?: string; romaji?: string; native?: string;
  episodeDate?: string; episodeNumber?: number; subtractedEpisodeNumber?: number;
  image?: string | null; date?: string | null; isToday?: boolean; inList?: boolean;
  listStatus?: string | null; episodesSeen?: number; listEpisodes?: number;
  delayedText?: string; airingStatus?: string; status?: string; lengthMin?: number;
};

type Payload = {
  connected: boolean; username?: string | null; today: string; timezone: string;
  items: Item[]; catchUp: any[]; recommendations: any[];
  counts: { total: number; myList: number; new: number };
  error?: string;
};

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function titleOf(x: Item) { return x.title || x.english || x.romaji || x.route; }
function formatTime(value?: string) {
  if (!value) return "TBA";
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
function relative(value?: string) {
  if (!value) return "";
  const delta = new Date(value).getTime() - Date.now();
  const abs = Math.abs(delta);
  if (abs < 60_000) return delta >= 0 ? "now" : "just aired";
  const mins = Math.round(abs / 60_000);
  const h = Math.floor(mins / 60), m = mins % 60;
  return delta >= 0 ? `in ${h ? h + "h " : ""}${m}m` : `${h ? h + "h " : ""}${m}m ago`;
}

export default function ScheduleClient() {
  const [data, setData] = useState<Payload | null>(null);
  const [tab, setTab] = useState<"all" | "mine" | "new">("all");
  const [day, setDay] = useState<"today" | "week">("today");
  const [busy, setBusy] = useState<string | null>(null);
  const [tick, setTick] = useState(Date.now());

  async function load() {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Johannesburg";
    const res = await fetch(`/api/animeschedule/schedule?tz=${encodeURIComponent(tz)}`, { cache: "no-store" });
    const json = await res.json();
    setData(json);
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const id = window.setInterval(() => setTick(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const items = useMemo(() => {
    if (!data) return [];
    return data.items.filter((x) => {
      if (tab === "mine" && !x.inList) return false;
      if (tab === "new" && x.inList) return false;
      if (day === "today" && !x.isToday) return false;
      return true;
    }).sort((a, b) => String(a.episodeDate || "").localeCompare(String(b.episodeDate || "")));
  }, [data, tab, day, tick]);

  const grouped = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const item of items) {
      const key = item.date || "unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return [...map.entries()];
  }, [items]);

  async function markWatched(item: Item) {
    if (!item.inList) return;
    const next = Math.max(Number(item.episodeNumber || 0), Number(item.episodesSeen || 0) + 1);
    setBusy(item.route);
    try {
      const res = await fetch("/api/animeschedule/progress", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ route: item.route, episodesSeen: next }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Update failed");
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Update failed");
    } finally { setBusy(null); }
  }

  if (!data) {
    return <main className="schedule-main"><div className="container"><div className="schedule-loading">Loading your broadcast desk…</div></div></main>;
  }

  if (data.error) {
    return <main className="schedule-main"><div className="container"><div className="state-box error"><h2>Schedule unavailable</h2><p>{data.error}</p></div></div></main>;
  }

  return (
    <main className="schedule-main">
      <section className="container schedule-hero">
        <div className="hero-badge">Broadcast desk · {data.timezone}</div>
        <div className="schedule-hero-row">
          <div>
            <h1>Your <span>schedule</span></h1>
            <p>Live broadcast times, your list, catch-up, and new discoveries in one place.</p>
          </div>
          {!data.connected && <Link className="btn btn-accent btn-sm" href="/account">Connect AnimeSchedule</Link>}
        </div>
        <div className="schedule-stats">
          <span>{data.counts.myList} on your list</span><span>{data.counts.new} new</span><span>{data.counts.total} airing this week</span>
          {data.connected && <span>Connected as {data.username || "AnimeSchedule user"}</span>}
        </div>
      </section>

      {data.connected && data.catchUp.length > 0 && (
        <section className="container schedule-section">
          <div className="section-head"><h2>You're behind</h2><span className="meta">{data.catchUp.length} catch-up items</span></div>
          <div className="catchup-grid">
            {data.catchUp.map((x) => (
              <article className="catchup-card" key={x.route}>
                {x.image && <img src={x.image} alt="" />}
                <div><strong>{x.title}</strong><span>Episode {x.episodesSeen} → {x.latestEpisode}</span><small>{x.gap} episode{x.gap === 1 ? "" : "s"} behind</small></div>
              </article>
            ))}
          </div>
        </section>
      )}

      {data.connected && data.recommendations.length > 0 && (
        <section className="container schedule-section">
          <div className="section-head"><h2>You might like this</h2><span className="meta">Based on your AnimeSchedule list</span></div>
          <div className="recommend-grid">
            {data.recommendations.map((x) => (
              <article className="recommend-card" key={x.route}>
                {x.image && <img src={x.image} alt="" />}
                <div><strong>{x.title}</strong><span>{x.reason}</span><small>{x.score ? `Score ${Math.round(x.score)}` : "New this week"}</small></div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="container schedule-section">
        <div className="schedule-controls">
          <div className="segmented" aria-label="Schedule scope">
            {(["all","mine","new"] as const).map((x) => <button key={x} className={tab === x ? "active" : ""} onClick={() => setTab(x)}>{x === "all" ? "All" : x === "mine" ? "My list" : "New"}</button>)}
          </div>
          <div className="segmented" aria-label="Schedule range">
            <button className={day === "today" ? "active" : ""} onClick={() => setDay("today")}>Today</button>
            <button className={day === "week" ? "active" : ""} onClick={() => setDay("week")}>This week</button>
          </div>
        </div>

        {grouped.map(([date, group]) => (
          <section className="schedule-day" key={date}>
            <div className="schedule-day-head"><h2>{date === data.today ? "Today" : new Date(date + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</h2><span>{group.length} releases</span></div>
            <div className="schedule-list">
              {group.map((item) => {
                const watched = Number(item.episodesSeen || 0) >= Number(item.episodeNumber || 0);\n                const hasAired = Boolean(item.episodeDate && new Date(item.episodeDate).getTime() <= Date.now());
                return <article className={`schedule-card ${item.inList ? "is-mine" : ""}`} key={item.route + item.episodeDate}>
                  {item.image && <img src={item.image} alt="" />}
                  <div className="schedule-card-main">
                    <div className="schedule-card-top"><span className="schedule-time">{formatTime(item.episodeDate)}</span><span className="schedule-countdown">{relative(item.episodeDate)}</span></div>
                    <h3>{titleOf(item)}</h3>
                    <div className="schedule-meta">
                      <span>Episode {item.subtractedEpisodeNumber && item.subtractedEpisodeNumber !== item.episodeNumber ? `${item.subtractedEpisodeNumber}–${item.episodeNumber}` : item.episodeNumber ?? "?"}</span>
                      {item.inList && <span className="list-pill">{item.listStatus === "watching" ? "Watching" : item.listStatus}</span>}
                      {!item.inList && <span className="new-pill">New</span>}
                      {item.delayedText && <span className="delay-pill">{item.delayedText}</span>}
                    </div>
                    {item.inList && <div className="progress-line"><span style={{ width: `${Math.min(100, (Number(item.episodesSeen || 0) / Math.max(1, Number(item.episodeNumber || 1))) * 100)}%` }} /></div>}
                  </div>
                  {item.inList && hasAired && Number(item.episodeNumber || 0) > Number(item.episodesSeen || 0) && (
                    <button className="btn btn-outline btn-sm schedule-watch" onClick={() => void markWatched(item)} disabled={busy === item.route}>
                      {busy === item.route ? "Saving…" : "Mark watched"}
                    </button>
                  )}
                </article>;
              })}
            </div>
          </section>
        ))}
        {!grouped.length && <div className="state-box"><p>No releases match this view.</p></div>}
      </section>
    </main>
  );
}
