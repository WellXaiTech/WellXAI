import type { Conversation, Message } from "@/components/ChatGizaShell";

// Matches the native Android app's own newPairId()/pairId exactly (see
// ChatViewModel.kt) -- the web implementation was originally built
// independently, deriving a display-only ID from the user message's own
// id instead of a real stored field, which produced a completely
// different value than Android's for the same logical exchange even
// though the two synced through the same account. This is a fresh
// random id (not derived from either message's own id), generated once
// per exchange and stored on BOTH the user message and its reply, so it
// round-trips identically whichever platform generated it and whichever
// platform later displays or looks it up.
export function newPairId(): string {
  const raw = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(16);
  return `Q-${raw.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

const QID_PATTERN = /Q-[A-Za-z0-9]{6}/i;

// Finds a Q-ID mentioned anywhere in the user's new message, if any.
export function extractQId(text: string): string | null {
  const match = text.match(QID_PATTERN);
  return match ? match[0].toUpperCase() : null;
}

// Mirrors ChatViewModel.kt's findReferencedPair exactly: check the
// current, possibly-not-yet-saved conversation's live messages first,
// then fall back to every saved conversation -- matched by pairId AND
// role directly (not by position), so it doesn't depend on messages
// staying perfectly paired/adjacent in the array.
export function findReferencedPair(
  qid: string,
  liveMessages: Message[],
  conversations: Conversation[]
): { question: string; answer: string } | null {
  const fromList = (messages: Message[]): { question: string; answer: string } | null => {
    const question = messages.find((m) => m.role === "user" && m.pairId?.toUpperCase() === qid);
    const answer = messages.find((m) => m.role === "assistant" && m.pairId?.toUpperCase() === qid);
    return question && answer?.content.trim() ? { question: question.content, answer: answer.content } : null;
  };

  const live = fromList(liveMessages);
  if (live) return live;

  for (const c of conversations) {
    const found = fromList(c.messages);
    if (found) return found;
  }
  return null;
}
