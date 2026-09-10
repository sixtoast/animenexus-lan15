/** Surgical Mood pipeline AniList + identity fixes for Vercel postinstall. */
const fs = require("fs");
const path = require("path");

function restoreAnilistFromB64() {
  const b64 = path.join(process.cwd(), "scripts/lib__anilist.ts.b64");
  const dest = path.join(process.cwd(), "lib/anilist.ts");
  if (!fs.existsSync(b64)) return false;
  const text = Buffer.from(fs.readFileSync(b64, "utf8"), "base64").toString(
    "utf8",
  );
  if (
    text.includes("tag: $tag") &&
    text.includes("filters.tag") &&
    !text.includes("tags: genres,")
  ) {
    fs.writeFileSync(dest, text);
    console.log("[patch-mood] restored lib/anilist.ts from b64 snapshot");
    return true;
  }
  return false;
}

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

  if (!t.includes("$tag") && t.includes("$genre: String")) {
    t = t.replace("$genre: String", "$genre: String\n      $tag: String");
    t = t.replace(
      "genre: $genre\n          status:",
      "genre: $genre\n          tag: $tag\n          status:",
    );
    if (!t.includes("if (filters.tag)")) {
      t = t.replace(
        "if (filters.genre) variables.genre = filters.genre;",
        "if (filters.genre) variables.genre = filters.genre;\n  if (filters.tag) variables.tag = filters.tag;",
      );
    }
    changed = true;
  }

  if (
    t.includes('"filtered"') &&
    t.includes("filters.genre,\n    filters.status")
  ) {
    t = t.replace(
      "filters.genre,\n    filters.status",
      "filters.genre,\n    filters.tag,\n    filters.status",
    );
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, t);
    console.log("[patch-mood] anilist tags + filter + cache fixed");
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
      "export type AnimeIdentity = {\n  /** Primary catalog key — AniList when known */\n  anilistId: number | null;",
      `export type AnimeIdentity = {
  nexusId?: string;
  /** Primary catalog key — AniList when known */
  anilistId: number | null;`,
    );
    changed = true;
  }
  if (!t.includes("export function ensureNexusId")) {
    t =
      t.trimEnd() +
      `

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
      "export type AnimeFilters = {\n  genre?: string;\n  tag?: string;",
    );
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(file, t);
    console.log("[patch-mood] types AnimeFilters.tag");
  } else {
    console.log("[patch-mood] types already patched");
  }
}

function patchCandidatesV3() {
  const file = path.join(
    process.cwd(),
    "lib/intelligence/recommendation/candidates-v3.ts",
  );
  if (!fs.existsSync(file)) return;
  let t = fs.readFileSync(file, "utf8");
  if (!t.includes("title: exp.label")) {
    console.log("[patch-mood] candidates-v3 no fake mood anime");
    return;
  }
  const start = t.indexOf("function intentPullVector");
  const end = t.indexOf("\nfunction shelfAnime", start);
  if (start < 0 || end < 0) {
    console.log("[patch-mood] candidates-v3 intentPullVector block not found");
    return;
  }
  const replacement = `function intentPullVector(
  base: FingerprintVector,
  exp: ExperienceIntent,
): FingerprintVector {
  const out: FingerprintVector = { ...base };
  const target = exp.fingerprintTarget || {};
  for (const [k, v] of Object.entries(target)) {
    if (typeof v === "number") {
      out[k] = (out[k] ?? 0.5) * 0.25 + v * 0.75;
    }
  }
  return out;
}

`;
  t = t.slice(0, start) + replacement + t.slice(end);
  fs.writeFileSync(file, t);
  console.log("[patch-mood] candidates-v3 fake mood anime removed");
}

function patchRankerFingerprint() {
  const file = path.join(
    process.cwd(),
    "lib/intelligence/recommendation/ranker-v3.ts",
  );
  if (!fs.existsSync(file)) return;
  let t = fs.readFileSync(file, "utf8");
  let changed = false;
  if (
    !t.includes("fingerprint?:") &&
    t.includes("fingerprintConfidence?: number;")
  ) {
    t = t.replace(
      "  fingerprintConfidence?: number;\n};",
      '  fingerprint?: import("@/lib/intelligence/items/anime-preference-fingerprint").AnimePreferenceFingerprint;\n  fingerprintConfidence?: number;\n};',
    );
    changed = true;
  }
  if (
    t.includes("fingerprintConfidence: fp.confidence.overall,") &&
    !t.includes("fingerprint: fp,\n      fingerprintConfidence")
  ) {
    t = t.replace(
      "fingerprintConfidence: fp.confidence.overall,",
      "fingerprint: fp,\n      fingerprintConfidence: fp.confidence.overall,",
    );
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(file, t);
    console.log("[patch-mood] ranker attaches real fingerprint");
  } else {
    console.log("[patch-mood] ranker fingerprint field ok");
  }
}

function patchViewingIntentFit() {
  const file = path.join(process.cwd(), "lib/viewing-intent.ts");
  if (!fs.existsSync(file)) return;
  let t = fs.readFileSync(file, "utf8");
  if (t.includes("rawFit")) {
    console.log("[patch-mood] fingerprintIntentFit already uses rawFit");
    return;
  }
  if (t.includes("const fit = 1 - Math.abs(actual - desired)")) {
    t = t.replace(
      "const fit = 1 - Math.abs(actual - desired);",
      "const rawFit = 1 - Math.abs(actual - desired);\n    const effectiveFit = 0.5 + (rawFit - 0.5) * confidence;",
    );
    t = t.replace(
      "score += clamp01(0.5 + (fit - 0.5) * (0.45 + confidence * 0.55)) * importance;",
      "score += clamp01(effectiveFit) * importance;",
    );
    fs.writeFileSync(file, t);
    console.log("[patch-mood] fingerprintIntentFit formula fixed");
  }
}

try {
  if (!restoreAnilistFromB64()) patchAnilist();
  patchDetail();
  patchIdentity();
  patchTypes();
  patchCandidatesV3();
  patchRankerFingerprint();
  patchViewingIntentFit();
} catch (e) {
  console.error("[patch-mood]", e.message);
}
