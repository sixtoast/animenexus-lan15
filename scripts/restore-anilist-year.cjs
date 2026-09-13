const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const root = path.join(__dirname, "..");
function fromHexParts(a, b) {
  return Buffer.from(
    fs.readFileSync(a, "utf8").trim() + fs.readFileSync(b, "utf8").trim(),
    "hex",
  ).toString("utf8");
}
const b64 =
  fromHexParts(
    path.join(root, "lib/anilist.z1a.hex"),
    path.join(root, "lib/anilist.z1b.hex"),
  ) +
  fromHexParts(
    path.join(root, "lib/anilist.z2a.hex"),
    path.join(root, "lib/anilist.z2b.hex"),
  );
const body = zlib.inflateSync(Buffer.from(b64, "base64")).toString("utf8");
fs.writeFileSync(path.join(root, "lib/anilist.ts"), body);
console.log("[restore] anilist.ts", body.length);
