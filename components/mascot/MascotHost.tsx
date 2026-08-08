"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useMascotStore, mascotNotify } from "@/lib/mascot/store";
import { useMotion } from "@/components/MotionProvider";
import { UiAwareness } from "./UiAwareness";
import { ContextBridge } from "./ContextBridge";
import { ThoughtBubble } from "./ThoughtBubble";
import { UiTheatreBridge } from "./UiTheatreBridge";
import { MemoryBoot } from "./MemoryBoot";
import { MascotErrorBoundary } from "./MascotErrorBoundary";

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

export function MascotHost() {
  const enabled = useMascotStore((s) => s.enabled);
  const setEnabled = useMascotStore((s) => s.setEnabled);
  const { reducedMotion, toggleMotion, setPref } = useMotion();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [hiddenTab, setHiddenTab] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [lowPower, setLowPower] = useState(false);
  const [webglError, setWebglError] = useState<string | null>(null);

  useEffect(() => {
    setReady(true);
    try {
      const saved = localStorage.getItem("anime_nexus_mascot");
      if (saved === "off") setEnabled(false);
      else setEnabled(true);
    } catch {
      setEnabled(true);
    }
    setLowPower(
      window.matchMedia("(max-width: 480px)").matches ||
        (navigator as Navigator & { connection?: { saveData?: boolean } })
          .connection?.saveData === true,
    );

    // Probe WebGL — report real failure, never swap to 2D
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

  const showCompanion = () => {
    setEnabled(true);
    // Ensure motion is on so 3D is allowed
    setPref("full");
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
        title="Show 3D companion"
        aria-label="Show 3D companion"
      >
        🕯️
      </button>
    );
  }

  // Reduced motion: user explicitly chose no animation — show message, not 2D fake
  if (reducedMotion) {
    return (
      <div className="mascot-error" role="status">
        <strong>3D paused</strong>
        <p>Reduced motion is on. Turn on full motion to show Lantern-ko.</p>
        <button
          type="button"
          className="mascot-error-retry"
          onClick={() => setPref("full")}
        >
          Enable full motion
        </button>
        <button
          type="button"
          className="mascot-hide"
          style={{ marginTop: 8 }}
          onClick={() => {
            setEnabled(false);
            try {
              localStorage.setItem("anime_nexus_mascot", "off");
            } catch {
              /* */
            }
          }}
        >
          Hide
        </button>
      </div>
    );
  }

  if (webglError) {
    return (
      <div className="mascot-error" role="alert">
        <strong>3D companion unavailable</strong>
        <p>{webglError}</p>
        <button
          type="button"
          className="mascot-error-retry"
          onClick={() => window.location.reload()}
        >
          Reload page
        </button>
      </div>
    );
  }

  if (hiddenTab) {
    return null;
  }

  return (
    <>
      <MemoryBoot />
      <MascotErrorBoundary>
        <UiAwareness />
        <ContextBridge />
        <UiTheatreBridge />
      </MascotErrorBoundary>

      {/* 3D only — no 2D sprite path */}
      <MascotErrorBoundary>
        <LiveTerrain reducedMotion={false} lowPower={lowPower} />
      </MascotErrorBoundary>

      <ThoughtBubble />

      <div
        className={"mascot-dock" + (modalOpen ? " mascot-dock--soft" : "")}
        role="complementary"
        aria-label="Companion home"
      >
        <span className="mascot-dock-label">Lantern-ko · 3D</span>
        <button
          type="button"
          className="mascot-hide"
          onClick={toggleMotion}
          title="Reduce motion (pauses 3D)"
          aria-label="Reduce motion"
        >
          ⏸️
        </button>
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
