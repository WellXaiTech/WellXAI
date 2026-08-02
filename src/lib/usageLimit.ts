import { kv } from "@vercel/kv";
import { isMobileIp } from "@/lib/ipType";

function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}

function planKey(userId: string) {
  return `chatgiza:plan:${userId}`;
}

function ipUsageKey(ip: string) {
  return `chatgiza:ip-usage:${ip}`;
}

function convoQuotaKey(userId: string, conversationId: string) {
  return `chatgiza:convo-quota:${userId}:${conversationId}`;
}

export async function isPaidAccount(userId?: string | null): Promise<boolean> {
  if (!userId) return false;
  try {
    const tier = await kv.get(planKey(userId));
    return Boolean(tier);
  } catch (err) {
    console.error("Plan lookup failed:", err);
    return false;
  }
}

export async function setAccountPlan(userId: string, tier: string): Promise<void> {
  try {
    await kv.set(planKey(userId), tier);
  } catch (err) {
    console.error("Failed to persist account plan:", err);
  }
}

const IP_LIMIT_MESSAGE = "You've used your free message from this network. Upgrade to keep chatting.";

/**
 * Server-side backstop against SIM-cycling abuse: once a request has
 * succeeded from a given mobile/cellular IP, that IP is capped at one free
 * message forever — no matter how many different Google accounts sign in
 * from it afterward. Only applies to mobile/cellular connections (see
 * `isMobileIp`) — WiFi networks are exempt since they're often legitimately
 * shared by several distinct people. Paid accounts are always exempt.
 * Returns a user-facing message when the caller should be blocked, or null
 * when it's fine to proceed (in which case the caller must then call
 * `recordIpUsage`).
 */
export async function checkIpFreeLimit(headers: Headers, paid: boolean): Promise<string | null> {
  if (paid) return null;

  const ip = getClientIp(headers);
  if (ip === "unknown") return null;
  if (!(await isMobileIp(ip))) return null;

  try {
    const used = await kv.get<number>(ipUsageKey(ip));
    if ((used ?? 0) >= 1) return IP_LIMIT_MESSAGE;
  } catch (err) {
    console.error("IP usage check failed:", err);
  }
  return null;
}

export async function recordIpUsage(headers: Headers, paid: boolean): Promise<void> {
  if (paid) return;
  const ip = getClientIp(headers);
  if (ip === "unknown") return;
  if (!(await isMobileIp(ip))) return;
  try {
    await kv.incr(ipUsageKey(ip));
  } catch (err) {
    console.error("IP usage record failed:", err);
  }
}

const FREE_MESSAGES_PER_CONVERSATION = 10;
const CONVERSATION_QUOTA_WINDOW_SECONDS = 24 * 60 * 60;
const CONVERSATION_LIMIT_MESSAGE =
  "You've reached the free limit for this chat. Upgrade to keep going, or start a new chat to continue.";

/**
 * For signed-in accounts on a non-mobile connection without a paid plan:
 * 10 free messages per conversation. The window silently renews itself 24
 * hours after the first message in it — that reset is never surfaced to the
 * user, who only ever sees "upgrade or start a new chat".
 */
export async function checkConversationQuota(
  userId: string,
  conversationId: string,
  paid: boolean
): Promise<string | null> {
  if (paid) return null;
  try {
    const count = (await kv.get<number>(convoQuotaKey(userId, conversationId))) ?? 0;
    if (count >= FREE_MESSAGES_PER_CONVERSATION) return CONVERSATION_LIMIT_MESSAGE;
  } catch (err) {
    console.error("Conversation quota check failed:", err);
  }
  return null;
}

export async function recordConversationUsage(userId: string, conversationId: string, paid: boolean): Promise<void> {
  if (paid) return;
  const key = convoQuotaKey(userId, conversationId);
  try {
    const count = await kv.incr(key);
    if (count === 1) {
      // Only set the expiry on the first message of a fresh window, so the
      // 24 hours count from when this conversation's quota actually started.
      await kv.expire(key, CONVERSATION_QUOTA_WINDOW_SECONDS);
    }
  } catch (err) {
    console.error("Conversation quota record failed:", err);
  }
}
