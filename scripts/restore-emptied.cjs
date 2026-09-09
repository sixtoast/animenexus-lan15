/**
 * Restore source files emptied by a bad lint autofix.
 * Prefer single gzip bundle; fall back to per-file .b64 blobs.
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const blobDir = path.join(__dirname, "emptied-blobs");
const bundlePath = path.join(blobDir, "bundle.json.gz.b64");

function writeIfNeeded(rel, content) {
  const full = path.join(process.cwd(), rel);
  const data = typeof content === "string" ? Buffer.from(content, "utf8") : content;
  const existing = fs.existsSync(full) ? fs.statSync(full).size : 0;
  if (existing >= data.length * 0.9) {
    console.log("[restore-emptied] skip (present)", rel, existing);
    return;
  }
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, data);
  console.log("[restore-emptied] wrote", rel, data.length);
}

if (fs.existsSync(bundlePath)) {
  const b64 = fs.readFileSync(bundlePath, "utf8").trim();
  const gz = Buffer.from(b64, "base64");
  const json = zlib.gunzipSync(gz).toString("utf8");
  const files = JSON.parse(json);
  for (const [rel, content] of Object.entries(files)) {
    writeIfNeeded(rel, content);
  }
  process.exit(0);
}

const MAP = [
  ["lib/anilist-detail.ts", "anilist-detail.ts.b64"],
  ["components/AncestrySpace2D.tsx", "AncestrySpace2D.tsx.b64"],
  ["components/AncestrySpace3D.tsx", "AncestrySpace3D.tsx.b64"],
  ["lib/mascot/page-terrain.ts", "page-terrain.ts.b64"],
];
for (const [rel, blobName] of MAP) {
  const blobPath = path.join(blobDir, blobName);
  if (!fs.existsSync(blobPath)) {
    console.warn("[restore-emptied] missing blob", blobName);
    continue;
  }
  const buf = Buffer.from(fs.readFileSync(blobPath, "utf8").trim(), "base64");
  writeIfNeeded(rel, buf);
}
