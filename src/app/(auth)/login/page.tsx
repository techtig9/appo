"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/dashboard");
  }

  async function handleGoogleLogin() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({ provider: "google" });
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={handleLogin} className="glass-card fade-in w-full max-w-sm space-y-4 p-8">
        <h1 className="text-xl font-semibold">Log in to appo</h1>
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
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          placeholder="Password"
          className="builder-input"
        />
        {error && <p className="text-sm text-rose-300">{error}</p>}
        <button type="submit" className="btn-accent w-full">
          Log In
        </button>
        <button type="button" onClick={handleGoogleLogin} className="w-full rounded-full border border-white/10 py-3">
          Continue with Google
        </button>
        <div className="flex justify-between text-sm">
          <a href="/signup" className="text-violet">
            Create account
          </a>
          <a href="/forgot-password" className="text-violet">
            Forgot password?
          </a>
        </div>
      </form>
    </main>
  );
}
