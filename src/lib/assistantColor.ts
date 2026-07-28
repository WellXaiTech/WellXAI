export type AssistantColor = "default" | "warm";

const ASSISTANT_COLOR_KEY = "chatgiza:assistant-color";

export function getStoredAssistantColor(): AssistantColor {
  if (typeof window === "undefined") return "default";
  const raw = localStorage.getItem(ASSISTANT_COLOR_KEY);
  return raw === "warm" ? "warm" : "default";
}

export function applyAssistantColor(color: AssistantColor) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-assistant-color", color);
}

export function setAssistantColor(color: AssistantColor) {
  localStorage.setItem(ASSISTANT_COLOR_KEY, color);
  applyAssistantColor(color);
}
