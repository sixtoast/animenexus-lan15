const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const parts = [];
for (let i = 1; i <= 5; i++) {
  const f = path.join(root, "lib", "anilist.p" + i + ".txt");
  if (!fs.existsSync(f)) {
    console.log("[restore] anilist missing part", i);
    process.exit(0);
  }
  parts.push(fs.readFileSync(f, "utf8"));
}
const body = parts.join("");
if (!body.includes("anilistFetch")) {
  console.log("[restore] anilist invalid join, skip");
  process.exit(0);
}
fs.writeFileSync(path.join(root, "lib/anilist.ts"), body);
console.log("[restore] anilist.ts joined", body.length);
