"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { MotionToggle } from "@/components/MotionToggle";
import { Button } from "@/components/ui/Button";
import { OnAir } from "@/components/ui/OnAir";

/** Functional label + optional diegetic secondary (Awwwards Sprint 11). */
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
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link href="/" className="logo" aria-label="AnimeNexus home">
          Anime<span>Nexus</span>
        </Link>

        <nav className="nav-desktop" aria-label="Primary">
          <ul className="nav-links">
            {LINKS.map((l) => {
              const active = isActive(pathname, l.href);
              return (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className={"nav-link" + (active ? " active" : "")}
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
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="nav-toggle"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Close" : "Frequency"}
          </Button>
        </div>
      </div>

      {open ? (
        <>
          <button
            type="button"
            className="nav-scrim"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <nav
            id="mobile-nav"
            className="nav-mobile nav-mobile--frequency"
            aria-label="Frequency menu"
          >
            <div className="nav-mobile-head">
              <p className="nav-mobile-kicker">Frequency</p>
              <p className="nav-mobile-sub">Choose a channel · same site, clearer mood</p>
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
                      onClick={() => setOpen(false)}
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
