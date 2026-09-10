/** Restore UI overhaul files after clone. */
const fs = require("fs");
const path = require("path");
const blobs = path.join(process.cwd(), "scripts/ai-blobs");
const map = [
  ["components__Navbar.tsx.b64", "components/Navbar.tsx"],
  ["components__CommandPalette.tsx.b64", "components/CommandPalette.tsx"],
  ["app__nav-polish.css.b64", "app/nav-polish.css"],
  ["app__cmdk.css.b64", "app/cmdk.css"],
  ["app__home-v2.css.b64", "app/home-v2.css"],
  ["app__ai-panel.css.b64", "app/ai-panel.css"],
];
function main() {
  // Join split CommandPalette blob if present
  const cpParts = [0, 1, 2].map((i) =>
    path.join(blobs, `components__CommandPalette.tsx.b64.${i}`),
  );
  if (cpParts.every(fs.existsSync)) {
    const joined = cpParts.map((p) => fs.readFileSync(p, "utf8")).join("");
    fs.writeFileSync(
      path.join(blobs, "components__CommandPalette.tsx.b64"),
      joined,
    );
  }
  if (!fs.existsSync(blobs)) {
    console.log("[restore-ui] no blobs");
    return;
  }
  for (const [b, dest] of map) {
    const bp = path.join(blobs, b);
    if (!fs.existsSync(bp)) {
      console.log("[restore-ui] missing", b);
      continue;
    }
    const raw = Buffer.from(fs.readFileSync(bp, "utf8"), "base64");
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, raw);
    console.log("[restore-ui] wrote", dest, raw.length);
  }
}
try {
  main();
} catch (e) {
  console.error("[restore-ui]", e.message);
}
