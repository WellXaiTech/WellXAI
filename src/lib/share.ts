export type SharedMessage = {
  role: "user" | "assistant";
  content: string;
};

export type SharedConversation = {
  id: string;
  title: string;
  messages: SharedMessage[];
  createdAt: number;
};

export function shareKey(id: string) {
  return `chatgiza:share:${id}`;
}

const ID_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

export function generateShareId(length = 22): string {
  let id = "";
  for (let i = 0; i < length; i++) {
    id += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)];
  }
  return id;
}
