/**
 * Coerce AnimeFilters.year (number | string) for AniList variables.
 */
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "lib", "anilist.ts");
if (!fs.existsSync(file)) {
  console.log("[patch-year] skip — lib/anilist.ts missing");
  process.exit(0);
}
let t = fs.readFileSync(file, "utf8");
const old =
  "if (filters.year) variables.seasonYear = parseInt(filters.year, 10);";
const neu =
  'if (filters.year) variables.seasonYear = typeof filters.year === "number" ? filters.year : parseInt(String(filters.year), 10);';
if (t.includes(neu)) {
  console.log("[patch-year] already applied");
  process.exit(0);
}
if (!t.includes(old)) {
  console.log("[patch-year] pattern not found — check anilist.ts");
  process.exit(0);
}
t = t.replace(old, neu);
fs.writeFileSync(file, t);
console.log("[patch-year] applied");
