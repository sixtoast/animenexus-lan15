const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const p1 = path.join(root, "components", "DislikeClient.p1.txt");
const p2 = path.join(root, "components", "DislikeClient.p2.txt");
if (!fs.existsSync(p1) || !fs.existsSync(p2)) {
  console.log("[restore] dis-client skip — parts missing");
  process.exit(0);
}
const body = fs.readFileSync(p1, "utf8") + fs.readFileSync(p2, "utf8");
if (!body.includes("userFit")) {
  console.log("[restore] dis-client invalid parts");
  process.exit(0);
}
fs.writeFileSync(path.join(root, "components", "DislikeClient.tsx"), body);
console.log("[restore] dis-client joined", body.length);
