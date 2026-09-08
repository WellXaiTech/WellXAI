import * as Sentry from "@sentry/nextjs";
import { supabaseAdmin } from "@/lib/supabase";

// The internal counterpart to Sentry -- Sentry stays the deep-dive tool
// (stack traces, breadcrumbs, release tracking) once its DSN is set, but
// it's an external site the user has to go open. This writes the same
// errors into our own `app_errors` table so a plain, always-available
// "Errors" page inside ChatGiZa's own admin panel works regardless of
// whether Sentry is configured yet. Best-effort like every other logger in
// this codebase -- a broken error LOGGER must never itself throw and mask
// the real error it was trying to record.
export async function logAppError(
  error: unknown,
  opts: { route?: string; userId?: string | null } = {}
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack ?? null : null;

  try {
    Sentry.captureException(error, {
      tags: opts.route ? { route: opts.route } : undefined,
      user: opts.userId ? { id: opts.userId } : undefined,
    });
  } catch (err) {
    console.error("Sentry capture failed:", err);
  }

  try {
    await supabaseAdmin.from("app_errors").insert({
      message: message.slice(0, 2000),
      stack: stack?.slice(0, 8000) ?? null,
      route: opts.route ?? null,
      user_id: opts.userId ?? null,
    });
  } catch (err) {
    console.error("logAppError DB insert failed:", err);
  }
}
