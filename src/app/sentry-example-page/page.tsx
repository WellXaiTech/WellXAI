"use client";

import { useState } from "react";
import * as Sentry from "@sentry/nextjs";

// A deliberate, on-demand way to confirm Sentry (and the in-app Errors
// admin page) are actually capturing real errors end to end, matching
// Sentry's own standard "example page" convention -- not linked from
// anywhere in the app's normal navigation, just a manual check.
export default function SentryExamplePage() {
  const [serverResult, setServerResult] = useState<string | null>(null);
  const [clientResult, setClientResult] = useState<string | null>(null);

  // Caught here (not left to throw uncaught) specifically so the button
  // shows real, visible confirmation instead of appearing to do nothing --
  // an uncaught throw in an onClick handler is still reported by Sentry's
  // own global window.onerror listener, but leaves zero on-page feedback,
  // which read as "the button doesn't work" even though it did. Reporting
  // it manually here keeps it in Sentry either way.
  function throwClientError() {
    try {
      throw new Error("Sentry example client error -- triggered on purpose from /sentry-example-page.");
    } catch (err) {
      Sentry.captureException(err);
      setClientResult("Client error thrown and reported to Sentry (check Sentry -> Issues).");
    }
  }

  async function throwServerError() {
    setServerResult("Calling the server...");
    try {
      const res = await fetch("/api/sentry-example-error");
      setServerResult(res.ok ? "Unexpected: server did not throw." : `Server responded ${res.status} (expected -- it threw on purpose).`);
    } catch {
      setServerResult("Request failed at the network level.");
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: "80px auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Sentry example page</h1>
      <p style={{ color: "#666", marginBottom: 24 }}>
        Not linked from anywhere in the app -- a manual check that real errors actually reach Sentry (and the
        in-app Errors admin page) end to end.
      </p>
      <div style={{ display: "flex", gap: 12 }}>
        <button
          onClick={throwClientError}
          style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #ccc", cursor: "pointer" }}
        >
          Throw a client error
        </button>
        <button
          onClick={throwServerError}
          style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #ccc", cursor: "pointer" }}
        >
          Throw a server error
        </button>
      </div>
      {clientResult && <p style={{ marginTop: 16, color: "#666" }}>{clientResult}</p>}
      {serverResult && <p style={{ marginTop: 16, color: "#666" }}>{serverResult}</p>}
      <p style={{ marginTop: 32, fontSize: 13, color: "#999" }}>
        After clicking either button, check Sentry &rarr; Issues, and the app&apos;s own admin &rarr; Errors page --
        both should show it within moments.
      </p>
    </div>
  );
}
