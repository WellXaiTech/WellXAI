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

// Same partial-coverage caveat as the running total above (Build agent
// turns only) -- but broken down per model, per day, per direction, so
// the Models tab can chart real usage over time instead of showing
// nothing. One KV hash per user per day; hincrby keeps concurrent turns
// on the same day from racing each other the way a read-modify-write
// would.
function modelDayKey(userId: string, dayKey: string) {
  return `chatgiza:model-tokens:${userId}:${dayKey}`;
}

function todayKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export async function addModelTokens(userId: string, model: string, inputTokens: number, outputTokens: number): Promise<void> {
  try {
    const key = modelDayKey(userId, todayKey());
    if (inputTokens > 0) await kv.hincrby(key, `${model}:in`, inputTokens);
    if (outputTokens > 0) await kv.hincrby(key, `${model}:out`, outputTokens);
  } catch (err) {
    console.error("addModelTokens failed:", err);
  }
}

export type DailyModelUsage = { day: string; models: Record<string, { in: number; out: number }> };

export async function getModelTokenHistory(userId: string, days: number): Promise<DailyModelUsage[]> {
  const dayKeys: string[] = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    dayKeys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`);
  }
  try {
    const results = await Promise.all(dayKeys.map((day) => kv.hgetall<Record<string, string>>(modelDayKey(userId, day))));
    return dayKeys.map((day, i) => {
      const raw = results[i] ?? {};
      const models: Record<string, { in: number; out: number }> = {};
      for (const [field, value] of Object.entries(raw ?? {})) {
        const sep = field.lastIndexOf(":");
        const model = field.slice(0, sep);
        const dir = field.slice(sep + 1);
        if (dir !== "in" && dir !== "out") continue;
        if (!models[model]) models[model] = { in: 0, out: 0 };
        models[model][dir] = Number(value) || 0;
      }
      return { day, models };
    });
  } catch (err) {
    console.error("getModelTokenHistory failed:", err);
    return dayKeys.map((day) => ({ day, models: {} }));
  }
}
