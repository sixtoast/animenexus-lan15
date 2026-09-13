const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const root = path.join(__dirname, "..");

function readPart(name) {
  const p = path.join(root, "lib", name);
  if (!fs.existsSync(p)) {
    console.log("[restore] anilist missing", name);
    return null;
  }
  return fs.readFileSync(p, "utf8").trim();
}

const z1a = readPart("anilist.z1a.hex");
const z1b = readPart("anilist.z1b.hex");
const z2a = readPart("anilist.z2a.hex");
const z2b = readPart("anilist.z2b.hex");
if (!z1a || !z1b || !z2a || !z2b) {
  console.log("[restore] anilist.ts skip — hex parts incomplete");
  process.exit(0);
}

try {
  const b64 =
    Buffer.from(z1a + z1b, "hex").toString("utf8") +
    Buffer.from(z2a + z2b, "hex").toString("utf8");
  const body = zlib.inflateSync(Buffer.from(b64, "base64")).toString("utf8");
  if (!body.includes("anilistFetch") && !body.includes("export async function")) {
    console.log("[restore] anilist.ts invalid payload, skip");
    process.exit(0);
  }
  fs.writeFileSync(path.join(root, "lib/anilist.ts"), body);
  console.log("[restore] anilist.ts", body.length);
} catch (e) {
  console.log("[restore] anilist.ts failed:", e && e.message ? e.message : e);
  process.exit(0);
}
