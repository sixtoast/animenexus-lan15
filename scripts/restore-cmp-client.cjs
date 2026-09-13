const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const p1 = path.join(root, "components/CompareClient.part1.txt");
const p2 = path.join(root, "components/CompareClient.part2.txt");
const out = path.join(root, "components/CompareClient.tsx");
if (fs.existsSync(p1) && fs.existsSync(p2)) {
  const body = fs.readFileSync(p1, "utf8") + fs.readFileSync(p2, "utf8");
  fs.writeFileSync(out, body);
  console.log("[restore] cmp-client joined", body.length);
} else if (fs.existsSync(out) && fs.statSync(out).size > 500) {
  console.log("[restore] cmp-client already present");
} else {
  console.log("[restore] cmp-client parts missing");
}
