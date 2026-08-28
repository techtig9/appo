"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) {
      setError(error.message);
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="glass-card fade-in max-w-sm p-8 text-center">
          <h1 className="text-xl font-semibold">Check your email</h1>
          <p className="mt-2 text-sm text-slate-400">We sent a verification link to {email}.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={handleSignup} className="glass-card fade-in w-full max-w-sm space-y-4 p-8">
        <h1 className="text-xl font-semibold">Create your appo account</h1>
        <input
          type="email"
          required
          value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          placeholder="Email"
          className="builder-input"
        />
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          placeholder="Password"
          className="builder-input"
        />
        {error && <p className="text-sm text-rose-300">{error}</p>}
        <button type="submit" className="btn-accent w-full">
          Sign Up
        </button>
        <a href="/login" className="block text-center text-sm text-violet">
          Already have an account? Log in
        </a>
      </form>
    </main>
  );
}
