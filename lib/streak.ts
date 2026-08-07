const KEY = "anime_nexus_streak_v1";

export type StreakState = {
  count: number;
  last: string;
};

function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function yesterdayKey(d = new Date()): string {
  const y = new Date(d);
  y.setDate(y.getDate() - 1);
  return todayKey(y);
}

export function readStreak(): StreakState {
  if (typeof window === "undefined") return { count: 0, last: "" };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { count: 0, last: "" };
    const j = JSON.parse(raw) as StreakState;
    return { count: Number(j.count) || 0, last: String(j.last || "") };
  } catch {
    return { count: 0, last: "" };
  }
}

export function touchStreak(): { state: StreakState; milestone: boolean } {
  if (typeof window === "undefined") {
    return { state: { count: 0, last: "" }, milestone: false };
  }
  const today = todayKey();
  const prev = readStreak();
  if (prev.last === today) {
    return { state: prev, milestone: false };
  }
  let count = 1;
  if (prev.last === yesterdayKey()) {
    count = prev.count + 1;
  }
  const state: StreakState = { count, last: today };
  localStorage.setItem(KEY, JSON.stringify(state));
  const milestone = count >= 3 && (count === 3 || count % 7 === 0);
  return { state, milestone };
}
