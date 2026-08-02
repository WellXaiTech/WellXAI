export type Contrast = "system" | "medium" | "increased";

const CONTRAST_KEY = "chatgiza:contrast";

export function getStoredContrast(): Contrast {
  if (typeof window === "undefined") return "system";
  const raw = localStorage.getItem(CONTRAST_KEY);
  return raw === "medium" || raw === "increased" ? raw : "system";
}

export function applyContrast(contrast: Contrast) {
  if (typeof document === "undefined") return;
  if (contrast === "system") {
    document.documentElement.removeAttribute("data-contrast");
  } else {
    document.documentElement.setAttribute("data-contrast", contrast);
  }
}

export function setContrast(contrast: Contrast) {
  localStorage.setItem(CONTRAST_KEY, contrast);
  applyContrast(contrast);
}
