const fs = require("fs");
const path = require("path");

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules" || name === ".git") continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\.tsx$/.test(name)) acc.push(p);
  }
  return acc;
}

const root = path.join(__dirname, "..");
const pat =
  /showToast\(\s*((?:`(?:\\.|[^`])*`|"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|[^,)]+)\s*,\s*("(?:\\.|[^"])*"|'(?:\\.|[^'])*')\s*(,\s*(true|false))?\s*\)/g;

let total = 0;
for (const file of walk(path.join(root, "components"))) {
  let t = fs.readFileSync(file, "utf8");
  const next = t.replace(pat, (m, msg, glyph, _r, flag) => {
    const g = String(glyph).slice(1, -1);
    const isEmoji =
      [...g].some((c) => c.charCodeAt(0) > 127) ||
      ["✦", "⚠", "✓", "×", "★"].includes(g);
    if (!isEmoji && g.length > 3 && /^[\x00-\x7F]*$/.test(g)) return m;
    total++;
    if (flag === "true") return `showToast(${msg}, { milestone: true })`;
    return `showToast(${msg})`;
  });
  let n2 = next
    .replace(/\{exp\?\.emoji \? `\$\{exp\.emoji\} ` : ""\}/g, "")
    .replace(/\{m\.emoji\}/g, "")
    .replace(/\{mood\.emoji\}/g, "")
    .replace(/\{p\.emoji\}/g, "");
  if (n2 !== t) fs.writeFileSync(file, n2);
}
console.log("[strip-ui-emojis] cleaned", total);
