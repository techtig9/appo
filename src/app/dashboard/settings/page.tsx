"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setUserEmail(data.user.email);
    });
    supabase.auth.mfa.listFactors().then(({ data }) => {
      const verified = data?.totp?.find((factor) => factor.status === "verified");
      setMfaEnabled(Boolean(verified));
      setFactorId(verified?.id ?? null);
    });
  }, []);

  async function enableMfa() {
    setBusy(true); setMessage("");
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Appo Authenticator" });
    if (error) { setMessage(error.message); setBusy(false); return; }
    setFactorId(data?.id ?? null);
    setQr(data && data.type === "totp" ? data.totp.qr_code : null);
    setMessage("Scan the QR code with your authenticator app, then enter the 6-digit code to verify it.");
    setBusy(false);
  }

  async function verifyMfa() {
    if (!factorId || otp.length !== 6) return;
    setBusy(true); setMessage("");
    const supabase = createClient();
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError || !challenge?.id) { setMessage(challengeError?.message ?? "Could not create MFA challenge."); setBusy(false); return; }
    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code: otp });
    if (error) setMessage(error.message);
    else { setMfaEnabled(true); setQr(null); setOtp(""); setMessage("Two-factor authentication is now enabled."); }
    setBusy(false);
  }

  async function disableMfa() {
    if (!factorId || !confirm("Disable two-factor authentication for this account?")) return;
    setBusy(true); setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) setMessage(error.message);
    else { setMfaEnabled(false); setFactorId(null); setMessage("Two-factor authentication disabled."); }
    setBusy(false);
  }

  async function sendPasswordReset() {
    setBusy(true); setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(userEmail, { redirectTo: `${window.location.origin}/dashboard/settings` });
    setMessage(error ? error.message : "Password reset instructions sent to your email.");
    setBusy(false);
  }

  async function signOutEverywhere() {
    if (!confirm("Sign out of Appo on every device?")) return;
    setBusy(true); setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) setMessage(error.message); else router.push("/");
    setBusy(false);
  }

  function exportData() { window.location.href = "/api/account/export"; }

  async function deleteAccount() {
    if (confirmEmail !== userEmail) return;
    if (!confirm("This permanently deletes your account and all your apps. This cannot be undone. Continue?")) return;
    setDeleting(true);
    try {
      // The confirmation is re-checked server-side against the session's
      // own email; sending it here is what lets that check happen.
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmEmail }),
      });
      if (res.ok) { await createClient().auth.signOut(); router.push("/"); }
      else { const data = await res.json(); setMessage(data.error ?? "Could not delete account."); setDeleting(false); }
    } catch { setMessage("Network error — please try again."); setDeleting(false); }
  }

  return (
    <div className="fade-in max-w-4xl space-y-6">
      <div><h1 className="text-2xl font-semibold text-white">Security & settings</h1><p className="mt-1 text-sm text-slate-400">Protect your account, control your data and manage access.</p></div>

      {message && <div role="status" className="rounded-xl border border-violet/20 bg-violet/10 px-4 py-3 text-sm text-violet-200">{message}</div>}

      <section className="glass-card space-y-5 p-6">
        <div><h2 className="font-semibold text-white">Two-factor authentication</h2><p className="mt-1 text-sm text-slate-400">Add an authenticator app as a second layer of protection.</p></div>
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[.025] p-4">
          <div><p className="text-sm font-medium text-white">Authenticator app</p><p className="text-xs text-slate-500">{mfaEnabled ? "Enabled and verified" : "Not enabled"}</p></div>
          {mfaEnabled ? <button onClick={disableMfa} disabled={busy} className="btn-outline text-sm">Disable</button> : <button onClick={enableMfa} disabled={busy} className="btn-accent text-sm">Set up 2FA</button>}
        </div>
        {qr && <div className="rounded-xl border border-white/10 bg-white/[.025] p-4"><p className="mb-3 text-sm text-slate-300">Scan this QR code in your authenticator app.</p><img src={qr} alt="Authenticator QR code" className="h-44 w-44 rounded-lg bg-white p-2" /><div className="mt-4 flex max-w-sm gap-2"><input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="6-digit code" className="input" /><button onClick={verifyMfa} disabled={busy || otp.length !== 6} className="btn-accent text-sm">Verify</button></div></div>}
      </section>

      <section className="glass-card space-y-4 p-6">
        <div><h2 className="font-semibold text-white">Account access</h2><p className="mt-1 text-sm text-slate-400">Manage your password and active authentication sessions.</p></div>
        <div className="grid gap-3 sm:grid-cols-2"><button onClick={sendPasswordReset} disabled={busy || !userEmail} className="btn-outline text-sm">Email password reset</button><button onClick={signOutEverywhere} disabled={busy} className="btn-outline text-sm">Sign out everywhere</button></div>
        <p className="text-xs text-slate-500">Password reset instructions will be sent to {userEmail || "your account email"}.</p>
      </section>

      <section className="glass-card space-y-4 p-6">
        <div><h2 className="font-semibold text-white">Your data</h2><p className="mt-1 text-sm text-slate-400">Keep a portable copy of the information associated with your Appo account.</p></div>
        <button onClick={exportData} className="btn-outline text-sm">Export account data</button>
      </section>

      <section className="glass-card space-y-4 border border-fuchsia-400/25 p-6">
        <div><h2 className="font-medium text-fuchsia-300">Delete account</h2><p className="mt-1 text-sm text-slate-400">Permanently deletes your account, apps and billing history. This cannot be undone.</p></div>
        <input value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} placeholder={`Type ${userEmail || "your email"} to confirm`} className="input" />
        <button onClick={deleteAccount} disabled={deleting || confirmEmail !== userEmail || !userEmail} className="rounded-full border border-fuchsia-400/40 px-6 py-3 text-sm text-fuchsia-300 transition hover:bg-fuchsia-400/10 disabled:cursor-not-allowed disabled:opacity-40">{deleting ? "Deleting…" : "Permanently delete account"}</button>
      </section>
    </div>
  );
}
