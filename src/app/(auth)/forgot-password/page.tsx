"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSent(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={handleReset} className="glass-card fade-in w-full max-w-sm space-y-4 p-8">
        <h1 className="text-xl font-semibold">Reset your password</h1>
        {sent ? (
          <p className="text-sm text-slate-400">If an account exists for {email}, a reset link is on its way.</p>
        ) : (
          <>
            <input
              type="email"
              required
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-slate-400 px-4 py-2"
            />
            <button type="submit" className="btn-accent w-full">
              Send Reset Link
            </button>
          </>
        )}
      </form>
    </main>
  );
}
