"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useMascotStore, mascotNotify } from "@/lib/mascot/store";
import { UiAwareness } from "./UiAwareness";
import { ContextBridge } from "./ContextBridge";
import { ThoughtBubble } from "./ThoughtBubble";
import { UiTheatreBridge } from "./UiTheatreBridge";
import { MemoryBoot } from "./MemoryBoot";

const LiveTerrain = dynamic(
  () => import("./LiveTerrain").then((m) => m.LiveTerrain),
  { ssr: false },
);

export function MascotHost() {
  const enabled = useMascotStore((s) => s.enabled);
  const setEnabled = useMascotStore((s) => s.setEnabled);
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [hiddenTab, setHiddenTab] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [lowPower, setLowPower] = useState(false);

  useEffect(() => {
    setReady(true);
    try {
      const saved = localStorage.getItem("anime_nexus_mascot");
      if (saved === "off") setEnabled(false);
    } catch {
      /* ignore */
    }
    setReducedMotion(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    setLowPower(
      window.matchMedia("(max-width: 480px)").matches ||
        (navigator as Navigator & { connection?: { saveData?: boolean } })
          .connection?.saveData === true,
    );
  }, [setEnabled]);

  useEffect(() => {
    const onVis = () => setHiddenTab(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    const check = () => {
      const open = !!(
        document.querySelector(
          '[role="dialog"]:not([hidden]), .modal-root.open, .cmdk-root[data-open="true"], .ai-panel.open',
        ) || document.body.classList.contains("modal-open")
      );
      setModalOpen(open);
    };
    const id = window.setInterval(check, 600);
    check();
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    mascotNotify({ type: "route", path: pathname });
  }, [pathname, enabled]);

  useEffect(() => {
    const onSeal = (e: Event) => {
      const d = (e as CustomEvent).detail as { mode?: string } | undefined;
      if (d?.mode === "completed") mascotNotify({ type: "complete" });
      else mascotNotify({ type: "seal" });
    };
    window.addEventListener("animenexus:seal", onSeal);
    return () => window.removeEventListener("animenexus:seal", onSeal);
  }, []);

  useEffect(() => {
    if (!enabled || hiddenTab) return;
    const id = window.setInterval(() => {
      const last = useMascotStore.getState().lastInteractionAt;
      if (Date.now() - last > 45_000) {
        mascotNotify({ type: "idle-long" });
      }
    }, 20_000);
    return () => window.clearInterval(id);
  }, [enabled, hiddenTab]);

  if (!ready || !enabled) {
    return (
      <button
        type="button"
        className="mascot-enable"
        onClick={() => {
          setEnabled(true);
          try {
            localStorage.setItem("anime_nexus_mascot", "on");
          } catch {
            /* */
          }
        }}
        title="Show companion"
        aria-label="Show companion"
      >
        🕯️
      </button>
    );
  }

  const pause = hiddenTab;

  return (
    <>
      <MemoryBoot />
      <UiAwareness />
      <ContextBridge />
      <UiTheatreBridge />
      {!pause ? (
        <LiveTerrain reducedMotion={reducedMotion} lowPower={lowPower} />
      ) : null}
      <ThoughtBubble />
      <div
        className={
          "mascot-dock" + (modalOpen ? " mascot-dock--soft" : "")
        }
        role="complementary"
        aria-label="Companion home"
      >
        <span className="mascot-dock-label">Lantern-ko</span>
        <button
          type="button"
          className="mascot-hide"
          onClick={() => {
            setEnabled(false);
            try {
              localStorage.setItem("anime_nexus_mascot", "off");
            } catch {
              /* */
            }
          }}
          aria-label="Hide companion"
        >
          Hide
        </button>
      </div>
    </>
  );
}
