export type CollabParticipant = { id: string; name: string };

export type CollabMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  authorId?: string;
  authorName?: string;
  createdAt: number;
};

export type CollabSession = {
  code: string;
  createdBy: string;
  createdAt: number;
  participants: CollabParticipant[];
  messages: CollabMessage[];
};

export function collabKey(code: string) {
  return `chatgiza:collab:${code.toUpperCase()}`;
}

// Avoids visually ambiguous characters (0/O, 1/I/L) since this is meant
// to be read aloud or typed in by another person.
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateCollabCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}
