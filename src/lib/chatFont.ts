// "default"/"serif"/"mono" are the original values -- kept in the union
// (not removed) purely so the currently-deployed page.tsx's own
// `useState<ChatFont>("default")` literal keeps type-checking; no UI has
// ever actually offered serif/mono as a choice (SettingsPanel never
// rendered a control for this until the plus_jakarta_sans/manrope/system
// picker below), so no real user has one of those persisted.
export type ChatFont = "default" | "serif" | "mono" | "plus_jakarta_sans" | "manrope" | "system";

const CHAT_FONT_KEY = "chatgiza:chat-font";

export function getStoredChatFont(): ChatFont {
  if (typeof window === "undefined") return "plus_jakarta_sans";
  const raw = localStorage.getItem(CHAT_FONT_KEY);
  return raw === "manrope" || raw === "system" || raw === "plus_jakarta_sans" ? raw : "plus_jakarta_sans";
}

export function applyChatFont(font: ChatFont) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-chat-font", font);
}

export function setChatFont(font: ChatFont) {
  localStorage.setItem(CHAT_FONT_KEY, font);
  applyChatFont(font);
}
