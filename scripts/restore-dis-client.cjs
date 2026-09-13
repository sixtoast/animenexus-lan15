const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "components", "DislikeClient.tsx");
if (!fs.existsSync(file)) {
  console.log("[restore] dis-client skip — file missing");
  process.exit(0);
}
let t = fs.readFileSync(file, "utf8");
const bad = `out.push({
          anime: c,
          ...scored,
          reasonSource: profile.reasonSource,
        });`;
const good = `out.push({
          anime: c,
          ...scored,
          userFit,
          reasonSource: profile.reasonSource,
        });`;
if (t.includes(bad)) {
  t = t.replace(bad, good);
  fs.writeFileSync(file, t);
  console.log("[restore] dis-client added userFit to ReverseHit");
} else if (
  t.includes("userFit,\n          reasonSource") ||
  t.includes("userFit,\r\n          reasonSource")
) {
  console.log("[restore] dis-client userFit already present");
} else {
  console.log("[restore] dis-client skip (no matching push pattern)");
}
