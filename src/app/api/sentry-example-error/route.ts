// Deliberately throws -- lets /sentry-example-page trigger a real SERVER
// error on demand, exercising the same automatic capture path
// (src/instrumentation.ts's onRequestError) that a genuine bug would hit:
// both Sentry and the in-app app_errors table should get it.
export async function GET(): Promise<never> {
  throw new Error("Sentry example server error -- triggered on purpose from /sentry-example-page.");
}
