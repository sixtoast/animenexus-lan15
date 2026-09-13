const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const parts = [];
for (let i = 1; i <= 3; i++) {
  const f = path.join(root, "components/FusionClient.part" + i + ".txt");
  if (!fs.existsSync(f)) {
    console.log("[restore] fus missing part", i);
    process.exit(0);
  }
  parts.push(fs.readFileSync(f, "utf8"));
}
const body = parts.join("");
fs.writeFileSync(path.join(root, "components/FusionClient.tsx"), body);
console.log("[restore] fus-client joined", body.length);
