import * as Sentry from "@sentry/nextjs";
import type { InstrumentationOnRequestError } from "next/dist/server/instrumentation/types";
import { logAppError } from "@/lib/errorLog";

// Next.js's own instrumentation hook -- picks the right Sentry config for
// whichever runtime this server process actually is (Node vs Edge), since
// a single init can't cover both.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

// Fires automatically for uncaught errors inside server components / route
// handlers -- Sentry's own handler still runs (external, deep-dive
// tracking once a DSN is set), but this also writes the same error into
// our own app_errors table via logAppError, so the in-app "Errors" admin
// page has something to show even before Sentry is configured, and stays
// useful alongside it afterward.
export const onRequestError: InstrumentationOnRequestError = async (error, request, context) => {
  await Sentry.captureRequestError(error, request, context);
  await logAppError(error, { route: context.routePath });
};
