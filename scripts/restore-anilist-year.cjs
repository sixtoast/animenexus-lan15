const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const root = path.join(__dirname, "..");
function fromHex(p) {
  return Buffer.from(fs.readFileSync(p, "utf8").trim(), "hex").toString("utf8");
}
const b64 =
  fromHex(path.join(root, "lib/anilist.z1.hex")) +
  fromHex(path.join(root, "lib/anilist.z2.hex"));
const body = zlib.inflateSync(Buffer.from(b64, "base64")).toString("utf8");
fs.writeFileSync(path.join(root, "lib/anilist.ts"), body);
console.log("[restore] anilist.ts", body.length);
