"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AuthShell, AuthField, AuthSubmit, AuthNotice } from "@/components/auth/AuthShell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleReset(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);

    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      // Recovery links carry a PKCE code. Routing them through the
      // callback handler means the session is established server-side
      // before /reset-password renders, instead of that page having to
      // race the browser client's URL detection.
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    setBusy(false);
    // The outcome is shown identically whether or not an account exists.
    // Reporting "no such account" here would turn this form into an email
    // enumeration oracle.
    setSent(true);
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle={sent ? undefined : "We'll email you a link to choose a new one."}
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-[#A78BFA] hover:text-[#C4B5FD]">
            Back to sign in
          </Link>
        </>
      }
    >
      {sent ? (
        <>
          <AuthNotice tone="success">
            If an account exists for {email}, a reset link is on its way. It expires in 60 minutes.
          </AuthNotice>
          <p className="mt-4 text-sm leading-6 text-[#A1A7B3]">
            Nothing arrived after a few minutes? Check your spam folder, or{" "}
            <button
              type="button"
              onClick={() => setSent(false)}
              className="font-medium text-[#A78BFA] underline underline-offset-2 hover:text-[#C4B5FD]"
            >
              send it again
            </button>
            .
          </p>
        </>
      ) : (
        <form onSubmit={handleReset} className="space-y-4" noValidate>
          <AuthField
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={setEmail}
            placeholder="you@company.com"
          />
          <AuthSubmit busy={busy} busyLabel="Sending…">
            Send reset link
          </AuthSubmit>
        </form>
      )}
    </AuthShell>
  );
}
