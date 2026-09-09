/** Restore AI hybrid modules + ranker intent wiring after clone. */
const fs = require("fs");
const path = require("path");

const blobs = path.join(process.cwd(), "scripts/ai-blobs");
const map = [
  ["lib__intelligence__ai__interpret-intent.ts.b64", "lib/intelligence/ai/interpret-intent.ts"],
  ["lib__intelligence__ai__enrich-fingerprint-ai.ts.b64", "lib/intelligence/ai/enrich-fingerprint-ai.ts"],
  ["lib__intelligence__ai__rerank-shortlist.ts.b64", "lib/intelligence/ai/rerank-shortlist.ts"],
  ["lib__intent-session.ts.b64", "lib/intent-session.ts"],
  ["lib__intelligence__recommendation__ranker-v3.ts.b64", "lib/intelligence/recommendation/ranker-v3.ts"],
  ["app__mood__page.tsx.b64", "app/mood/page.tsx"],
  ["scripts__patch-ranker-intent.cjs.b64", "scripts/patch-ranker-intent.cjs"],
];

function main() {
  if (!fs.existsSync(blobs)) {
    console.log("[restore-ai] no blobs dir");
    return;
  }
  for (const [b, dest] of map) {
    const bp = path.join(blobs, b);
    if (!fs.existsSync(bp)) {
      console.log("[restore-ai] missing", b);
      continue;
    }
    const raw = Buffer.from(fs.readFileSync(bp, "utf8"), "base64");
    const dir = path.dirname(dest);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(dest, raw);
    console.log("[restore-ai] wrote", dest, raw.length);
  }
}

try {
  main();
} catch (e) {
  console.error("[restore-ai]", e.message);
}
