"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/ToastProvider";
import { useMotion } from "@/components/MotionProvider";
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
