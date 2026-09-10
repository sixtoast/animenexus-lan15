/** Apply critical Mood pipeline fixes if not already present. */
const fs = require("fs");
const path = require("path");

function patchAnilist() {
  const file = path.join(process.cwd(), "lib/anilist.ts");
  if (!fs.existsSync(file)) return;
  let t = fs.readFileSync(file, "utf8");
  let changed = false;
  if (!t.includes("tags {") && t.includes("genres\n  status")) {
    t = t.replace(
      "genres\n  status",
      "genres\n  tags {\n    id\n    name\n    description\n    category\n    rank\n    isGeneralSpoiler\n    isMediaSpoiler\n  }\n  idMal\n  status",
    );
    changed = true;
  }
  if (t.includes("tags: genres,")) {
    t = t.replace(
      "tags: genres,",
      `tags: Array.isArray(item.tags)
      ? (item.tags as { name?: string; rank?: number }[])
          .slice()
          .sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0))
          .map((tg) => tg.name)
          .filter((n): n is string => Boolean(n))
      : [],
    idMal: (item.idMal as number) || null,`,
    );
    changed = true;
  }
  if (!t.includes("$tag: String") && t.includes("$genre: String")) {
    t = t.replace("$genre: String", "$genre: String, $tag: String");
    t = t.replace("genre: $genre", "genre: $genre, tag: $tag");
    t = t.replace(
      "if (filters.genre) variables.genre = filters.genre;",
      "if (filters.genre) variables.genre = filters.genre;\n  if (filters.tag) variables.tag = filters.tag;",
    );
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(file, t);
    console.log("[patch-mood] anilist tags fixed");
  } else {
    console.log("[patch-mood] anilist already patched");
  }
}

function patchDetail() {
  const file = path.join(process.cwd(), "app/anime/[id]/page.tsx");
  if (!fs.existsSync(file)) return;
  let t = fs.readFileSync(file, "utf8");
  if (t.includes("fetchAnimeByLooseId")) {
    console.log("[patch-mood] detail already uses loose id");
    return;
  }
  if (!t.includes('from "@/lib/fetch-by-identity"')) {
    t = t.replace(
      'import { fetchAnimeById } from "@/lib/anilist";',
      'import { fetchAnimeById } from "@/lib/anilist";\nimport { fetchAnimeByLooseId } from "@/lib/fetch-by-identity";',
    );
  }
  t = t.replace(
    "const anime = await fetchAnimeById(num);",
    "const anime = await fetchAnimeByLooseId(num);",
  );
  fs.writeFileSync(file, t);
  console.log("[patch-mood] detail page loose id");
}

function patchIdentity() {
  const file = path.join(process.cwd(), "lib/anime-identity.ts");
  if (!fs.existsSync(file)) return;
  let t = fs.readFileSync(file, "utf8");
  let changed = false;
  if (!t.includes("nexusId") && t.includes("export type AnimeIdentity")) {
    t = t.replace(
      "export type AnimeIdentity = {\n  /** Primary catalog key \u2014 AniList when known */\n  anilistId: number | null;",
      `export type AnimeIdentity = {
  /**
   * Canonical cross-provider key. MUST encode provider.
   * Examples: anilist:9253 | mal:7785 | kitsu:12 | shikimori:9253
   */
  nexusId?: string;
  /** Primary catalog key \u2014 AniList when known */
  anilistId: number | null;`,
    );
    changed = true;
  }
  if (!t.includes("export function ensureNexusId")) {
    t =
      t.trimEnd() +
      `

/** Build a provider-safe nexus id. Never use a bare number as canonical identity. */
export function makeNexusId(
  provider: "anilist" | "mal" | "kitsu" | "shikimori" | "tmdb" | "anidb",
  id: number | string,
): string {
  return \`\${provider}:\${id}\`;
}

export function parseNexusId(nexusId: string): {
  provider: string;
  id: string;
} | null {
  const i = nexusId.indexOf(":");
  if (i <= 0) return null;
  return { provider: nexusId.slice(0, i), id: nexusId.slice(i + 1) };
}

/** Prefer AniList, then MAL, then Kitsu, then Shikimori for nexusId. */
export function ensureNexusId(identity: AnimeIdentity): AnimeIdentity {
  if (identity.nexusId && identity.nexusId.includes(":")) return identity;
  if (identity.anilistId != null && identity.anilistId > 0) {
    return { ...identity, nexusId: makeNexusId("anilist", identity.anilistId) };
  }
  if (identity.malId != null && identity.malId > 0) {
    return { ...identity, nexusId: makeNexusId("mal", identity.malId) };
  }
  if (identity.kitsuId) {
    return { ...identity, nexusId: makeNexusId("kitsu", identity.kitsuId) };
  }
  if (identity.shikimoriId) {
    return {
      ...identity,
      nexusId: makeNexusId("shikimori", identity.shikimoriId),
    };
  }
  return {
    ...identity,
    nexusId: makeNexusId("anilist", identity.anilistId ?? 0),
  };
}
`;
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(file, t);
    console.log("[patch-mood] anime-identity nexus helpers");
  } else {
    console.log("[patch-mood] identity already has nexus helpers");
  }
}

function patchTypes() {
  const file = path.join(process.cwd(), "lib/types.ts");
  if (!fs.existsSync(file)) return;
  let t = fs.readFileSync(file, "utf8");
  let changed = false;
  if (t.includes("export type AnimeFilters") && !t.includes("tag?: string")) {
    t = t.replace(
      "export type AnimeFilters = {\n  genre?: string;",
      "export type AnimeFilters = {\n  genre?: string;\n  /** Real AniList tag name \u2014 never a product semantic dim */\n  tag?: string;",
    );
    changed = true;
  }
  if (!t.includes("idMal?:") && t.includes("anilist_id: number;")) {
    t = t.replace(
      "  anilist_id: number;",
      "  anilist_id: number;\n  idMal?: number | null;",
    );
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(file, t);
    console.log("[patch-mood] types AnimeFilters.tag + idMal");
  } else {
    console.log("[patch-mood] types already patched");
  }
}

try {
  patchAnilist();
  patchDetail();
  patchIdentity();
  patchTypes();
} catch (e) {
  console.error("[patch-mood]", e.message);
}
