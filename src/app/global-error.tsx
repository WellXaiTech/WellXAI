"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import NextError from "next/error";

// Next.js's own top-level error boundary -- the one place that catches a
// crash the root layout itself can't recover from. Reports it to Sentry
// (a no-op until NEXT_PUBLIC_SENTRY_DSN is set, same as everywhere else)
// before falling back to Next's own default error page.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
