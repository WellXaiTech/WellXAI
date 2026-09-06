// "default"/"serif"/"mono" are the original values -- kept in the union
// (not removed) purely so the currently-deployed page.tsx's own
// `useState<ChatFont>("default")` literal keeps type-checking; no UI has
// ever actually offered serif/mono as a choice.
export type ChatFont = "default" | "serif" | "mono" | "nova_regular" | "nova_light";

const CHAT_FONT_KEY = "chatgiza:chat-font";

const VALID_FONTS: ChatFont[] = ["nova_regular", "nova_light"];

export function getStoredChatFont(): ChatFont {
  if (typeof window === "undefined") return "nova_light";
  const raw = localStorage.getItem(CHAT_FONT_KEY);
  return (VALID_FONTS as string[]).includes(raw ?? "") ? (raw as ChatFont) : "nova_light";
}

export function applyChatFont(font: ChatFont) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-chat-font", font);
}

export function setChatFont(font: ChatFont) {
  localStorage.setItem(CHAT_FONT_KEY, font);
  applyChatFont(font);
}
