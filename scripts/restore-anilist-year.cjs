/**
 * Restore lib/anilist.ts from a known-good commit and apply year coercion.
 * Runs at postinstall on Vercel (network available).
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "lib", "anilist.ts");
const SRC =
  "https://raw.githubusercontent.com/sixtoast/animenexus-lan15/d9b27ef/lib/anilist.ts";

const OLD =
  "if (filters.year) variables.seasonYear = parseInt(filters.year, 10);";
const NEU = `if (filters.year != null) {
    const y = typeof filters.year === "number" ? filters.year : parseInt(String(filters.year), 10);
    if (Number.isFinite(y) && y > 0) variables.seasonYear = y;
  }`;

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchText(res.headers.location).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error("HTTP " + res.statusCode + " for " + url));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      })
      .on("error", reject);
  });
}

(async () => {
  try {
    let body = await fetchText(SRC);
    if (!body.includes("anilistFetch")) {
      console.log("[restore] anilist upstream payload unexpected, skip");
      process.exit(0);
    }
    if (body.includes(OLD)) {
      body = body.split(OLD).join(NEU);
      console.log("[restore] anilist year coercion applied");
    } else if (body.includes('typeof filters.year === "number"')) {
      console.log("[restore] anilist year coercion already present");
    } else {
      console.log("[restore] anilist year pattern not found — writing upstream as-is");
    }
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, body);
    console.log("[restore] anilist.ts", body.length);
  } catch (e) {
    console.log("[restore] anilist.ts failed:", e && e.message ? e.message : e);
    process.exit(0);
  }
})();
