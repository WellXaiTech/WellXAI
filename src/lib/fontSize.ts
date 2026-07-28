export type ChatFontSize = "small" | "medium" | "large" | "xlarge";

const FONT_SIZE_KEY = "chatgiza:font-size";

export function getStoredFontSize(): ChatFontSize {
  if (typeof window === "undefined") return "medium";
  const raw = localStorage.getItem(FONT_SIZE_KEY);
  return raw === "small" || raw === "medium" || raw === "large" || raw === "xlarge" ? raw : "medium";
}

export function applyFontSize(size: ChatFontSize) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-font-size", size);
}

export function setFontSize(size: ChatFontSize) {
  localStorage.setItem(FONT_SIZE_KEY, size);
  applyFontSize(size);
}
