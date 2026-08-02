export type ChatFont = "default" | "serif" | "mono";

const CHAT_FONT_KEY = "chatgiza:chat-font";

export function getStoredChatFont(): ChatFont {
  if (typeof window === "undefined") return "default";
  const raw = localStorage.getItem(CHAT_FONT_KEY);
  return raw === "serif" || raw === "mono" ? raw : "default";
}

export function applyChatFont(font: ChatFont) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-chat-font", font);
}

export function setChatFont(font: ChatFont) {
  localStorage.setItem(CHAT_FONT_KEY, font);
  applyChatFont(font);
}
