/**
 * Semantic icon registry (Creative Sprint 18 prep → Sprint 19 NexusIcon).
 *
 * App code should request these names — never raw emoji or vendor icon ids
 * in product chrome. Glyphs below are interim unicode until local SVGs land.
 */

export type NexusIconName =
  | "home"
  | "browse"
  | "shelf"
  | "taste"
  | "archive"
  | "radar"
  | "oracle"
  | "search"
  | "settings"
  | "account"
  | "tools"
  | "daily"
  | "seasonal"
  | "journey"
  | "seal"
  | "sauce"
  | "signal"
  | "challenge"
  | "stats"
  | "compare"
  | "theme-light"
  | "theme-dark"
  | "success"
  | "error"
  | "empty";

export type IconClass =
  | "navigation"
  | "action"
  | "status"
  | "tool"
  | "decorative"
  | "social"
  | "provider";

export type IconDef = {
  name: NexusIconName;
  /** Interim glyph — replace with local SVG path in Sprint 20–21 */
  glyph: string;
  label: string;
  class: IconClass;
  /** Future Iconify ref for design only, e.g. phosphor:house */
  designRef?: string;
};

export const NEXUS_ICONS: Record<NexusIconName, IconDef> = {
  home: {
    name: "home",
    glyph: "⌂",
    label: "Home",
    class: "navigation",
    designRef: "ph:house",
  },
  browse: {
    name: "browse",
    glyph: "☰",
    label: "Browse",
    class: "navigation",
    designRef: "ph:squares-four",
  },
  shelf: {
    name: "shelf",
    glyph: "▦",
    label: "Watchlist",
    class: "navigation",
    designRef: "ph:books",
  },
  taste: {
    name: "taste",
    glyph: "◈",
    label: "Taste",
    class: "navigation",
    designRef: "ph:sparkle",
  },
  archive: {
    name: "archive",
    glyph: "▤",
    label: "Journey",
    class: "navigation",
    designRef: "ph:path",
  },
  radar: {
    name: "radar",
    glyph: "◎",
    label: "Radar",
    class: "tool",
    designRef: "ph:broadcast",
  },
  oracle: {
    name: "oracle",
    glyph: "✦",
    label: "Oracle",
    class: "tool",
    designRef: "ph:candle",
  },
  search: {
    name: "search",
    glyph: "⌕",
    label: "Search",
    class: "action",
    designRef: "ph:magnifying-glass",
  },
  settings: {
    name: "settings",
    glyph: "⚙",
    label: "Settings",
    class: "action",
    designRef: "ph:gear",
  },
  account: {
    name: "account",
    glyph: "☺",
    label: "Account",
    class: "navigation",
    designRef: "ph:user",
  },
  tools: {
    name: "tools",
    glyph: "⚒",
    label: "Tools",
    class: "navigation",
    designRef: "ph:wrench",
  },
  daily: {
    name: "daily",
    glyph: "☀",
    label: "Daily",
    class: "navigation",
    designRef: "ph:sun",
  },
  seasonal: {
    name: "seasonal",
    glyph: "❀",
    label: "Seasonal",
    class: "navigation",
    designRef: "ph:calendar",
  },
  journey: {
    name: "journey",
    glyph: "⇢",
    label: "Journey",
    class: "navigation",
    designRef: "ph:path",
  },
  seal: {
    name: "seal",
    glyph: "◉",
    label: "Seal",
    class: "action",
    designRef: "ph:circle",
  },
  sauce: {
    name: "sauce",
    glyph: "⌕",
    label: "Sauce",
    class: "tool",
    designRef: "ph:image",
  },
  signal: {
    name: "signal",
    glyph: "≋",
    label: "Signal",
    class: "status",
    designRef: "ph:wave-sine",
  },
  challenge: {
    name: "challenge",
    glyph: "◎",
    label: "Challenge",
    class: "tool",
    designRef: "ph:target",
  },
  stats: {
    name: "stats",
    glyph: "▦",
    label: "Stats",
    class: "tool",
    designRef: "ph:chart-bar",
  },
  compare: {
    name: "compare",
    glyph: "⇄",
    label: "Compare",
    class: "tool",
    designRef: "ph:arrows-left-right",
  },
  "theme-light": {
    name: "theme-light",
    glyph: "☀",
    label: "Light",
    class: "action",
    designRef: "ph:sun",
  },
  "theme-dark": {
    name: "theme-dark",
    glyph: "☾",
    label: "Dark",
    class: "action",
    designRef: "ph:moon",
  },
  success: {
    name: "success",
    glyph: "✓",
    label: "Success",
    class: "status",
    designRef: "ph:check",
  },
  error: {
    name: "error",
    glyph: "!",
    label: "Error",
    class: "status",
    designRef: "ph:warning",
  },
  empty: {
    name: "empty",
    glyph: "○",
    label: "Empty",
    class: "status",
    designRef: "ph:circle-dashed",
  },
};

export function getIconDef(name: NexusIconName): IconDef {
  return NEXUS_ICONS[name];
}

export function listIconsByClass(cls: IconClass): IconDef[] {
  return Object.values(NEXUS_ICONS).filter((i) => i.class === cls);
}
