const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
let b64 = "";
for (let i = 1; i <= 4; i++) {
  require("./restore-anilist-p" + i + ".cjs");
  b64 += fs.readFileSync(path.join(root, "lib/anilist.b64." + i), "utf8");
}
const body = Buffer.from(b64, "base64").toString("utf8");
fs.writeFileSync(path.join(root, "lib/anilist.ts"), body);
for (let i = 1; i <= 4; i++) {
  try {
    fs.unlinkSync(path.join(root, "lib/anilist.b64." + i));
  } catch (e) {}
}
console.log("[restore] anilist.ts", body.length);
