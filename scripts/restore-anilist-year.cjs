const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const root = path.join(__dirname, "..");
require("./az1.cjs");
require("./az2.cjs");
const b64 =
  fs.readFileSync(path.join(root, "lib/a.z.1"), "utf8") +
  fs.readFileSync(path.join(root, "lib/a.z.2"), "utf8");
const body = zlib.inflateSync(Buffer.from(b64, "base64")).toString("utf8");
fs.writeFileSync(path.join(root, "lib/anilist.ts"), body);
try {
  fs.unlinkSync(path.join(root, "lib/a.z.1"));
} catch (e) {}
try {
  fs.unlinkSync(path.join(root, "lib/a.z.2"));
} catch (e) {}
console.log("[restore] anilist.ts", body.length);
