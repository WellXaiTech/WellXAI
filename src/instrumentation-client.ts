// Client-side Sentry init -- auto-loaded by Next.js from this exact path
// (App Router convention). Stays a safe no-op until NEXT_PUBLIC_SENTRY_DSN
// is actually set (see .env's own comment next to it): `enabled: false`
// with no dsn means the SDK does nothing rather than erroring, so this
// ships now and switches on the moment a real Sentry project exists.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
});
