const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "components", "AIPanel.tsx");
if (!fs.existsSync(file)) process.exit(0);
let t = fs.readFileSync(file, "utf8");
if (t.includes("lantern:open-ai") && t.includes('name="lantern"')) {
  console.log("[patch-aipanel-ui] already applied");
  process.exit(0);
}
if (!t.includes("NexusIcon")) {
  t = t.replace(
    'import { Button } from "@/components/ui/Button";',
    'import { Button } from "@/components/ui/Button";\nimport { NexusIcon } from "@/components/ui/NexusIcon";',
  );
}
if (!t.includes("lantern:open-ai")) {
  const needle = "  useEffect(() => {\n    const s = readAISettings();";
  if (t.includes(needle)) {
    t = t.replace(
      needle,
      `  useEffect(() => {
    const openAi = () => setOpen(true);
    window.addEventListener("lantern:open-ai", openAi);
    return () => window.removeEventListener("lantern:open-ai", openAi);
  }, []);

  useEffect(() => {
    const s = readAISettings();`,
    );
  }
}
t = t.replace(
  /(<button\s+type="button"\s+className="ai-fab"[\s\S]*?>)[\s\S]*?(<\/button>)/,
  `$1
        <span className="ai-fab-icon" aria-hidden>
          <NexusIcon name="lantern" size={26} />
        </span>
        <span
          className={"ai-status-dot" + (configured ? " on" : "")}
          title={configured ? "API key ready" : "Add API key"}
        />
      $2`,
);
t = t.replace(/, "🤖"/g, "");
t = t.replace(/, "✅"/g, "");
t = t.replace(/, "😅"/g, "");
fs.writeFileSync(file, t);
console.log("[patch-aipanel-ui] applied", t.length);
