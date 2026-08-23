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

  // Home return / first mount — subtle logo accent pulse
  useEffect(() => {
    if (pathname === "/") {
      setLogoPulse(true);
      const t = window.setTimeout(() => setLogoPulse(false), 1200);
      return () => window.clearTimeout(t);
    }
  }, [pathname]);

  // Route change: light nav tick (not on every hover)
  useEffect(() => {
    if (prevPath.current !== pathname) {
      playCue("nav_tick");
      prevPath.current = pathname;
    }
    setOpen(false);
    setClosing(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open || closing ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, closing]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function openMenu() {
    setClosing(false);
    setOpen(true);
    playCue("menu_open");
  }

  function closeMenu() {
    if (!open) return;
    setClosing(true);
    playCue("menu_close");
    window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 180);
  }

  function toggleMenu() {
    if (open) closeMenu();
    else openMenu();
  }

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link
          href="/"
          className={"logo" + (logoPulse ? " logo--pulse" : "")}
          aria-label="AnimeNexus home"
        >
          Anime<span>Nexus</span>
        </Link>

        <nav className="nav-desktop" aria-label="Primary">
          <ul className="nav-links" ref={listRef}>
            <span
              className={
                "nav-indicator" + (indicator.ready ? " nav-indicator--on" : "")
              }
              aria-hidden
              style={{
                transform: `translateX(${indicator.left}px)`,
                width: indicator.width,
              }}
            />
            {LINKS.map((l, i) => {
              const active = isActive(pathname, l.href);
              return (
                <li key={l.label}>
                  <Link
                    ref={(el) => {
                      linkRefs.current[i] = el;
                    }}
                    href={l.href}
                    className={"nav-link ix-nav" + (active ? " active" : "")}
                    aria-current={active ? "page" : undefined}
                    title={l.poetic ? `${l.label} · ${l.poetic}` : l.label}
                  >
                    <span className="nav-link-label">{l.label}</span>
                    {l.poetic ? (
                      <span className="nav-link-poetic" aria-hidden>
                        {l.poetic}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="nav-right">
          <OnAir className="nav-on-air" />
          <MotionToggle />
          <Button
            variant="icon"
            size="sm"
            onClick={toggleTheme}
            title="Toggle theme"
            aria-label="Toggle light/dark theme"
            className="theme-toggle-btn"
            silent
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="nav-toggle"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={toggleMenu}
            silent
          >
            {open ? "Close" : "Frequency"}
          </Button>
        </div>
      </div>

      {open || closing ? (
        <>
          <button
            type="button"
            className={
              "nav-scrim" + (closing ? " nav-scrim--out" : "")
            }
            aria-label="Close menu"
            onClick={closeMenu}
          />
          <nav
            id="mobile-nav"
            className={
              "nav-mobile nav-mobile--frequency" +
              (closing ? " nav-mobile--out" : "")
            }
            aria-label="Frequency menu"
          >
            <div className="nav-mobile-head">
              <p className="nav-mobile-kicker">Frequency</p>
              <p className="nav-mobile-sub">
                Choose a channel · same site, clearer mood
              </p>
            </div>
            <ul>
              {LINKS.map((l) => {
                const active = isActive(pathname, l.href);
                return (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className={
                        "nav-mobile-link" + (active ? " active" : "")
                      }
                      aria-current={active ? "page" : undefined}
                      onClick={() => closeMenu()}
                    >
                      <span className="nav-mobile-main">
                        <span className="nav-mobile-label">{l.label}</span>
                        {l.poetic ? (
                          <span className="nav-mobile-poetic">{l.poetic}</span>
                        ) : null}
                      </span>
                      {active ? (
                        <span className="nav-mobile-here">Here</span>
                      ) : (
                        <span className="nav-mobile-chev" aria-hidden>
                          →
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="nav-mobile-foot">
              <Button
                variant="ghost"
                size="sm"
                silent
                onClick={() => {
                  toggleTheme();
                }}
              >
                {theme === "dark" ? "☀️ Light frequency" : "🌙 Dark frequency"}
              </Button>
            </div>
          </nav>
        </>
      ) : null}
    </header>
  );
}
