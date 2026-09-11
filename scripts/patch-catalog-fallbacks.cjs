/**
 * Postinstall: wire catalog resilience into lib/anilist.ts
 */
const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "lib", "anilist.ts");
let t = fs.readFileSync(file, "utf8");
if (t.includes("catalogFallbacks")) {
  console.log("[patch-catalog] already wired");
  process.exit(0);
}

if (!t.includes("catalog-fallbacks")) {
  t = t.replace(
    'from "./providers/shikimori";',
    `from "./providers/shikimori";
import { catalogFallbacks } from "./catalog-fallbacks";
import {
  malOfficialById,
  isMalOfficialConfigured,
  MAL_OFFICIAL_ID_OFFSET,
} from "./providers/mal-official";
import {
  tmdbAnimeById,
  isTmdbConfigured,
  TMDB_ID_OFFSET,
} from "./providers/tmdb-anime";
import {
  staticByMalId,
  STATIC_ID_OFFSET,
} from "./providers/static-catalog";`,
  );
}

t = t.replace(
  'let lastSource: "anilist" | "kitsu" | "shikimori" = "anilist";',
  'let lastSource: "anilist" | "kitsu" | "shikimori" | "mal" | "simkl" | "tmdb" | "static" | "jikan" = "anilist";',
);

t = t.replace(
  `        lastSource =
          fb.name === "Kitsu"
            ? "kitsu"
            : fb.name === "Shikimori"
              ? "shikimori"
              : lastSource;`,
  `        const name = fb.name.toLowerCase();
        if (name.includes("kitsu")) lastSource = "kitsu";
        else if (name.includes("shikimori")) lastSource = "shikimori";
        else if (name.includes("mal")) lastSource = "mal";
        else if (name.includes("simkl")) lastSource = "simkl";
        else if (name.includes("tmdb")) lastSource = "tmdb";
        else if (name.includes("static")) lastSource = "static";
        else if (name.includes("jikan")) lastSource = "jikan";`,
);

t = t.replace(
  `        [
          { name: "Kitsu", run: () => kitsuDiscover(feed, page, perPage) },
          { name: "Shikimori", run: () => shikiDiscover(feed, page, perPage) },
        ]`,
  `        catalogFallbacks("discover", { feed, page, perPage })`,
);

t = t.replace(
  `      withFallbacks("search", () => anilistSearch(search, page, perPage), [
        { name: "Kitsu", run: () => kitsuSearch(search, page, perPage) },
        { name: "Shikimori", run: () => shikiSearch(search, page, perPage) },
      ])`,
  `      withFallbacks(
        "search",
        () => anilistSearch(search, page, perPage),
        catalogFallbacks("search", { search, page, perPage }),
      )`,
);

t = t.replace(
  `  const fallbacks =
    filters.tag
      ? []
      : [
          { name: "Kitsu", run: () => kitsuFiltered(filters, page, perPage) },
          {
            name: "Shikimori",
            run: () => shikiFiltered(filters, page, perPage),
          },
        ];`,
  `  const fallbacks = filters.tag
    ? []
    : catalogFallbacks("filtered", { filters, page, perPage });`,
);

if (!t.includes("STATIC_ID_OFFSET")) {
  t = t.replace(
    `export async function fetchAnimeById(id: number): Promise<Anime | null> {
  if (id >= SHIKI_ID_OFFSET) {
    lastSource = "shikimori";
    return shikiById(id - SHIKI_ID_OFFSET);
  }
  if (id >= KITSU_ID_OFFSET) {
    lastSource = "kitsu";
    return kitsuById(id - KITSU_ID_OFFSET);
  }`,
    `export async function fetchAnimeById(id: number): Promise<Anime | null> {
  if (id >= STATIC_ID_OFFSET) {
    lastSource = "static";
    return staticByMalId(id - STATIC_ID_OFFSET);
  }
  if (id >= TMDB_ID_OFFSET) {
    lastSource = "tmdb";
    return tmdbAnimeById(id - TMDB_ID_OFFSET);
  }
  if (id >= MAL_OFFICIAL_ID_OFFSET) {
    lastSource = "mal";
    return malOfficialById(id - MAL_OFFICIAL_ID_OFFSET);
  }
  if (id >= SHIKI_ID_OFFSET) {
    lastSource = "shikimori";
    return shikiById(id - SHIKI_ID_OFFSET);
  }
  if (id >= KITSU_ID_OFFSET) {
    lastSource = "kitsu";
    return kitsuById(id - KITSU_ID_OFFSET);
  }`,
  );
}

t = t.replace(
  `        [
          {
            name: "Kitsu",
            run: async () => {
              const a = await kitsuById(id);
              if (!a) throw new Error("Kitsu not found");
              return a;
            },
          },
          {
            name: "Shikimori",
            run: async () => {
              const a = await shikiById(id);
              if (!a) throw new Error("Shikimori not found");
              return a;
            },
          },
        ]`,
  `        [
          {
            name: "Shikimori",
            run: async () => {
              const a = await shikiById(id);
              if (!a) throw new Error("Shikimori not found");
              return a;
            },
          },
          {
            name: "MAL",
            run: async () => {
              if (!isMalOfficialConfigured()) throw new Error("MAL not configured");
              const a = await malOfficialById(id);
              if (!a) throw new Error("MAL not found");
              return a;
            },
          },
          {
            name: "Kitsu",
            run: async () => {
              const a = await kitsuById(id);
              if (!a) throw new Error("Kitsu not found");
              return a;
            },
          },
          {
            name: "TMDB",
            run: async () => {
              if (!isTmdbConfigured()) throw new Error("TMDB not configured");
              const a = await tmdbAnimeById(id);
              if (!a) throw new Error("TMDB not found");
              return a;
            },
          },
          {
            name: "Static",
            run: async () => {
              const a = await staticByMalId(id);
              if (!a) throw new Error("Static not found");
              return a;
            },
          },
        ]`,
);

fs.writeFileSync(file, t);
console.log("[patch-catalog] wired resilience chain into anilist.ts");
