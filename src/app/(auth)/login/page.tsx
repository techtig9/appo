"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthShell, AuthField, AuthSubmit, GoogleButton, AuthNotice } from "@/components/auth/AuthShell";

/**
 * Sign-in.
 *
 * The Google button previously called `signInWithOAuth({ provider })` with
 * no options at all. With no `redirectTo`, Supabase sent the user to the
 * project's configured Site URL — a page with nothing on it that exchanges
 * the `?code=`. That is the white page. It now points explicitly at
 * /auth/callback, which does the exchange and sets the session cookie.
 */

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirectTo") ?? "/dashboard";
  const notice = params.get("notice");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"password" | "google" | null>(null);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy("password");

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setBusy(null);
      // Supabase returns "Invalid login credentials" for both a wrong
      // password and an unknown address, which is the correct behaviour —
      // distinguishing them would let anyone enumerate registered emails.
      setError(
        signInError.message === "Invalid login credentials"
          ? "That email and password combination doesn't match an account."
          : signInError.message === "Email not confirmed"
            ? "Please confirm your email address first — check your inbox for the link."
            : signInError.message
      );
      return;
    }

    // Fire the security notification. Deliberately not awaited as a
    // blocker on navigation, and its failure is swallowed: a sign-in must
    // not be held up by an email provider.
    void fetch("/api/auth/session-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "signed_in" }),
    }).catch(() => {});

    router.push(redirectTo);
    router.refresh();
  }

  async function handleGoogleLogin() {
    setError("");
    setBusy("google");

    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // The fix: send Google's callback to a route handler that can
        // actually exchange the code and write the session cookie.
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        queryParams: { access_type: "offline", prompt: "select_account" },
      },
    });

    if (oauthError) {
      setBusy(null);
      setError("We couldn't start the Google sign-in. Please try again, or use your email and password.");
    }
    // On success the browser navigates away; leaving `busy` set keeps the
    // button in its loading state for that brief moment.
  }

  return (
    <AuthShell
      title="Sign in to Appo"
      subtitle="Pick up where you left off."
      footer={
        <>
          New to Appo?{" "}
          <Link href="/signup" className="font-medium text-brand hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {notice === "cancelled" ? (
        <AuthNotice tone="info">Google sign-in was cancelled. You can try again or use your password.</AuthNotice>
      ) : null}

      <form onSubmit={handleLogin} className="space-y-4" noValidate>
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
        <AuthField
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          trailing={
            <Link href="/forgot-password" className="text-caption font-medium text-ink-muted transition-colors duration-micro hover:text-ink">
              Forgot?
            </Link>
          }
        />

        {error ? <AuthNotice tone="error">{error}</AuthNotice> : null}

        <AuthSubmit busy={busy === "password"} busyLabel="Signing in…">
          Sign in
        </AuthSubmit>
      </form>

      <div className="my-6 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        <span className="text-caption text-ink-muted">or</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <GoogleButton busy={busy === "google"} onClick={handleGoogleLogin} label="Continue with Google" />
    </AuthShell>
  );
}

export default function LoginPage() {
  // useSearchParams needs a Suspense boundary to keep this page from
  // opting the whole route out of static rendering.
  return (
    <Suspense fallback={<AuthShell title="Sign in to Appo" subtitle="Loading…" children={null} />}>
      <LoginForm />
    </Suspense>
  );
}
