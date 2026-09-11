/**
 * Idempotent postinstall patches for AniList tagDetails + fingerprint rank scaling.
 */
const fs = require("fs");
const path = require("path");

function patchFingerprint() {
  const file = path.join(__dirname, "..", "lib/intelligence/items/fingerprint-builder.ts");
  if (!fs.existsSync(file)) return;
  let t = fs.readFileSync(file, "utf8");
  if (t.includes("rankByName")) {
    console.log("[patch-evidence] fingerprint already has rankByName");
    return;
  }
  const old = `  const tagSet = new Set(
    (anime.tags || []).map((x) => String(x).toLowerCase().trim()),
  );
  const labels = [
    ...(anime.tags || []),
    anime.genre,
    ...(options?.deepTagNames || []),
  ].filter(Boolean);

  for (const lab of labels) {
    const p = evidenceFromLabel(String(lab));
    if (!p) continue;
    const key = String(lab).toLowerCase().trim();
    const isDeep = deepSet.has(key);
    const isGenreOnly =
      key === String(anime.genre || "").toLowerCase().trim() && !tagSet.has(key);
    let source = p.source;
    let weight = p.weight;
    if (isDeep) {
      source = "deep-tags";
      weight = Math.max(weight, 0.72);
    } else if (isGenreOnly) {
      source = "genre-fallback";
      weight = weight * 0.7;
    } else if (p.source === "genre-fallback" && tagSet.has(key)) {
      source = "anilist-tags";
    }
    patches.push({ ...p, source, weight });
  }`;
  const neu = `  const tagSet = new Set(
    (anime.tags || []).map((x) => String(x).toLowerCase().trim()),
  );
  const rankByName = new Map();
  for (const td of anime.tagDetails || []) {
    if (!td?.name) continue;
    if (typeof td.rank === "number") {
      rankByName.set(String(td.name).toLowerCase().trim(), td.rank / 100);
    }
  }
  const labels = [
    ...(anime.tags || []),
    anime.genre,
    ...(options?.deepTagNames || []),
  ].filter(Boolean);

  for (const lab of labels) {
    const p = evidenceFromLabel(String(lab));
    if (!p) continue;
    const key = String(lab).toLowerCase().trim();
    const isDeep = deepSet.has(key);
    const isGenreOnly =
      key === String(anime.genre || "").toLowerCase().trim() && !tagSet.has(key);
    let source = p.source;
    let weight = p.weight;
    if (isDeep) {
      source = "deep-tags";
      weight = Math.max(weight, 0.72);
    } else if (isGenreOnly) {
      source = "genre-fallback";
      weight = weight * 0.7;
    } else if (p.source === "genre-fallback" && tagSet.has(key)) {
      source = "anilist-tags";
    }
    const relevance = rankByName.get(key);
    if (typeof relevance === "number") {
      weight = weight * (0.55 + relevance * 0.45);
      source = "anilist-tags";
    }
    patches.push({ ...p, source, weight });
  }`;
  if (!t.includes(old)) {
    console.log("[patch-evidence] fingerprint pattern not found");
    return;
  }
  fs.writeFileSync(file, t.replace(old, neu));
  console.log("[patch-evidence] fingerprint rank scaling applied");
}

function patchAnilist() {
  const file = path.join(__dirname, "..", "lib/anilist.ts");
  if (!fs.existsSync(file)) return;
  let t = fs.readFileSync(file, "utf8");
  if (t.includes("tagDetails:")) {
    console.log("[patch-evidence] anilist tagDetails already present");
    return;
  }
  const old = `    tags: Array.isArray(item.tags)
      ? (item.tags as { name?: string; rank?: number }[])
          .slice()
          .sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0))
          .map((tg) => tg.name)
          .filter((n): n is string => Boolean(n))
      : [],`;
  const neu = `    tags: Array.isArray(item.tags)
      ? (item.tags as {
          id?: number;
          name?: string;
          rank?: number;
          description?: string;
          category?: string;
          isGeneralSpoiler?: boolean;
          isMediaSpoiler?: boolean;
        }[])
          .slice()
          .sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0))
          .map((tg) => tg.name)
          .filter((n): n is string => Boolean(n))
      : [],
    tagDetails: Array.isArray(item.tags)
      ? (item.tags as {
          id?: number;
          name?: string;
          rank?: number;
          description?: string;
          category?: string;
          isGeneralSpoiler?: boolean;
          isMediaSpoiler?: boolean;
        }[])
          .filter((tg) => Boolean(tg.name))
          .sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0))
          .map((tg) => ({
            id: tg.id ?? tg.name!,
            name: tg.name!,
            description: tg.description ?? null,
            category: tg.category ?? null,
            rank: tg.rank ?? null,
            isGeneralSpoiler: Boolean(tg.isGeneralSpoiler),
            isMediaSpoiler: Boolean(tg.isMediaSpoiler),
            source: "anilist" as const,
          }))
      : undefined,`;
  if (!t.includes(old)) {
    console.log("[patch-evidence] anilist pattern not found");
    return;
  }
  fs.writeFileSync(file, t.replace(old, neu));
  console.log("[patch-evidence] anilist tagDetails applied");
}

patchFingerprint();
patchAnilist();
