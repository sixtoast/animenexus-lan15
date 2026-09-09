/**
 * Applies mood-system accuracy overhaul sources from embedded gzip bundles.
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const names = ["mood-overhaul-a.json.gz.b64", "mood-overhaul-b.json.gz.b64"];

function alreadyApplied() {
  const vi = path.join(process.cwd(), "lib/viewing-intent.ts");
  if (!fs.existsSync(vi)) return false;
  const t = fs.readFileSync(vi, "utf8");
  return t.includes("fingerprintIntentFit") && t.includes("fingerprintTarget");
}

function applyBundle(name) {
  const bundlePath = path.join(__dirname, "emptied-blobs", name);
  if (!fs.existsSync(bundlePath)) {
    console.warn("[mood-overhaul] missing", name);
    return;
  }
  const b64 = fs.readFileSync(bundlePath, "utf8").trim();
  const files = JSON.parse(
    zlib.gunzipSync(Buffer.from(b64, "base64")).toString("utf8"),
  );
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(process.cwd(), rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
    console.log("[mood-overhaul] wrote", rel, content.length);
  }
}

function main() {
  if (alreadyApplied()) {
    console.log("[mood-overhaul] skip (already applied)");
    return;
  }
  for (const n of names) applyBundle(n);
}

try {
  main();
} catch (e) {
  console.error("[mood-overhaul]", e.message);
}
