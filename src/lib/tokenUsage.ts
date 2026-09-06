import { kv } from "@vercel/kv";

// A single running total per account, currently fed only by the Build
// agent turn (the highest-volume, most token-heavy surface) -- not yet
// wired into every AI call site (main chat streaming, image/video, deep
// think, etc.), so this is a real but partial figure, not the account's
// full lifetime usage across every feature.
function tokensKey(userId: string) {
  return `chatgiza:tokens-used:${userId}`;
}

export async function addUserTokens(userId: string, tokens: number): Promise<void> {
  if (!tokens || tokens <= 0) return;
  try {
    await kv.incrby(tokensKey(userId), tokens);
  } catch (err) {
    console.error("addUserTokens failed:", err);
  }
}

export async function getUserTokens(userId: string): Promise<number> {
  try {
    return (await kv.get<number>(tokensKey(userId))) ?? 0;
  } catch (err) {
    console.error("getUserTokens failed:", err);
    return 0;
  }
}
