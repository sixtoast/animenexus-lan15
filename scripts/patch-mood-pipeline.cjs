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

try {
  patchAnilist();
  patchDetail();
} catch (e) {
  console.error("[patch-mood]", e.message);
}
