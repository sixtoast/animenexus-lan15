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
import { NavSoundToggle } from "@/components/NavSoundToggle";
import { Button } from "@/components/ui/Button";
import { OnAir } from "@/components/ui/OnAir";
import { playCue } from "@/lib/sound-engine";
import { NexusIcon } from "@/components/ui/NexusIcon";
import { useSession } from "@/components/SessionProvider";
import { openOmniSearch } from "@/components/CommandPalette";

const PRIMARY = [
  { href: "/", label: "Home", poetic: "Signal" },
  { href: "/seasonal", label: "Seasonal", poetic: "Season" },
  { href: "/watchlist", label: "Watchlist", poetic: "Shelf" },
  { href: "/taste", label: "Taste", poetic: "You" },
  { href: "/tools", label: "Tools", poetic: "Desk" },
];

const MORE = [
  { href: "/browse", label: "Full catalog", poetic: "Filters" },
  { href: "/airing", label: "Airing", poetic: "On air" },
  { href: "/daily", label: "Daily", poetic: "Ritual" },
  { href: "/mood", label: "Moods", poetic: "Intent" },
  { href: "/journey", label: "Journey", poetic: "Archive" },
  { href: "/account", label: "Account", poetic: "Identity" },
];

const DOCK = [
  { href: "/", label: "Home", icon: "\u2302" },
  { href: "/watchlist", label: "Shelf", icon: "\u25a3" },
  { href: "__search__", label: "Search", icon: "\u2315" },
  { href: "/taste", label: "Taste", icon: "\u25ce" },
  { href: "__more__", label: "More", icon: "\u2630" },
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
  const { session, ready, disconnect } = useSession();
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
    const idx = PRIMARY.findIndex((l) => isActive(pathname, l.href));
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
  }, [measureIndicator]);

  useEffect(() => {
    window.addEventListener("resize", measureIndicator);
    return () => window.removeEventListener("resize", measureIndicator);
  }, [measureIndicator]);

  useEffect(() => {
    if (prevPath.current !== pathname) {
      setLogoPulse(true);
      const t = window.setTimeout(() => setLogoPulse(false), 600);
      prevPath.current = pathname;
      return () => window.clearTimeout(t);
    }
  }, [pathname]);

  useEffect(() => {
    setOpen(false);
    setClosing(false);
  }, [pathname]);

  function closeMenu() {
    if (!open) return;
    setClosing(true);
    window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 220);
  }

  function toggleMenu() {
    if (open) closeMenu();
    else {
      setClosing(false);
      setOpen(true);
      playCue("filter_select");
    }
  }

  function onSearch() {
    playCue("filter_select");
    openOmniSearch();
  }

  return (
    <>
      <header className="site-header">
        <div className="container nav-bar">
          <Link
            href="/"
            className={"nav-brand" + (logoPulse ? " nav-brand--pulse" : "")}
            onClick={() => playCue("filter_select")}
          >
            <span className="nav-brand-mark" aria-hidden />
            <span className="nav-brand-text">
              AnimeNexus
              <span className="nav-brand-sub">Lantern</span>
            </span>
          </Link>

          <nav className="nav-desktop" aria-label="Primary">
            <ul className="nav-links" ref={listRef}>
              {PRIMARY.map((l, i) => {
                const active = isActive(pathname, l.href);
                return (
                  <li key={l.href}>
                    <Link
                      ref={(el) => {
                        linkRefs.current[i] = el;
                      }}
                      href={l.href}
                      className={
                        "nav-link ix-nav" + (active ? " active" : "")
                      }
                      aria-current={active ? "page" : undefined}
                      onClick={() => playCue("filter_select")}
                    >
                      <span className="nav-link-label">{l.label}</span>
                      <span className="nav-link-poetic" aria-hidden>
                        {l.poetic}
                      </span>
                    </Link>
                  </li>
                );
              })}
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
            <Button
              variant="outline"
              size="sm"
              className="nav-search-btn"
              aria-label="Search"
              title="Search ( / or \u2318K )"
              onClick={onSearch}
            >
              <span aria-hidden>\u2315</span>
              <span className="nav-search-label">Search</span>
            </Button>
            <MotionToggle />
            <NavSoundToggle />
            <Button
              variant="ghost"
              size="sm"
              className="nav-theme"
              aria-label="Toggle theme"
              silent
              onClick={() => toggleTheme()}
            >
              <NexusIcon
                name={theme === "dark" ? "theme-light" : "theme-dark"}
                size="sm"
              />
            </Button>
            {ready && session ? (
              <Button
                variant="outline"
                size="sm"
                className="nav-logout"
                title={`Log out ${session.username}`}
                aria-label="Log out"
                onClick={() => {
                  disconnect();
                  playCue("filter_select");
                }}
              >
                Log out
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              className="nav-toggle"
              aria-expanded={open}
              aria-controls="mobile-nav"
              onClick={toggleMenu}
              silent
            >
              {open ? "Close" : "More"}
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
              aria-label="More destinations"
            >
              <div className="nav-mobile-head">
                <p className="nav-mobile-kicker">More</p>
                <p className="nav-mobile-sub">
                  Catalog, moods, account \u2014 primary tabs stay on the dock
                </p>
              </div>
              <ul>
                {[...PRIMARY, ...MORE].map((l) => {
                  const active = isActive(pathname, l.href);
                  return (
                    <li key={l.href + l.label}>
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
                            <span className="nav-mobile-poetic">
                              {l.poetic}
                            </span>
                          ) : null}
                        </span>
                        {active ? (
                          <span className="nav-mobile-here">Here</span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <div className="nav-mobile-foot">
                <Button
                  variant="accent"
                  size="sm"
                  onClick={() => {
                    closeMenu();
                    onSearch();
                  }}
                >
                  Open search
                </Button>
                {ready && session ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      disconnect();
                      playCue("filter_select");
                      closeMenu();
                    }}
                  >
                    Log out \u00b7 {session.username}
                  </Button>
                ) : null}
                <NavSoundToggle />
                <Button
                  variant="ghost"
                  size="sm"
                  silent
                  onClick={() => toggleTheme()}
                >
                  <>
                    <NexusIcon
                      name={theme === "dark" ? "theme-light" : "theme-dark"}
                      size="sm"
                    />
                    {theme === "dark" ? " Light" : " Dark"}
                  </>
                </Button>
              </div>
            </nav>
          </>
        ) : null}
      </header>

      <nav className="nav-dock" aria-label="Primary mobile">
        {DOCK.map((item) => {
          if (item.href === "__search__") {
            return (
              <button
                key="search"
                type="button"
                className="nav-dock-item nav-dock-item--search"
                onClick={onSearch}
              >
                <span className="nav-dock-icon" aria-hidden>
                  {item.icon}
                </span>
                <span className="nav-dock-label">{item.label}</span>
              </button>
            );
          }
          if (item.href === "__more__") {
            return (
              <button
                key="more"
                type="button"
                className={
                  "nav-dock-item" + (open ? " nav-dock-item--active" : "")
                }
                aria-expanded={open}
                onClick={toggleMenu}
              >
                <span className="nav-dock-icon" aria-hidden>
                  {item.icon}
                </span>
                <span className="nav-dock-label">{item.label}</span>
              </button>
            );
          }
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                "nav-dock-item" + (active ? " nav-dock-item--active" : "")
              }
              aria-current={active ? "page" : undefined}
              onClick={() => playCue("filter_select")}
            >
              <span className="nav-dock-icon" aria-hidden>
                {item.icon}
              </span>
              <span className="nav-dock-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
