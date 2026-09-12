/**
 * api-live-health is committed in-repo.
 * Do not overwrite with a compressed blob (fragile over long base64).
 * Only patch a missing export if an older empty/broken file is present.
 */
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "lib", "api-live-health.ts");

if (!fs.existsSync(file)) {
  console.log("[restore] api-live-health missing — skip (expect committed file)");
  process.exit(0);
}

let t = fs.readFileSync(file, "utf8");

if (t.includes("runLiveHealthProbes")) {
  console.log("[restore] api-live-health ok (runLiveHealthProbes present)", t.length);
  process.exit(0);
}

// Minimal append if export was stripped but module otherwise present
if (t.includes("probeAllLiveHealth") && !t.includes("runLiveHealthProbes")) {
  t +=
    "\n\n/** Provider-status API entry — stable name used by routes. */\n" +
    "export async function runLiveHealthProbes(opts?: {\n" +
    "  origin?: string | null;\n" +
    "}): Promise<{ probes: import('./api-live-health').LiveHealthRow[]; checkedAt: string }> {\n" +
    "  const probes = await probeAllLiveHealth(opts);\n" +
    "  return { probes, checkedAt: new Date().toISOString() };\n" +
    "}\n";
  // Fix relative type import — use local LiveHealthRow from same file
  t = t.replace(
    "import('./api-live-health').LiveHealthRow[]",
    "LiveHealthRow[]",
  );
  fs.writeFileSync(file, t);
  console.log("[restore] api-live-health appended runLiveHealthProbes");
  process.exit(0);
}

console.log(
  "[restore] api-live-health unexpected content; leaving as-is",
  t.length,
);
