"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useMascotStore, mascotNotify } from "@/lib/mascot/store";
import { UiAwareness } from "./UiAwareness";
import { ContextBridge } from "./ContextBridge";
import { ThoughtBubble } from "./ThoughtBubble";
import { UiTheatreBridge } from "./UiTheatreBridge";
import { MemoryBoot } from "./MemoryBoot";
import { MascotErrorBoundary } from "./MascotErrorBoundary";
import { LanternSprite } from "./LanternSprite";

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
  const [webglOk, setWebglOk] = useState(true);
  const [terrainVisible, setTerrainVisible] = useState(false);
  const [terrainFailed, setTerrainFailed] = useState(false);

  useEffect(() => {
    setReady(true);
    try {
      const saved = localStorage.getItem("anime_nexus_mascot");
      if (saved === "off") setEnabled(false);
      else setEnabled(true);
    } catch {
      setEnabled(true);
    }
    setReducedMotion(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    // lowPower only tunes dpr / intervals — never disables 3D
    setLowPower(
      window.matchMedia("(max-width: 480px)").matches ||
        (navigator as Navigator & { connection?: { saveData?: boolean } })
          .connection?.saveData === true,
    );
    try {
      const c = document.createElement("canvas");
      const gl =
        c.getContext("webgl2") ||
        c.getContext("webgl") ||
        c.getContext("experimental-webgl");
      setWebglOk(!!gl);
    } catch {
      setWebglOk(false);
    }
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
    try {
      mascotNotify({ type: "route", path: pathname });
    } catch {
      /* */
    }
  }, [pathname, enabled]);

  useEffect(() => {
    const onSeal = (e: Event) => {
      const d = (e as CustomEvent).detail as { mode?: string } | undefined;
      try {
        if (d?.mode === "completed") mascotNotify({ type: "complete" });
        else mascotNotify({ type: "seal" });
      } catch {
        /* */
      }
    };
    window.addEventListener("animenexus:seal", onSeal);
    return () => window.removeEventListener("animenexus:seal", onSeal);
  }, []);

  useEffect(() => {
    if (!enabled || hiddenTab) return;
    const id = window.setInterval(() => {
      try {
        const last = useMascotStore.getState().lastInteractionAt;
        if (Date.now() - last > 45_000) {
          mascotNotify({ type: "idle-long" });
        }
      } catch {
        /* */
      }
    }, 20_000);
    return () => window.clearInterval(id);
  }, [enabled, hiddenTab]);

  const onTerrainVisible = useCallback((v: boolean) => {
    setTerrainVisible(v);
  }, []);

  const showCompanion = () => {
    setEnabled(true);
    setTerrainFailed(false);
    try {
      localStorage.setItem("anime_nexus_mascot", "on");
    } catch {
      /* */
    }
  };

  if (!ready) return null;

  if (!enabled) {
    return (
      <button
        type="button"
        className="mascot-enable"
        onClick={showCompanion}
        title="Show companion"
        aria-label="Show companion"
      >
        🕯️
      </button>
    );
  }

  // 3D is primary whenever WebGL works and motion is allowed
  const use3d = webglOk && !reducedMotion && !hiddenTab && !terrainFailed;
  // 2D sprite only as fallback when 3D isn't showing yet / failed
  const show2dFallback = !use3d || !terrainVisible;

  return (
    <>
      <MemoryBoot />
      <MascotErrorBoundary fallback={null}>
        <UiAwareness />
        <ContextBridge />
        <UiTheatreBridge />
      </MascotErrorBoundary>

      {use3d ? (
        <MascotErrorBoundary
          fallback={
            <LanternSprite />
          }
        >
          <LiveTerrain
            reducedMotion={false}
            lowPower={lowPower}
            onVisibleChange={onTerrainVisible}
          />
        </MascotErrorBoundary>
      ) : null}

      {show2dFallback ? <LanternSprite /> : null}

      <ThoughtBubble />

      <div
        className={"mascot-dock" + (modalOpen ? " mascot-dock--soft" : "")}
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
