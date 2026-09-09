/**
 * Applies mood-system accuracy overhaul sources from split base64 parts.
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const BUNDLES = [
  { prefix: "mood-overhaul-a", parts: 4 },
  { prefix: "mood-overhaul-b", parts: 4 },
];

function alreadyApplied() {
  const vi = path.join(process.cwd(), "lib/viewing-intent.ts");
  if (!fs.existsSync(vi)) return false;
  const t = fs.readFileSync(vi, "utf8");
  return t.includes("fingerprintIntentFit") && t.includes("fingerprintTarget");
}

function readBundle(prefix, maxParts) {
  const dir = path.join(__dirname, "emptied-blobs");
  const whole = path.join(dir, prefix + ".json.gz.b64");
  if (fs.existsSync(whole)) {
    return fs.readFileSync(whole, "utf8").trim();
  }
  let out = "";
  for (let i = 0; i < maxParts; i++) {
    const p = path.join(dir, `${prefix}.part${i}`);
    if (!fs.existsSync(p)) break;
    out += fs.readFileSync(p, "utf8").trim();
  }
  return out;
}

function applyB64(b64) {
  if (!b64) return;
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
  for (const b of BUNDLES) {
    const b64 = readBundle(b.prefix, b.parts);
    if (!b64) {
      console.warn("[mood-overhaul] missing", b.prefix);
      continue;
    }
    applyB64(b64);
  }
}

try {
  main();
} catch (e) {
  console.error("[mood-overhaul]", e.message);
}
