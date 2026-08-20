"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useMascotStore, mascotNotify } from "@/lib/mascot/store";
import { useMotion } from "@/components/MotionProvider";
import {
  isAudioEnabled,
  loadAudioPref,
  setAudioEnabled,
} from "@/lib/mascot/audio";
import {
  areInteractionsEnabled,
  bindMascotKeyboard,
  companionStatusLine,
  loadA11yPrefs,
  setInteractionsEnabled,
} from "@/lib/mascot/a11y";
import { UiAwareness } from "./UiAwareness";
import { ContextBridge } from "./ContextBridge";
import { ThoughtBubble } from "./ThoughtBubble";
import { UiTheatreBridge } from "./UiTheatreBridge";
import { MemoryBoot } from "./MemoryBoot";
import { MascotErrorBoundary } from "./MascotErrorBoundary";
import {
  detectPerfTier,
  PERF_TIER_LABEL,
} from "@/lib/mascot/performance";

const LiveTerrain = dynamic(
  () => import("./LiveTerrain").then((m) => m.LiveTerrain),
  {
    ssr: false,
    loading: () => (
      <div className="mascot-loading" aria-live="polite">
        Loading 3D companion…
      </div>
    ),
  },
);

const MascotDebugPanel = dynamic(
  () => import("./MascotDebugPanel").then((m) => m.MascotDebugPanel),
  { ssr: false },
);

export function MascotHost() {
  const enabled = useMascotStore((s) => s.enabled);
  const setEnabled = useMascotStore((s) => s.setEnabled);
  const { reducedMotion } = useMotion();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [hiddenTab, setHiddenTab] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [lowPower, setLowPower] = useState(false);
  const [perfTier, setPerfTier] = useState<string>("balanced");
  const [webglError, setWebglError] = useState<string | null>(null);
  const [audioOn, setAudioOn] = useState(false);
  const [interactOn, setInteractOn] = useState(true);
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    setReady(true);
    try {
      const saved = localStorage.getItem("anime_nexus_mascot");
      if (saved === "off") setEnabled(false);
      else setEnabled(true);
    } catch {
      setEnabled(true);
    }
    loadAudioPref();
    setAudioOn(isAudioEnabled());
    const a11y = loadA11yPrefs();
    setInteractOn(a11y.interactionsEnabled);
    const mobile =
      window.matchMedia("(max-width: 480px)").matches ||
      (navigator as Navigator & { connection?: { saveData?: boolean } })
        .connection?.saveData === true;
    setLowPower(mobile);
    setPerfTier(detectPerfTier({ lowPower: mobile, width: window.innerWidth }));

    try {
      const c = document.createElement("canvas");
      const gl =
        (c.getContext("webgl2") as WebGLRenderingContext | null) ||
        (c.getContext("webgl") as WebGLRenderingContext | null) ||
        (c.getContext("experimental-webgl") as WebGLRenderingContext | null);
      if (!gl) {
        setWebglError("WebGL is not available in this browser.");
      } else {
        setWebglError(null);
      }
    } catch (e) {
      setWebglError(
        e instanceof Error ? e.message : "WebGL context could not be created.",
      );
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

  function hideCompanion() {
    setEnabled(false);
    try {
      localStorage.setItem("anime_nexus_mascot", "off");
    } catch {
      /* */
    }
    setStatusMsg("Companion hidden. Site works without it.");
  }

  function showCompanion() {
    setEnabled(true);
    try {
      localStorage.setItem("anime_nexus_mascot", "on");
    } catch {
      /* */
    }
    setStatusMsg("Companion shown.");
  }

  function toggleAudio() {
    const next = !isAudioEnabled();
    setAudioEnabled(next);
    setAudioOn(next);
    setStatusMsg(next ? "Companion sound on" : "Companion sound off");
  }

  function toggleInteract() {
    const next = !areInteractionsEnabled();
    setInteractionsEnabled(next);
    setInteractOn(next);
    setStatusMsg(
      next ? "Companion interactions on" : "Companion interactions off",
    );
  }

  useEffect(() => {
    if (!enabled) return;
    return bindMascotKeyboard({
      toggleHide: () => {
        hideCompanion();
      },
      toggleMute: () => {
        toggleAudio();
      },
      toggleInteractions: () => {
        toggleInteract();
      },
    });
    // handlers close over stable setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  useEffect(() => {
    try {
      (window as unknown as { __mascotInteract?: boolean }).__mascotInteract =
        interactOn;
    } catch {
      /* */
    }
  }, [interactOn]);

  if (!ready) return null;

  if (!enabled) {
    return (
      <>
        <div className="sr-only" role="status" aria-live="polite">
          {statusMsg || "Companion hidden. Site works without it."}
        </div>
        <button
          type="button"
          className="mascot-enable"
          onClick={showCompanion}
          title="Show 3D companion (optional)"
          aria-label="Show optional 3D companion"
        >
          🕯️
        </button>
        <MascotDebugPanel />
      </>
    );
  }

  const forceReduced = reducedMotion;

  if (webglError) {
    return (
      <>
        <div className="mascot-error" role="alert">
          <strong>3D companion unavailable</strong>
          <p>{webglError} The rest of the site still works.</p>
          <button
            type="button"
            className="mascot-error-retry"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
          <button
            type="button"
            className="mascot-hide"
            style={{ marginTop: 8 }}
            onClick={hideCompanion}
          >
            Hide
          </button>
        </div>
        <MascotDebugPanel />
      </>
    );
  }

  if (hiddenTab) {
    return null;
  }

  const srLine = companionStatusLine({
    enabled: true,
    reducedMotion: !!forceReduced,
    audioOn,
    interactionsOn: interactOn,
  });

  return (
    <>
      <div className="sr-only" role="status" aria-live="polite">
        {statusMsg || srLine}
      </div>

      <MemoryBoot />
      <MascotErrorBoundary>
        <UiAwareness />
        <ContextBridge />
        <UiTheatreBridge />
      </MascotErrorBoundary>

      <MascotErrorBoundary>
        <LiveTerrain reducedMotion={forceReduced} lowPower={lowPower} />
      </MascotErrorBoundary>

      <ThoughtBubble />

      <div
        className={"mascot-dock" + (modalOpen ? " mascot-dock--soft" : "")}
        role="region"
        aria-label="Optional companion controls"
      >
        <span className="mascot-dock-label" aria-hidden="true">
          Lantern-ko ·{" "}
          {PERF_TIER_LABEL[perfTier as keyof typeof PERF_TIER_LABEL] || "Medium"}
          {forceReduced ? " · calm" : ""}
        </span>
        <button
          type="button"
          className="mascot-hide"
          onClick={toggleAudio}
          title="Toggle companion sound (Alt+Shift+M)"
          aria-pressed={audioOn}
        >
          {audioOn ? "🔊" : "🔇"}
        </button>
        <button
          type="button"
          className="mascot-hide"
          onClick={toggleInteract}
          title="Toggle companion interactions (Alt+Shift+I)"
          aria-pressed={interactOn}
        >
          {interactOn ? "✋" : "🚫"}
        </button>
        <button
          type="button"
          className="mascot-hide"
          onClick={hideCompanion}
          title="Hide companion (Alt+Shift+H)"
        >
          Hide
        </button>
      </div>
      <MascotDebugPanel />
    </>
  );
}
