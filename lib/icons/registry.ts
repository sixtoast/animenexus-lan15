/**
 * Semantic icon registry (Creative Sprints 18–21).
 *
 * Product chrome uses these names only. Proprietary marks are first-class
 * (seal, signal, resonance, frequency, living-shelf, taste-mirror, night-desk).
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
  | "empty"
  /** Proprietary AnimeNexus family (Sprint 21) */
  | "resonance"
  | "frequency"
  | "living-shelf"
  | "taste-mirror"
  | "night-desk"
  | "lantern";

export type IconClass =
  | "navigation"
  | "action"
  | "status"
  | "tool"
  | "decorative"
  | "social"
  | "provider"
  | "brand";

export type IconDef = {
  name: NexusIconName;
  glyph: string;
  label: string;
  class: IconClass;
  /** Offline design reference only — never loaded at runtime */
  designRef?: string;
  /** True when mark is proprietary to AnimeNexus */
  proprietary?: boolean;
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
    class: "brand",
    proprietary: true,
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
    class: "brand",
    proprietary: true,
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
  resonance: {
    name: "resonance",
    glyph: "∿",
    label: "Resonance",
    class: "brand",
    proprietary: true,
  },
  frequency: {
    name: "frequency",
    glyph: "▥",
    label: "Frequency",
    class: "brand",
    proprietary: true,
  },
  "living-shelf": {
    name: "living-shelf",
    glyph: "▣",
    label: "Living Shelf",
    class: "brand",
    proprietary: true,
  },
  "taste-mirror": {
    name: "taste-mirror",
    glyph: "◇",
    label: "Taste Mirror",
    class: "brand",
    proprietary: true,
  },
  "night-desk": {
    name: "night-desk",
    glyph: "✦",
    label: "Night Desk",
    class: "brand",
    proprietary: true,
  },
  lantern: {
    name: "lantern",
    glyph: "◉",
    label: "Lantern",
    class: "brand",
    proprietary: true,
  },
};

export function getIconDef(name: NexusIconName): IconDef {
  return NEXUS_ICONS[name];
}

export function listIconsByClass(cls: IconClass): IconDef[] {
  return Object.values(NEXUS_ICONS).filter((i) => i.class === cls);
}

export function listProprietaryIcons(): IconDef[] {
  return Object.values(NEXUS_ICONS).filter((i) => i.proprietary);
}
