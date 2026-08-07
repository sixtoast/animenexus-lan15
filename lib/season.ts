/** Season helpers + daily pick seed */

export type AniSeason = "WINTER" | "SPRING" | "SUMMER" | "FALL";

export function currentSeason(date = new Date()): {
  season: AniSeason;
  year: number;
} {
  const month = date.getMonth();
  const year = date.getFullYear();
  if (month <= 2) return { season: "WINTER", year };
  if (month <= 5) return { season: "SPRING", year };
  if (month <= 8) return { season: "SUMMER", year };
  return { season: "FALL", year };
}

export function seasonLabel(season: AniSeason): string {
  return season.charAt(0) + season.slice(1).toLowerCase();
}

export function allSeasonsAround(
  date = new Date(),
): { season: AniSeason; year: number }[] {
  const order: AniSeason[] = ["WINTER", "SPRING", "SUMMER", "FALL"];
  const cur = currentSeason(date);
  const idx = order.indexOf(cur.season);
  const out: { season: AniSeason; year: number }[] = [];
  for (const offset of [-1, 0, 1]) {
    let i = idx + offset;
    let y = cur.year;
    if (i < 0) {
      i = 3;
      y -= 1;
    } else if (i > 3) {
      i = 0;
      y += 1;
    }
    out.push({ season: order[i], year: y });
  }
  return out;
}

export function dailySeed(date = new Date()): number {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return y * 10000 + m * 100 + d;
}

export function pickIndex(seed: number, length: number): number {
  if (length <= 0) return 0;
  let x = seed ^ 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  x = (x ^ (x >>> 16)) >>> 0;
  return x % length;
}
