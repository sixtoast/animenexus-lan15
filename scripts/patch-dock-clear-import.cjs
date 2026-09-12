const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "app", "layout.tsx");
if (!fs.existsSync(file)) process.exit(0);
let t = fs.readFileSync(file, "utf8");
if (t.includes("layer-dock-clear.css")) {
  console.log("[patch-dock-clear] layout already imports layer-dock-clear");
  process.exit(0);
}
if (!t.includes('import "./ai-panel.css"')) {
  console.log("[patch-dock-clear] ai-panel import not found");
  process.exit(0);
}
t = t.replace(
  'import "./ai-panel.css";',
  'import "./ai-panel.css";\nimport "./layer-dock-clear.css";',
);
fs.writeFileSync(file, t);
console.log("[patch-dock-clear] imported layer-dock-clear.css");
