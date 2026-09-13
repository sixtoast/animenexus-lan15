const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const root = path.join(__dirname, "..");
const b64 =
  fs.readFileSync(path.join(root, "lib/anilist.z1.b64"), "utf8") +
  fs.readFileSync(path.join(root, "lib/anilist.z2.b64"), "utf8");
const body = zlib.inflateSync(Buffer.from(b64, "base64")).toString("utf8");
fs.writeFileSync(path.join(root, "lib/anilist.ts"), body);
console.log("[restore] anilist.ts", body.length);
