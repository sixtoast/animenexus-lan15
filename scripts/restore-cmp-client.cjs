const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");

const b641 = path.join(__dirname, "restore-cmp-b64-1.cjs");
const b642 = path.join(__dirname, "restore-cmp-b64-2.cjs");
if (!fs.existsSync(b641) || !fs.existsSync(b642)) {
  console.log(
    "[restore] cmp-client skip (missing b64 modules; CompareClient.tsx is source of truth)",
  );
  process.exit(0);
}

try {
  require("./restore-cmp-b64-1.cjs");
  require("./restore-cmp-b64-2.cjs");
  const b64 =
    fs.readFileSync(path.join(root, "components/cc.b64.1"), "utf8") +
    fs.readFileSync(path.join(root, "components/cc.b64.2"), "utf8");
  const body = Buffer.from(b64, "base64").toString("utf8");
  if (!body.includes("Compare") && !body.includes("compare")) {
    console.log("[restore] cmp-client invalid payload, skip");
    process.exit(0);
  }
  fs.writeFileSync(path.join(root, "components/CompareClient.tsx"), body);
  try {
    fs.unlinkSync(path.join(root, "components/cc.b64.1"));
  } catch (e) {}
  try {
    fs.unlinkSync(path.join(root, "components/cc.b64.2"));
  } catch (e) {}
  console.log("[restore] cmp-client", body.length);
} catch (e) {
  console.log(
    "[restore] cmp-client failed:",
    e && e.message ? e.message : e,
  );
  process.exit(0);
}
