import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import {
  getGithubAppConfig,
  getInstallationOwner,
  clearInstallationByInstallationId,
  fetchInstallationInfo,
  saveUserInstallation,
} from "@/lib/githubApp";

// GitHub's own signal for installation changes -- independent of (and a
// safety net for) the browser-based setup_url callback, which only ever
// fires once, at the moment of a fresh browser redirect. Two things this
// makes possible that the callback alone can't:
//
// 1. Real uninstall detection. Without this, a user removing ChatGiZa
//    from github.com/settings/installations directly leaves ChatGiZa
//    thinking it's still connected forever -- pushes would just start
//    failing silently against a dead installation id, which reads as
//    "something's broken" rather than "reconnect GitHub".
// 2. Self-healing if a user's own per-user record is ever lost for any
//    reason (a disconnect that also clears it, a bug, manual KV
//    surgery) -- as long as the durable reverse index
//    (installation id -> user id, see githubApp.ts's
//    saveInstallationOwner) still has the mapping from when they first
//    connected, the next event GitHub sends for that installation
//    restores it automatically, with no support request needed.
//
// What this can NOT do: identify which ChatGiZa user a genuinely NEW
// installation belongs to -- GitHub's webhook payload only knows the
// GitHub account, never our internal user id. That mapping only exists
// once the normal browser callback (which carries our signed `state`)
// has completed successfully at least once.
//
// Must be turned on by hand in the GitHub App's own settings
// (Settings -> General -> Webhook -- check "Active", URL is this
// route, secret is the one saved from the manifest conversion) --
// there's no API to flip that switch after the app already exists.

function verifySignature(secret: string, payload: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(payload).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signatureHeader);
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}

export async function POST(req: NextRequest) {
  const cfg = await getGithubAppConfig();
  if (!cfg?.webhookSecret) {
    return NextResponse.json({ error: "GitHub App not configured" }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");
  if (!verifySignature(cfg.webhookSecret, rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = req.headers.get("x-github-event");
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (event === "installation") {
    const installation = payload.installation as { id: number } | undefined;
    const action = payload.action as string | undefined;
    const installationId = installation ? String(installation.id) : null;

    if (installationId && action === "deleted") {
      await clearInstallationByInstallationId(installationId);
    } else if (installationId && (action === "new_permissions_accepted" || action === "unsuspend")) {
      // Refresh (or restore) the owner's record with the current
      // account/permission state -- a no-op if we've never heard of
      // this installation's owner (a brand-new install we haven't seen
      // the browser callback for yet, if this event race ever happens).
      const ownerId = await getInstallationOwner(installationId);
      if (ownerId) {
        const info = await fetchInstallationInfo(installationId);
        if (info) await saveUserInstallation(ownerId, info);
      }
    }
    // "suspend" and "created" are deliberately no-ops here: a suspended
    // installation's own token calls will just start failing with a
    // clear provider error rather than needing a separate disconnected
    // state, and "created" for a truly new user can't be attributed to
    // anyone without the browser callback's signed state anyway (see
    // the comment above).
  }

  return NextResponse.json({ ok: true });
}
