/**
 * Restore source files emptied by a bad lint autofix (prefer-const batch).
 * Runs from postinstall. Safe to re-run.
 */
const fs = require("fs");
const path = require("path");

const MAP = [
  ["lib/anilist-detail.ts", "anilist-detail.ts.b64"],
  ["components/AncestrySpace2D.tsx", "AncestrySpace2D.tsx.b64"],
  ["components/AncestrySpace3D.tsx", "AncestrySpace3D.tsx.b64"],
  ["lib/mascot/page-terrain.ts", "page-terrain.ts.b64"],
];

const blobDir = path.join(__dirname, "emptied-blobs");

for (const [rel, blobName] of MAP) {
  const full = path.join(process.cwd(), rel);
  const blobPath = path.join(blobDir, blobName);
  if (!fs.existsSync(blobPath)) {
    console.warn("[restore-emptied] missing blob", blobName);
    continue;
  }
  const b64 = fs.readFileSync(blobPath, "utf8").trim();
  const buf = Buffer.from(b64, "base64");
  const existing = fs.existsSync(full) ? fs.statSync(full).size : 0;
  if (existing >= buf.length * 0.9) {
    console.log("[restore-emptied] skip (present)", rel, existing);
    continue;
  }
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, buf);
  console.log("[restore-emptied] wrote", rel, buf.length);
}
