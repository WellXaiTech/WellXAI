import { kv } from "@vercel/kv";

export type DeviceSession = {
  id: string;
  device: string;
  os: string;
  signedInAt: number;
};

function sessionsKey(userId: string) {
  return `chatgiza:sessions:${userId}`;
}

function revokedKey(userId: string) {
  return `chatgiza:revoked-sessions:${userId}`;
}

const MAX_SESSIONS = 8;

/** Very small user-agent read — enough to label a device in a list, not a full parser. */
export function labelDevice(userAgent: string | null): { device: string; os: string } {
  const ua = userAgent ?? "";
  let os = "Unknown OS";
  if (/windows/i.test(ua)) os = "Windows";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ios/i.test(ua)) os = "iOS";
  else if (/mac os x/i.test(ua)) os = "macOS";
  else if (/linux/i.test(ua)) os = "Linux";

  let device = "Computer";
  if (/android|iphone|ipad|mobile/i.test(ua)) device = "Phone";

  let browser = "Browser";
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/chrome\//i.test(ua)) browser = "Chrome";
  else if (/firefox\//i.test(ua)) browser = "Firefox";
  else if (/safari\//i.test(ua)) browser = "Safari";

  return { device: `${browser} · ${device}`, os };
}

export async function recordSession(userId: string, sessionId: string, userAgent: string | null): Promise<void> {
  try {
    const { device, os } = labelDevice(userAgent);
    const entry: DeviceSession = { id: sessionId, device, os, signedInAt: Date.now() };
    const existing = (await kv.get<DeviceSession[]>(sessionsKey(userId))) ?? [];
    const next = [entry, ...existing.filter((s) => s.id !== sessionId)].slice(0, MAX_SESSIONS);
    await kv.set(sessionsKey(userId), next);
  } catch (err) {
    console.error("recordSession failed:", err);
  }
}

export async function listSessions(userId: string): Promise<DeviceSession[]> {
  try {
    return (await kv.get<DeviceSession[]>(sessionsKey(userId))) ?? [];
  } catch (err) {
    console.error("listSessions failed:", err);
    return [];
  }
}

export async function isRevoked(userId: string, sessionId: string): Promise<boolean> {
  try {
    const revoked = (await kv.get<string[]>(revokedKey(userId))) ?? [];
    return revoked.includes(sessionId);
  } catch (err) {
    console.error("isRevoked check failed:", err);
    return false;
  }
}

export async function revokeSession(userId: string, sessionId: string): Promise<void> {
  try {
    const revoked = (await kv.get<string[]>(revokedKey(userId))) ?? [];
    if (!revoked.includes(sessionId)) {
      await kv.set(revokedKey(userId), [...revoked, sessionId]);
    }
    const existing = (await kv.get<DeviceSession[]>(sessionsKey(userId))) ?? [];
    await kv.set(
      sessionsKey(userId),
      existing.filter((s) => s.id !== sessionId)
    );
  } catch (err) {
    console.error("revokeSession failed:", err);
  }
}

export async function revokeAllSessions(userId: string, exceptSessionId?: string): Promise<void> {
  try {
    const existing = (await kv.get<DeviceSession[]>(sessionsKey(userId))) ?? [];
    const toRevoke = existing.filter((s) => s.id !== exceptSessionId).map((s) => s.id);
    const revoked = (await kv.get<string[]>(revokedKey(userId))) ?? [];
    await kv.set(revokedKey(userId), Array.from(new Set([...revoked, ...toRevoke])));
    await kv.set(
      sessionsKey(userId),
      existing.filter((s) => s.id === exceptSessionId)
    );
  } catch (err) {
    console.error("revokeAllSessions failed:", err);
  }
}
