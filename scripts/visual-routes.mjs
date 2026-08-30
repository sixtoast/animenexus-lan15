#!/usr/bin/env node
/**
 * Creative Sprint 49 — print visual regression route matrix.
 * Use with Playwright / Percy / manual screenshot tools.
 */

const ROUTES = [
  { id: "home", path: "/" },
  { id: "browse", path: "/browse" },
  { id: "watchlist", path: "/watchlist" },
  { id: "journey", path: "/journey" },
  { id: "radar", path: "/tools/radar" },
  { id: "oracle", path: "/tools/oracle" },
  { id: "sauce", path: "/tools/sauce" },
  { id: "challenge", path: "/tools/challenge" },
  { id: "session-cover", path: "/tools/session-cover" },
  { id: "account", path: "/account" },
  { id: "showcase", path: "/showcase" },
];

const VIEWPORTS = [
  { id: "desktop", width: 1280, height: 800 },
  { id: "mobile", width: 390, height: 844 },
];

console.log("AnimeNexus visual regression matrix\n");
for (const r of ROUTES) {
  for (const v of VIEWPORTS) {
    console.log(`${r.id.padEnd(16)} ${v.id.padEnd(8)} ${r.path}`);
  }
}
console.log("\nVariants: theme=dark|light · motion=full|reduced · tier=FULL|MINIMAL");
