"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Last-resort boundary for errors thrown while rendering the root layout
 * itself — `error.tsx` cannot catch those, so without this file a render
 * failure in the shell produced Next's unstyled default page AND was never
 * reported to Sentry (the build warned about exactly this).
 *
 * It replaces the whole document, so it has to render its own <html> and
 * carry its own inline styles: none of the app's CSS is guaranteed to have
 * loaded at this point.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#09090B",
          color: "#F5F7FA",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          padding: "24px",
        }}
      >
        <main style={{ maxWidth: "420px", textAlign: "center" }}>
          <p
            style={{
              margin: 0,
              fontSize: "12px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#717784",
            }}
          >
            Appo
          </p>
          <h1 style={{ margin: "12px 0 0", fontSize: "24px", lineHeight: 1.3, fontWeight: 600 }}>
            Something went wrong loading Appo
          </h1>
          <p style={{ margin: "12px 0 0", fontSize: "14px", lineHeight: 1.6, color: "#A1A7B3" }}>
            The page failed to start. Our team has been notified automatically. Reloading usually
            resolves it — if it does not, email support@appo.app
            {error.digest ? ` and quote reference ${error.digest}` : ""}.
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "24px" }}>
            <button
              onClick={reset}
              style={{
                cursor: "pointer",
                border: "none",
                borderRadius: "10px",
                padding: "10px 18px",
                fontSize: "14px",
                fontWeight: 500,
                color: "#fff",
                background: "#7C5CFF",
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                borderRadius: "10px",
                padding: "10px 18px",
                fontSize: "14px",
                fontWeight: 500,
                color: "#F5F7FA",
                textDecoration: "none",
                border: "1px solid #272A33",
              }}
            >
              Go home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
