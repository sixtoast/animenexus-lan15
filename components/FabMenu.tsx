"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/ToastProvider";
import { useMotion } from "@/components/MotionProvider";
import { usePerformance } from "@/components/PerformanceProvider";
import { NexusIcon } from "@/components/ui/NexusIcon";
import type { NexusIconName } from "@/lib/icons/registry";

function FabItem({
  icon,
  children,
}: {
  icon: NexusIconName;
  children: React.ReactNode;
}) {
  return (
    <>
      <NexusIcon name={icon} size="sm" />
      <span>{children}</span>
    </>
  );
}

export function FabMenu() {
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(false);
  const { toggleTheme, theme } = useTheme();
  const { showToast } = useToast();
  const { reducedMotion, toggleMotion } = useMotion();
  const performance = usePerformance();
  const [performanceOpen, setPerformanceOpen] = useState(false);

  useEffect(() => {
    const onPulse = () => {
      setPulse(true);
      window.setTimeout(() => setPulse(false), 700);
    };
    window.addEventListener("animenexus:lantern-pulse", onPulse);
    return () =>
      window.removeEventListener("animenexus:lantern-pulse", onPulse);
  }, []);

  return (
    <div className={`fab-root${open ? " open" : ""}`}>
      {open ? (
        <div className="fab-menu" role="menu">
          <Link href="/tools/challenge" className="fab-item" role="menuitem" onClick={() => setOpen(false)}>
            <FabItem icon="challenge">Challenge</FabItem>
          </Link>
          <Link href="/seasonal" className="fab-item" role="menuitem" onClick={() => setOpen(false)}>
            <FabItem icon="seasonal">Seasonal</FabItem>
          </Link>
          <Link href="/tools/oracle" className="fab-item" role="menuitem" onClick={() => setOpen(false)}>
            <FabItem icon="oracle">Night Desk</FabItem>
          </Link>
          <Link href="/tools/sauce" className="fab-item" role="menuitem" onClick={() => setOpen(false)}>
            <FabItem icon="sauce">Sauce</FabItem>
          </Link>
          <button type="button" className="fab-item" role="menuitem" onClick={() => {
            window.dispatchEvent(new CustomEvent("animenexus:tonight"));
            document.documentElement.dataset.session = "tonight";
            setOpen(false);
          }}>
            <FabItem icon="night-desk">Tonight</FabItem>
          </button>
          <button type="button" className="fab-item" role="menuitem" onClick={() => {
            window.dispatchEvent(new CustomEvent("animenexus:break"));
            document.documentElement.dataset.session = "break";
            setOpen(false);
          }}>
            <FabItem icon="daily">Break</FabItem>
          </button>
          <button type="button" className="fab-item" role="menuitem" onClick={() => {
            toggleTheme();
            showToast(theme === "dark" ? "Light frequency" : "Night frequency");
            setOpen(false);
          }}>
            <FabItem icon={theme === "dark" ? "theme-light" : "theme-dark"}>
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </FabItem>
          </button>
          <button type="button" className="fab-item" role="menuitem" onClick={() => {
            toggleMotion();
            setOpen(false);
          }}>
            <FabItem icon={reducedMotion ? "frequency" : "empty"}>
              {reducedMotion ? "Full motion" : "Reduce motion"}
            </FabItem>
          </button>
          <button type="button" className="fab-item" role="menuitem" onClick={() => setPerformanceOpen(v => !v)} aria-expanded={performanceOpen}>
            <FabItem icon="frequency">Performance</FabItem>
          </button>
          {performanceOpen && (
            <div className="fab-performance" role="group" aria-label="Performance controls">
              <label><input type="checkbox" checked={performance.portal} onChange={e => performance.setPref("portal", e.target.checked)} /> Universe Portal</label>
              <label><input type="checkbox" checked={performance.portalScene} disabled={!performance.portal} onChange={e => performance.setPref("portalScene", e.target.checked)} /> Portal scene</label>
              <label><input type="checkbox" checked={performance.portalParallax} disabled={!performance.portal} onChange={e => performance.setPref("portalParallax", e.target.checked)} /> Pointer parallax</label>
              <label><input type="checkbox" checked={performance.portalViewTransition} disabled={!performance.portal} onChange={e => performance.setPref("portalViewTransition", e.target.checked)} /> View transitions</label>
              <label><input type="checkbox" checked={performance.portalMask} disabled={!performance.portal} onChange={e => performance.setPref("portalMask", e.target.checked)} /> Artwork mask</label>
              <label><input type="checkbox" checked={performance.portalCharacters} disabled={!performance.portal} onChange={e => performance.setPref("portalCharacters", e.target.checked)} /> Character layers</label>
              <label><input type="checkbox" checked={performance.portalGrain} disabled={!performance.portal} onChange={e => performance.setPref("portalGrain", e.target.checked)} /> Film grain</label>
              <label><input type="checkbox" checked={performance.cinematic} onChange={e => performance.setPref("cinematic", e.target.checked)} /> Cinematic effects</label>
              <label><input type="checkbox" checked={performance.sound} onChange={e => performance.setPref("sound", e.target.checked)} /> UI sound</label>
              <button type="button" className="fab-performance-reset" onClick={performance.reset}>Reset performance settings</button>
              <button type="button" className="fab-performance-safe" onClick={() => performance.setSafeMode(true)}>Emergency safe mode</button>
            </div>
          )}
          <Link href="/browse" className="fab-item" role="menuitem" onClick={() => setOpen(false)}>
            <FabItem icon="browse">Browse</FabItem>
          </Link>
        </div>
      ) : null}
      <button
        type="button"
        className={"fab-toggle" + (pulse ? " pulse" : "")}
        aria-expanded={open}
        aria-label={open ? "Close quick menu" : "Open quick menu"}
        onClick={() => setOpen((v) => !v)}
      >
        <NexusIcon name={open ? "empty" : "lantern"} size="md" />
      </button>
    </div>
  );
}
