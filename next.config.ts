import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

// Wrapping is safe even before Sentry is actually configured -- with no
// SENTRY_AUTH_TOKEN set, the source-map upload step is skipped rather than
// failing the build (see the .env comment next to NEXT_PUBLIC_SENTRY_DSN).
export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  disableLogger: true,
  automaticVercelMonitors: false,
});
