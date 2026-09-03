"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthShell, AuthField, AuthSubmit, AuthNotice } from "@/components/auth/AuthShell";

type Status = "verifying" | "ready" | "expired" | "done";

/** How long to wait for a recovery session before calling the link dead. */
const VERIFY_TIMEOUT_MS = 6000;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>("verifying");
  const settled = useRef(false);

  // The recovery link establishes a session — either server-side via
  // /auth/callback, or by the browser client detecting the code in the
  // URL. Previously this waited for that session forever: an expired or
  // reused link left "Verifying your reset link…" on screen with no way
  // out. It now resolves to an explicit expired state.
  useEffect(() => {
    const supabase = createClient();

    const settle = (next: Status) => {
      if (settled.current) return;
      settled.current = true;
      setStatus(next);
    };

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) settle("ready");
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") settle("ready");
    });

    const timer = setTimeout(() => settle("expired"), VERIFY_TIMEOUT_MS);

    return () => {
      clearTimeout(timer);
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleReset(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (!/[a-z]/i.test(password) || !/[0-9]/.test(password)) {
      setError("Include at least one letter and one number.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Those passwords don't match.");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (updateError) {
      setError(
        /same as the old|should be different/i.test(updateError.message)
          ? "Choose a password you haven't used on this account before."
          : updateError.message
      );
      return;
    }

    // Confirmation email + audit entry. Not awaited: the password is
    // already changed and the user should not wait on a mail provider.
    void fetch("/api/auth/password-changed", { method: "POST" }).catch(() => {});

    setStatus("done");
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1600);
  }

  if (status === "done") {
    return (
      <AuthShell title="Password updated" subtitle="Taking you to your dashboard…">
        <AuthNotice tone="success">
          Your password has been changed and a confirmation has been emailed to you.
        </AuthNotice>
      </AuthShell>
    );
  }

  if (status === "expired") {
    return (
      <AuthShell
        title="That reset link has expired"
        subtitle="Reset links are single-use and valid for 60 minutes."
        footer={
          <>
            Remembered your password?{" "}
            <Link href="/login" className="font-medium text-[#A78BFA] hover:text-[#C4B5FD]">
              Sign in
            </Link>
          </>
        }
      >
        <AuthNotice tone="error">
          We couldn&apos;t verify this link. It may have already been used, or opened in a different browser from the
          one that requested it.
        </AuthNotice>
        <Link
          href="/forgot-password"
          className="mt-5 flex w-full items-center justify-center rounded-lg bg-[#7C5CFF] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#6B4AF0]"
        >
          Request a new link
        </Link>
      </AuthShell>
    );
  }

  if (status === "verifying") {
    return (
      <AuthShell title="Choose a new password" subtitle="Verifying your reset link…">
        <div className="space-y-3" aria-busy="true" aria-live="polite">
          <div className="h-10 animate-pulse rounded-lg bg-[#1B1D24]" />
          <div className="h-10 animate-pulse rounded-lg bg-[#1B1D24]" />
          <div className="h-10 animate-pulse rounded-lg bg-[#1B1D24]" />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password" subtitle="Pick something you don't use anywhere else.">
      <form onSubmit={handleReset} className="space-y-4" noValidate>
        <AuthField
          id="password"
          label="New password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={setPassword}
          placeholder="At least 8 characters"
          hint="At least 8 characters, including a letter and a number."
        />
        <AuthField
          id="confirm-password"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="Repeat your new password"
        />

        {error ? <AuthNotice tone="error">{error}</AuthNotice> : null}

        <AuthSubmit busy={busy} busyLabel="Updating…">
          Update password
        </AuthSubmit>
      </form>
    </AuthShell>
  );
}
