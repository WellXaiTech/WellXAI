const STREAK_KEY = "chatgiza:streak";
const LAST_ACTIVE_KEY = "chatgiza:last-active-date";
const COUNTER_PREFIX = "chatgiza:milestone-count:";
const SEEN_MILESTONES_KEY = "chatgiza:seen-milestones";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

/** Call once per app load. Updates the daily streak and returns the current count. */
export function recordVisitAndGetStreak(): number {
  if (typeof window === "undefined") return 0;
  const today = todayIso();
  const last = localStorage.getItem(LAST_ACTIVE_KEY);
  let streak = Number(localStorage.getItem(STREAK_KEY) ?? "0") || 0;

  if (last === today) return streak || 1;

  streak = last && daysBetween(last, today) === 1 ? streak + 1 : 1;
  localStorage.setItem(LAST_ACTIVE_KEY, today);
  localStorage.setItem(STREAK_KEY, String(streak));
  return streak;
}

export function getStreak(): number {
  if (typeof window === "undefined") return 0;
  return Number(localStorage.getItem(STREAK_KEY) ?? "0") || 0;
}

export type MilestoneType = "messages" | "images" | "streak";

const THRESHOLDS: Record<MilestoneType, number[]> = {
  messages: [1, 10, 50, 100, 250],
  images: [1, 10, 25],
  streak: [3, 7, 30, 100],
};

const LABELS: Record<MilestoneType, (n: number) => string> = {
  messages: (n) => (n === 1 ? "Ujumbe wako wa kwanza! Karibu ChatGiZa 🎉" : `Umefikisha ujumbe wa ${n}! 🎉`),
  images: (n) => (n === 1 ? "Picha yako ya kwanza imetengenezwa! 🎨" : `Umetengeneza picha ${n}! 🎨`),
  streak: (n) => `Siku ${n} mfululizo! Endelea hivyo 🔥`,
};

function seenSet(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_MILESTONES_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

function markSeen(id: string) {
  const seen = seenSet();
  seen.add(id);
  localStorage.setItem(SEEN_MILESTONES_KEY, JSON.stringify(Array.from(seen)));
}

function checkMilestone(type: MilestoneType, value: number): string | null {
  if (!THRESHOLDS[type].includes(value)) return null;
  const id = `${type}:${value}`;
  if (seenSet().has(id)) return null;
  markSeen(id);
  return LABELS[type](value);
}

/** Increments the named counter and returns a celebration message if a milestone was just crossed. */
export function bumpCounterAndCheckMilestone(type: "messages" | "images"): string | null {
  if (typeof window === "undefined") return null;
  const key = COUNTER_PREFIX + type;
  const count = (Number(localStorage.getItem(key) ?? "0") || 0) + 1;
  localStorage.setItem(key, String(count));
  return checkMilestone(type, count);
}

export function checkStreakMilestone(streak: number): string | null {
  return checkMilestone("streak", streak);
}
