"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthShell, AuthField, AuthSubmit, GoogleButton, AuthNotice } from "@/components/auth/AuthShell";

/** Mirrors the minimum Supabase enforces, plus a check against the obvious. */
function passwordProblem(password: string): string | null {
  if (password.length < 8) return "Use at least 8 characters.";
  if (!/[a-z]/i.test(password) || !/[0-9]/.test(password)) return "Include at least one letter and one number.";
  if (/^(password|12345678|qwerty)/i.test(password)) return "That password is too easy to guess.";
  return null;
}

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"password" | "google" | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSignup(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    const problem = passwordProblem(password);
    if (problem) {
      setError(problem);
      return;
    }

    setBusy("password");
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Confirmation links carry a PKCE code, so they have to land on the
        // callback route that exchanges it — not straight on /dashboard,
        // which cannot establish a session and simply bounced the user back
        // to /login.
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard/get-started`,
        data: { name: name.trim() || null, full_name: name.trim() || null },
      },
    });

    setBusy(null);

    if (signUpError) {
      setError(
        /already registered|already exists/i.test(signUpError.message)
          ? "An account already exists for that email. Try signing in instead."
          : signUpError.message
      );
      return;
    }

    // When the project has email confirmation switched off, signUp returns
    // a live session and the user is already in. Handling both outcomes
    // avoids showing "check your email" to someone who does not need to.
    if (data.session) {
      void fetch("/api/auth/session-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "signed_up" }),
      }).catch(() => {});
      router.push("/dashboard/get-started");
      router.refresh();
      return;
    }

    setSubmitted(true);
  }

  async function handleGoogleSignup() {
    setError("");
    setBusy("google");
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard/get-started`,
        queryParams: { access_type: "offline", prompt: "select_account" },
      },
    });
    if (oauthError) {
      setBusy(null);
      setError("We couldn't start the Google sign-up. Please try again, or use your email address.");
    }
  }

  if (submitted) {
    return (
      <AuthShell title="Check your inbox" subtitle={`We sent a confirmation link to ${email}.`}>
        <AuthNotice tone="success">
          Click the link in that email to activate your account. The link expires in 24 hours.
        </AuthNotice>
        <p className="mt-4 text-sm leading-6 text-[#A1A7B3]">
          Nothing arrived? Check your spam folder, or{" "}
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="font-medium text-[#A78BFA] underline underline-offset-2 hover:text-[#C4B5FD]"
          >
            try a different address
          </button>
          .
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your Appo account"
      subtitle="Describe an app. Get a real one. Free to start."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-[#A78BFA] hover:text-[#C4B5FD]">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSignup} className="space-y-4" noValidate>
        <AuthField id="name" label="Name" autoComplete="name" value={name} onChange={setName} placeholder="Ada Lovelace" />
        <AuthField
          id="email"
          label="Work email"
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
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={setPassword}
          placeholder="At least 8 characters"
          hint="At least 8 characters, including a letter and a number."
        />

        {error ? <AuthNotice tone="error">{error}</AuthNotice> : null}

        <AuthSubmit busy={busy === "password"} busyLabel="Creating your account…">
          Create account
        </AuthSubmit>
      </form>

      <div className="my-6 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-[#272A33]" />
        <span className="text-xs text-[#717784]">or</span>
        <span className="h-px flex-1 bg-[#272A33]" />
      </div>

      <GoogleButton busy={busy === "google"} onClick={handleGoogleSignup} label="Sign up with Google" />
    </AuthShell>
  );
}
