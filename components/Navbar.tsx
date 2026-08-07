"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/Button";
import { OnAir } from "@/components/ui/OnAir";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/browse", label: "Browse" },
  { href: "/seasonal", label: "Seasonal" },
  { href: "/daily", label: "Daily" },
  { href: "/tools", label: "Tools" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/taste", label: "Taste" },
  { href: "/account", label: "Account" },
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
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="nav-right">
          <OnAir className="nav-on-air" />
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
            {open ? "Close" : "Menu"}
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
            className="nav-mobile"
            aria-label="Mobile primary"
          >
            <p className="nav-mobile-kicker">Frequency</p>
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
                      <span>{l.label}</span>
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
