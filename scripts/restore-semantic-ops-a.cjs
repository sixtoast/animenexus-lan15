const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const target = path.join(root, "lib/intelligence/semantic-ops/compare.ts");
if (fs.existsSync(target) && fs.statSync(target).size > 500) {
  console.log("[restore-semantic-a] compare present");
} else {
  console.log("[restore-semantic-a] compare missing — ensure source is on main");
}
process.exit(0);
