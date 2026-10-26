"use client";

import { useEffect, useState } from "react";
import { readMemory } from "@/lib/lantern-memory";
import { useWatchlist } from "@/components/WatchlistProvider";
import { readSessionTouch } from "@/components/FirstVisitHost";

function baseGreeting(h: number): { icon: string; text: string } {
  if (h >= 5 && h < 12)
    return { icon: "🌅", text: "Good morning — the signal is warm." };
  if (h >= 12 && h < 17)
    return { icon: "☀️", text: "Afternoon frequency locked in." };
  if (h >= 17 && h < 21)
    return { icon: "🌇", text: "Evening desk is lit." };
  return { icon: "🌙", text: "Late-night broadcast is live." };
}

export function HeroGreeting() {
  const { entries, ready } = useWatchlist();
  const [g, setG] = useState({
    icon: "🌙",
    text: "Late-night broadcast is live.",
  });

  useEffect(() => {
    const h = new Date().getHours();
    const base = baseGreeting(h);
    const m = readMemory();
    const touch = readSessionTouch();

    if (!ready) {
      setG(base);
      return;
    }

    if (touch?.isFirstVisit || (m.sessionOpens <= 1 && entries.length === 0)) {
      setG({
        icon: base.icon,
        text:
          h >= 21 || h < 5
            ? "First night on the desk — Lantern is listening."
            : "First visit — the frequency is open.",
      });
      return;
    }

    if (touch && touch.daysAway >= 14) {
      const days = Math.floor(touch.daysAway);
      setG({
        icon: base.icon,
        text: `It’s been a while — about ${days} day${days === 1 ? "" : "s"} since this browser last opened the desk.`,
      });
      return;
    }

    if (touch && touch.daysAway >= 3) {
      setG({
        icon: base.icon,
        text: "You’re back — the shelf is still here.",
      });
      return;
    }

    const watching = entries.filter((e) => e.watchStatus === "watching");
    if (watching.length > 0) {
      setG({
        icon: base.icon,
        text: `You left something open — still mid-frequency with “${watching[0].title}”.`,
      });
      return;
    }

    if (m.completedLog[0]) {
      const hours =
        (Date.now() - new Date(m.completedLog[0].at).getTime()) /
        (1000 * 60 * 60);
      if (hours < 36) {
        setG({
          icon: base.icon,
          text: `Welcome back — after closing “${m.completedLog[0].title}”.`,
        });
        return;
      }
    }

    if (m.recentViews[0] && m.sessionOpens > 1) {
      setG({
        icon: base.icon,
        text: `Welcome back — last signal was “${m.recentViews[0].title}”.`,
      });
      return;
    }

    setG({
      icon: base.icon,
      text: "You’re back. " + base.text,
    });
  }, [ready, entries]);

  return (
    <div className="hero-greeting">
      <span className="greeting-icon" aria-hidden>
        {g.icon}
      </span>
      <span className="greeting-text">
        <span className="time-emote">{g.text}</span>
      </span>
    </div>
  );
}
