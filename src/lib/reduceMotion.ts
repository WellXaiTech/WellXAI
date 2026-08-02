export type ReduceMotion = "system" | "reduced";

const REDUCE_MOTION_KEY = "chatgiza:reduce-motion";

export function getStoredReduceMotion(): ReduceMotion {
  if (typeof window === "undefined") return "system";
  const raw = localStorage.getItem(REDUCE_MOTION_KEY);
  return raw === "reduced" ? "reduced" : "system";
}

export function applyReduceMotion(value: ReduceMotion) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-reduce-motion", value);
}

export function setReduceMotion(value: ReduceMotion) {
  localStorage.setItem(REDUCE_MOTION_KEY, value);
  applyReduceMotion(value);
}
