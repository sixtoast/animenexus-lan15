const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "components", "AIPanel.tsx");
if (!fs.existsSync(file)) process.exit(0);
let t = fs.readFileSync(file, "utf8");

if (t.includes('name="lantern"') && t.includes("lantern:open-ai") && !t.includes("size={26}")) {
  console.log("[patch-aipanel-ui] already applied");
  process.exit(0);
}

// Fix prior bad size={26} if present
t = t.replace(
  /<NexusIcon name="lantern" size=\{26\} \/>/g,
  '<NexusIcon name="lantern" size="lg" />',
);

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

const oldFab = `      <button
        type="button"
        className="ai-fab"
        aria-label="Open AI panel"
        title="AI panel (A)"
        onClick={() => setOpen(true)}
      >
        🤖
        <span
          className={"ai-status-dot" + (configured ? " on" : "")}
          aria-hidden
        />
      </button>`;

const newFab = `      <button
        type="button"
        className="ai-fab"
        aria-label="Open Lantern AI desk"
        title="Lantern AI"
        onClick={() => setOpen(true)}
      >
        <span className="ai-fab-icon" aria-hidden>
          <NexusIcon name="lantern" size="lg" />
        </span>
        <span
          className={"ai-status-dot" + (configured ? " on" : "")}
          title={configured ? "API key ready" : "Add API key"}
        />
      </button>`;

if (t.includes(oldFab)) {
  t = t.replace(oldFab, newFab);
} else if (t.includes("🤖")) {
  t = t.replace(
    `        🤖
        <span
          className={"ai-status-dot" + (configured ? " on" : "")}
          aria-hidden
        />`,
    `        <span className="ai-fab-icon" aria-hidden>
          <NexusIcon name="lantern" size="lg" />
        </span>
        <span
          className={"ai-status-dot" + (configured ? " on" : "")}
          title={configured ? "API key ready" : "Add API key"}
        />`,
  );
}

t = t.replace(/, "🤖"/g, "");
t = t.replace(/, "✅"/g, "");
t = t.replace(/, "😅"/g, "");

fs.writeFileSync(file, t);
console.log("[patch-aipanel-ui] applied", t.length);
