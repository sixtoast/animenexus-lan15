const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "components", "FusionClient.tsx");
if (!fs.existsSync(file)) {
  console.log("[patch-fusion] skip — FusionClient missing");
  process.exit(0);
}
let t = fs.readFileSync(file, "utf8");
if (t.includes("/api/challenge-pool") && t.includes("setPoolSize")) {
  console.log("[patch-fusion] already applied");
  process.exit(0);
}

const oldPull = `      const tags = [...new Set([...(a.tags || []), ...(b.tags || [])])].slice(0, 4);
      await Promise.all([
        tags.length
          ? pull(\`/api/recommend?mode=popular&genres=\${encodeURIComponent(tags.join(","))}\`)
          : Promise.resolve(),
        pull(\`/api/recommend?mode=popular\`),
        pull(\`/api/recommend?mode=score\`),
      ]);`;

const newPull = `      const genreBits = [
        a.genre,
        b.genre,
        ...((a as { genres?: string[] }).genres || []),
        ...((b as { genres?: string[] }).genres || []),
        ...(a.tags || []),
        ...(b.tags || []),
      ]
        .map((g) => (typeof g === "string" ? g.trim() : ""))
        .filter(Boolean);
      const genres = [...new Set(genreBits)].slice(0, 6);
      const exclude = [a.id, b.id, ...entries.map((e) => e.id)].join(",");

      await Promise.all([
        genres.length
          ? pull(
              \`/api/recommend?mode=popular&genres=\${encodeURIComponent(genres.join(","))}&exclude=\${exclude}\`,
            )
          : Promise.resolve(),
        pull(\`/api/recommend?mode=popular&exclude=\${exclude}\`),
        pull(\`/api/recommend?mode=score&exclude=\${exclude}\`),
        pull(\`/api/challenge-pool\`),
      ]);`;

if (t.includes(oldPull)) {
  t = t.replace(oldPull, newPull);
  console.log("[patch-fusion] candidate pulls updated");
} else if (!t.includes("challenge-pool")) {
  console.log("[patch-fusion] old pull block not found — check FusionClient");
}

if (!t.includes("const [poolSize")) {
  t = t.replace(
    "const [loading, setLoading] = useState(false);",
    `const [loading, setLoading] = useState(false);
  const [poolSize, setPoolSize] = useState(0);
  const [error, setError] = useState<string | null>(null);`,
  );
}

if (!t.includes("setPoolSize(0)")) {
  t = t.replace(
    "setHits([]);\n    try {",
    "setHits([]);\n    setPoolSize(0);\n    setError(null);\n    try {",
  );
}

if (!t.includes("setPoolSize(pools.length)")) {
  t = t.replace(
    "ranked.sort((x, y) => y.finalScore - x.finalScore);\n      setHits(ranked.slice(0, 16));\n    } finally {",
    `ranked.sort((x, y) => y.finalScore - x.finalScore);
      setPoolSize(pools.length);
      setHits(ranked.slice(0, 16));
      if (!pools.length) {
        setError("No candidates returned — catalog APIs may be offline. Try again in a moment.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fusion failed");
    } finally {`,
  );
}

fs.writeFileSync(file, t);
console.log("[patch-fusion] done", t.length);
