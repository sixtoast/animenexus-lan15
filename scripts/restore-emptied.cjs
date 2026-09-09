/**
 * Restore source files emptied/truncated by a bad lint autofix.
 * Pulls last known-good versions from commit 7fe8a62, then applies prefer-const fixes.
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const GOOD_SHA = "7fe8a6222965695cf224fc735a0eed7594374d1d";
const REPO = "sixtoast/animenexus-lan15";

const FILES = [
  {
    rel: "lib/anilist-detail.ts",
    minBytes: 10000,
    mustInclude: "fetchAnimeDetail",
  },
  {
    rel: "components/AncestrySpace2D.tsx",
    minBytes: 10000,
    mustInclude: "AncestrySpace2D",
  },
  {
    rel: "components/AncestrySpace3D.tsx",
    minBytes: 10000,
    mustInclude: "AncestrySpace3D",
  },
  {
    rel: "lib/mascot/page-terrain.ts",
    minBytes: 8000,
    mustInclude: "buildTerrain",
  },
];

function applyLintFixes(text) {
  return text
    .replace(/\blet dx =/g, "const dx =")
    .replace(/\blet dy =/g, "const dy =")
    .replace(/\blet controls =/g, "const controls =")
    .replace(
      /let recommendations: AnimeRelation\[\] = \[\];/g,
      "const recommendations: AnimeRelation[] = [];",
    )
    .replace(
      /let recommendations = mapRecommendations\(/g,
      "const recommendations = mapRecommendations(",
    )
    .replace(/\blet candidates\b/g, "const candidates");
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          fetchText(res.headers.location).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      })
      .on("error", reject);
  });
}

function needsRestore(full, spec) {
  if (!fs.existsSync(full)) return true;
  const text = fs.readFileSync(full, "utf8");
  if (text.length < spec.minBytes) return true;
  if (spec.mustInclude && !text.includes(spec.mustInclude)) return true;
  return false;
}

async function main() {
  for (const spec of FILES) {
    const full = path.join(process.cwd(), spec.rel);
    if (!needsRestore(full, spec)) {
      console.log(
        "[restore-emptied] skip (present)",
        spec.rel,
        fs.statSync(full).size,
      );
      continue;
    }
    const url = `https://raw.githubusercontent.com/${REPO}/${GOOD_SHA}/${spec.rel}`;
    try {
      let text = await fetchText(url);
      text = applyLintFixes(text);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, text);
      console.log("[restore-emptied] wrote", spec.rel, text.length);
    } catch (err) {
      console.error("[restore-emptied] failed", spec.rel, err.message);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 0;
});
