/**
 * Niche production metadata (API Expansion II Sprint 10).
 * Normalize staff/studio credits into KEY CREATIVE DNA — not a raw dump.
 */

import type { CreatorCredit, ProductionCredit } from "./deep-metadata";

export type CreativeRoleKey =
  | "director"
  | "series_composition"
  | "original_creator"
  | "character_design"
  | "music"
  | "animation_studio"
  | "producer"
  | "other";

export type CreativeDnaSlot = {
  role: CreativeRoleKey;
  label: string;
  names: string[];
  sources: string[];
};

const ROLE_PATTERNS: { key: CreativeRoleKey; label: string; match: RegExp }[] =
  [
    {
      key: "director",
      label: "Director",
      match: /\b(director|chief\s*director|episode\s*director)\b/i,
    },
    {
      key: "series_composition",
      label: "Series composition",
      match: /series\s*composition|script|screenwriter|screenplay/i,
    },
    {
      key: "original_creator",
      label: "Original creator",
      match: /original\s*(creator|work|story)|manga|novel|creator/i,
    },
    {
      key: "character_design",
      label: "Character design",
      match: /character\s*design/i,
    },
    {
      key: "music",
      label: "Music",
      match: /\b(music|composer|sound\s*director)\b/i,
    },
    {
      key: "animation_studio",
      label: "Animation",
      match: /animation\s*studio|animation\s*production|studio/i,
    },
    {
      key: "producer",
      label: "Producer",
      match: /\bproducer\b/i,
    },
  ];

function classifyRole(role: string): { key: CreativeRoleKey; label: string } {
  for (const p of ROLE_PATTERNS) {
    if (p.match.test(role)) return { key: p.key, label: p.label };
  }
  return { key: "other", label: role || "Other" };
}

export type StaffLike = {
  name: string;
  roles: string[];
  source?: string;
};

/**
 * Build KEY CREATIVE DNA slots from Jikan-style staff + deep production credits.
 * Caps names per slot; "other" omitted from the primary DNA strip.
 */
export function buildCreativeDna(opts: {
  staff?: StaffLike[];
  production?: ProductionCredit[];
  creators?: CreatorCredit[];
  studios?: string[];
}): CreativeDnaSlot[] {
  const buckets = new Map<
    CreativeRoleKey,
    { label: string; names: Set<string>; sources: Set<string> }
  >();

  const add = (
    key: CreativeRoleKey,
    label: string,
    name: string,
    source: string,
  ) => {
    const n = name.trim();
    if (!n) return;
    let b = buckets.get(key);
    if (!b) {
      b = { label, names: new Set(), sources: new Set() };
      buckets.set(key, b);
    }
    b.names.add(n);
    b.sources.add(source);
  };

  for (const s of opts.staff || []) {
    const src = s.source || "jikan";
    for (const role of s.roles.length ? s.roles : ["Staff"]) {
      const { key, label } = classifyRole(role);
      if (key === "other") continue;
      add(key, label, s.name, src);
    }
  }

  for (const p of opts.production || []) {
    const { key, label } = classifyRole(p.role);
    if (key === "other" && !p.studio) continue;
    const k = p.studio ? "animation_studio" : key;
    const lab = p.studio ? "Animation" : label;
    add(k, lab, p.name, p.source);
  }

  for (const c of opts.creators || []) {
    const { key, label } = classifyRole(c.role);
    if (key === "other") continue;
    add(key, label, c.name, c.source);
  }

  for (const st of opts.studios || []) {
    add("animation_studio", "Animation", st, "anilist");
  }

  const order: CreativeRoleKey[] = [
    "director",
    "series_composition",
    "original_creator",
    "character_design",
    "music",
    "animation_studio",
    "producer",
  ];

  const slots: CreativeDnaSlot[] = [];
  for (const key of order) {
    const b = buckets.get(key);
    if (!b || b.names.size === 0) continue;
    slots.push({
      role: key,
      label: b.label,
      names: [...b.names].slice(0, 4),
      sources: [...b.sources],
    });
  }
  return slots;
}

/** Full flat list for "Full credits" expand. */
export function fullCreditLines(opts: {
  staff?: StaffLike[];
  production?: ProductionCredit[];
  creators?: CreatorCredit[];
}): { name: string; role: string; source: string }[] {
  const lines: { name: string; role: string; source: string }[] = [];
  for (const s of opts.staff || []) {
    for (const role of s.roles.length ? s.roles : ["Staff"]) {
      lines.push({ name: s.name, role, source: s.source || "jikan" });
    }
  }
  for (const p of opts.production || []) {
    lines.push({ name: p.name, role: p.role, source: p.source });
  }
  for (const c of opts.creators || []) {
    lines.push({ name: c.name, role: c.role, source: c.source });
  }
  return lines;
}
