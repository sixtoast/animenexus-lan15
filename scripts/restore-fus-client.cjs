const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
require("./restore-fus-b64-1.cjs");
require("./restore-fus-b64-2.cjs");
const b64 =
  fs.readFileSync(path.join(root, "components/fus.b64.1"), "utf8") +
  fs.readFileSync(path.join(root, "components/fus.b64.2"), "utf8");
const body = Buffer.from(b64, "base64").toString("utf8");
fs.writeFileSync(path.join(root, "components/FusionClient.tsx"), body);
try {
  fs.unlinkSync(path.join(root, "components/fus.b64.1"));
} catch (e) {}
try {
  fs.unlinkSync(path.join(root, "components/fus.b64.2"));
} catch (e) {}
console.log("[restore] fus-client", body.length);
