/** Lightweight fuzzy "did you mean" for catalog search (client-side). */

const COMMON_TITLES = [
  "Attack on Titan",
  "Demon Slayer",
  "Jujutsu Kaisen",
  "One Piece",
  "Naruto",
  "Bleach",
  "Death Note",
  "Fullmetal Alchemist",
  "Steins Gate",
  "Steins;Gate",
  "Cowboy Bebop",
  "Neon Genesis Evangelion",
  "Your Name",
  "Spirited Away",
  "Hunter x Hunter",
  "My Hero Academia",
  "Chainsaw Man",
  "Frieren",
  "Vinland Saga",
  "Mob Psycho",
  "One Punch Man",
  "Tokyo Ghoul",
  "Code Geass",
  "Clannad",
  "Violet Evergarden",
  "Made in Abyss",
  "Monster",
  "Psycho-Pass",
  "Spy x Family",
  "Oshi no Ko",
  "Bocchi the Rock",
  "Gurren Lagann",
  "Kill la Kill",
  "Fate Zero",
  "Re Zero",
  "Mushoku Tensei",
  "Solo Leveling",
  "Dandadan",
  "Apothecary Diaries",
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s;x]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function editDistance(a: string, b: string): number {
  const s = normalize(a);
  const t = normalize(b);
  if (s === t) return 0;
  if (!s.length) return t.length;
  if (!t.length) return s.length;
  const m = s.length;
  const n = t.length;
  const row = new Array(n + 1);
  for (let j = 0; j <= n; j++) row[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j];
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return row[n];
}

export function didYouMean(
  query: string,
  opts?: { limit?: number; extraTitles?: string[] },
): string[] {
  const q = normalize(query);
  if (q.length < 2) return [];
  const pool = [...COMMON_TITLES, ...(opts?.extraTitles || [])];
  const seen = new Set<string>();
  const scored: { title: string; score: number }[] = [];
  for (const title of pool) {
    const n = normalize(title);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    if (n.includes(q) || q.includes(n)) {
      scored.push({ title, score: 0 });
      continue;
    }
    const d = editDistance(q, n);
    const maxLen = Math.max(q.length, n.length);
    const ratio = d / maxLen;
    if (ratio <= 0.45 || d <= 3) {
      scored.push({ title, score: ratio + d * 0.01 });
    }
  }
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, opts?.limit ?? 4).map((s) => s.title);
}

export function caseInsensitiveIncludes(hay: string, needle: string): boolean {
  return normalize(hay).includes(normalize(needle));
}
