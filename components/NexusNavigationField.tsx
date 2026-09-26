"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { onNexusSignal } from "@/lib/nexus-intelligence";

type RouteMode = "home" | "browse" | "anime" | "franchise" | "watchlist" | "tools" | "other";

function modeFor(path: string): RouteMode {
  if (path === "/") return "home";
  if (path.startsWith("/browse") || path.startsWith("/seasonal") || path.startsWith("/airing") || path.startsWith("/schedule")) return "browse";
  if (path.startsWith("/anime/")) return "anime";
  if (path.startsWith("/watchlist")) return "watchlist";
  if (path.startsWith("/tools") || path.startsWith("/taste") || path.startsWith("/mood") || path.startsWith("/journey")) return "tools";
  return "other";
}

const labels: Record<RouteMode,string> = {
  home:"DISCOVERY", browse:"CATALOGUE", anime:"TITLE", franchise:"FRANCHISE",
  watchlist:"YOUR CONSTELLATION", tools:"DESK", other:"NEXUS",
};

const focusLabels: Record<string, string> = {
  discovery: "DISCOVERY",
  recommendations: "RECOMMENDATIONS",
  mood: "MOOD",
  watchlist: "YOUR CONSTELLATION",
  franchise: "FRANCHISE",
  artwork: "ARTWORK",
  "watch-order": "WATCH ORDER",
};

export function NexusNavigationField() {
  const pathname = usePathname() || "/";
  const [mode, setMode] = useState<RouteMode>(() => modeFor(pathname));
  const [travelling, setTravelling] = useState(false);
  const [focusTarget, setFocusTarget] = useState<string | null>(null);
  const previous = useRef(pathname);

  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    setTravelling(true);
    const t = window.setTimeout(() => setTravelling(false), 720);
    setMode(modeFor(pathname));
    return () => window.clearTimeout(t);
  }, [pathname]);

  useEffect(() => onNexusSignal((signal) => {
    if (signal.type !== "focus") return;
    setFocusTarget(signal.target);
    const aliases: Record<string, string> = {
      discovery: "discovery", recommendations: "recommendations", mood: "mood",
      "watch-order": "watch-order", franchise: "franchise", artwork: "artwork", watchlist: "watchlist",
    };
    const id = aliases[signal.target];
    const target = id ? document.getElementById(id) : null;
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    const t = window.setTimeout(() => setFocusTarget(null), 900);
    return () => window.clearTimeout(t);
  }), []);

  const modeIndex = ["home","browse","anime","franchise","watchlist","tools","other"].indexOf(mode);

  return (
    <div
      className={"nexus-navigation-field nexus-navigation-field--" + mode + (travelling ? " is-travelling" : "") + (focusTarget ? " is-intelligence-focused" : "")}
      aria-hidden="true"
      style={{ "--nexus-mode-index": modeIndex } as React.CSSProperties}
    >
      <div className="nexus-navigation-field__vignette" />
      <div className="nexus-navigation-field__orbit nexus-navigation-field__orbit--outer" />
      <div className="nexus-navigation-field__orbit nexus-navigation-field__orbit--inner" />
      <div className="nexus-navigation-field__satellites">
        {Array.from({ length: 8 }, (_, i) => <i key={i} style={{ "--i": i } as React.CSSProperties} />)}
      </div>
      <div className="nexus-navigation-field__core">
        <span>{focusTarget ? focusLabels[focusTarget] || focusTarget.toUpperCase() : labels[mode]}</span>
        <b />
      </div>
      <div className="nexus-navigation-field__route">{String(modeIndex + 1).padStart(2,"0")} · NEXUS</div>
    </div>
  );
}
