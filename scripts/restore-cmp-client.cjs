const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
require("./restore-cmp-part1.cjs");
require("./restore-cmp-part2.cjs");
const a = fs.readFileSync(
  path.join(root, "components/CompareClient.part1.txt"),
  "utf8",
);
const b = fs.readFileSync(
  path.join(root, "components/CompareClient.part2.txt"),
  "utf8",
);
fs.writeFileSync(path.join(root, "components/CompareClient.tsx"), a + b);
try {
  fs.unlinkSync(path.join(root, "components/CompareClient.part1.txt"));
} catch (e) {}
try {
  fs.unlinkSync(path.join(root, "components/CompareClient.part2.txt"));
} catch (e) {}
console.log("[restore] cmp-client joined", (a + b).length);
