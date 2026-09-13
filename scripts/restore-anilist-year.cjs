const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const body = [1, 2, 3]
  .map((i) =>
    fs.readFileSync(path.join(root, "lib/anilist.part" + i + ".txt"), "utf8"),
  )
  .join("");
fs.writeFileSync(path.join(root, "lib/anilist.ts"), body);
console.log("[restore] anilist.ts joined", body.length);
