// Node.js runtime Sentry init -- loaded by src/instrumentation.ts's
// register() hook. Same "safe no-op until a real DSN exists" shape as the
// client config.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
});
