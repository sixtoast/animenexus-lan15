const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
for (const rel of [
  "components/CompareClient.tsx",
  "components/FusionClient.tsx",
  "components/DislikeClient.tsx",
  "lib/intelligence/semantic-ops/fuse.ts",
  "lib/intelligence/semantic-ops/reverse.ts",
]) {
  const f = path.join(root, rel);
  console.log(
    "[restore-semantic-b]",
    rel,
    fs.existsSync(f) && fs.statSync(f).size > 500 ? "ok" : "missing",
  );
}
process.exit(0);
