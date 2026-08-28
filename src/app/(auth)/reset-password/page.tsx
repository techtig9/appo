"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);

  // The recovery link Supabase emails the user lands here with a session
  // established from the URL (handled by the browser client's auth
  // listener). Wait for that session before allowing a password change —
  // otherwise updateUser would silently fail for a signed-out visitor.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords don't match."); return; }
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setDone(true);
    setTimeout(() => router.push("/dashboard"), 1500);
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={handleReset} className="glass-card fade-in w-full max-w-sm space-y-4 p-8">
        <h1 className="text-xl font-semibold">Choose a new password</h1>

        {done ? (
          <p className="text-sm text-slate-400">Password updated. Taking you to your dashboard…</p>
        ) : !ready ? (
          <p className="text-sm text-slate-400">Verifying your reset link…</p>
        ) : (
          <>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              placeholder="New password"
              className="builder-input"
            />
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="builder-input"
            />
            {error && <p className="text-sm text-rose-300">{error}</p>}
            <button type="submit" disabled={busy} className="btn-accent w-full disabled:opacity-50">
              {busy ? "Updating…" : "Update password"}
            </button>
          </>
        )}
      </form>
    </main>
  );
}
