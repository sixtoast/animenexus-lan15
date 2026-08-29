"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useTheme } from "@/components/ThemeProvider";
import { MotionToggle } from "@/components/MotionToggle";
import { Button } from "@/components/ui/Button";
import { OnAir } from "@/components/ui/OnAir";
import { playCue } from "@/lib/sound-engine";
import { NexusIcon } from "@/components/ui/NexusIcon";

const LINKS = [
  { href: "/", label: "Home", poetic: "Signal" },
  { href: "/browse", label: "Browse", poetic: "Catalog" },
  { href: "/seasonal", label: "Seasonal", poetic: "Season" },
  { href: "/daily", label: "Daily", poetic: "Ritual" },
  { href: "/tools", label: "Tools", poetic: "Desk" },
  { href: "/watchlist", label: "Watchlist", poetic: "Shelf" },
  { href: "/taste", label: "Taste", poetic: "Profile" },
  { href: "/journey", label: "Journey", poetic: "Archive" },
  { href: "/account", label: "Account", poetic: "Identity" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [logoPulse, setLogoPulse] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const listRef = useRef<HTMLUListElement>(null);
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [indicator, setIndicator] = useState({
    left: 0,
    width: 0,
    ready: false,
  });
  const prevPath = useRef(pathname);

  const measureIndicator = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const idx = LINKS.findIndex((l) => isActive(pathname, l.href));
    const el = idx >= 0 ? linkRefs.current[idx] : null;
    if (!el) {
      setIndicator((s) => ({ ...s, width: 0, ready: false }));
      return;
    }
    const lr = list.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    setIndicator({
      left: er.left - lr.left + list.scrollLeft,
      width: er.width,
      ready: true,
    });
  }, [pathname]);

  useLayoutEffect(() => {
    measureIndicator();
  }, [measureIndicator, pathname]);

  useEffect(() => {
    window.addEventListener("resize", measureIndicator);
    return () => window.removeEventListener("resize", measureIndicator);
  }, [measureIndicator]);

  useEffect(() => {
    if (pathname === "/") {
      setLogoPulse(true);
      const t = window.setTimeout(() => setLogoPulse(false), 900);
      return () => window.clearTimeout(t);
    }
  }, [pathname]);

  useEffect(() => {
    if (prevPath.current !== pathname) {
      playCue("nav_click");
      prevPath.current = pathname;
    }
  }, [pathname]);

  useEffect(() => {
    setOpen(false);
    setClosing(false);
  }, [pathname]);

  function closeMenu() {
    setClosing(true);
    window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 180);
  }

  return (
    <header className="site-header">
      <div className="container nav-inner">
        <Link
          href="/"
          className={"logo" + (logoPulse ? " logo--pulse" : "")}
          onClick={() => playCue("ui_tap")}
        >
          Anime<span>Nexus</span>
        </Link>

        <nav className="nav-desktop" aria-label="Primary">
          <ul ref={listRef} className="nav-list">
            {LINKS.map((l, i) => (
              <li key={l.href}>
                <Link
                  ref={(el) => {
                    linkRefs.current[i] = el;
                  }}
                  href={l.href}
                  className={
                    "nav-link" + (isActive(pathname, l.href) ? " active" : "")
                  }
                  onClick={() => playCue("nav_click")}
                >
                  <span className="nav-link-label">{l.label}</span>
                  <span className="nav-link-poetic">{l.poetic}</span>
                </Link>
              </li>
            ))}
            {indicator.ready ? (
              <li
                className="nav-indicator"
                aria-hidden
                style={{
                  transform: `translateX(${indicator.left}px)`,
                  width: indicator.width,
                }}
              />
            ) : null}
          </ul>
        </nav>

        <div className="nav-actions">
          <OnAir />
          <MotionToggle />
          <Button
            variant="outline"
            size="sm"
            className="nav-theme-btn"
            onClick={() => {
              toggleTheme();
              playCue("ui_tap");
            }}
            aria-label={theme === "dark" ? "Switch to light" : "Switch to dark"}
          >
            {theme === "dark" ? (
              <NexusIcon name="theme-light" size="sm" />
            ) : (
              <NexusIcon name="theme-dark" size="sm" />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="nav-menu-btn"
            aria-expanded={open}
            aria-controls="nav-drawer"
            onClick={() => {
              if (open) closeMenu();
              else {
                setOpen(true);
                playCue("ui_tap");
              }
            }}
          >
            Menu
          </Button>
        </div>
      </div>

      {open || closing ? (
        <div
          id="nav-drawer"
          className={
            "nav-drawer" + (closing ? " nav-drawer--out" : " nav-drawer--in")
          }
        >
          <div className="container">
            <ul className="nav-drawer-list">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className={
                      "nav-drawer-link" +
                      (isActive(pathname, l.href) ? " active" : "")
                    }
                    onClick={() => {
                      playCue("nav_click");
                      closeMenu();
                    }}
                  >
                    {l.label}
                    <span className="nav-drawer-poetic">{l.poetic} →</span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="nav-drawer-foot">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  toggleTheme();
                  playCue("ui_tap");
                }}
              >
                <>
                  <NexusIcon
                    name={theme === "dark" ? "theme-light" : "theme-dark"}
                    size="sm"
                  />
                  {theme === "dark" ? " Light frequency" : " Dark frequency"}
                </>
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
