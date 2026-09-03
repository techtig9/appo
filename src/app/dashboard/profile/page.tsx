"use client";

import { useEffect, useState } from "react";

interface Profile {
  name: string | null;
  email: string;
  role: "user" | "admin";
  created_at: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/account/profile")
      .then((r) => r.json())
      .then((data) => {
        setProfile(data.profile);
        setName(data.profile?.name ?? "");
      });
  }, []);

  async function saveName() {
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const data = await res.json();
      setProfile(data.profile);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  return (
    <div className="fade-in space-y-6">
      <h1 className="text-2xl font-semibold text-ink">Profile</h1>

      <div className="glass-card space-y-4 p-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-violet-deep to-fuchsia-500" />
          <div>
            <p className="font-semibold">{profile?.name || "Unnamed"}</p>
            <p className="text-sm text-ink-secondary">{profile?.email}</p>
          </div>
        </div>

        <label className="block text-sm">
          Display name
          <input
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            className="input mt-1"
          />
        </label>
        <button onClick={saveName} disabled={saving} className="btn-accent text-sm">
          {saving ? "Saving…" : saved ? "Saved" : "Save changes"}
        </button>

        <div className="border-t border-line pt-4 text-sm text-ink-secondary">
          <p>Role: <span className="capitalize text-ink">{profile?.role}</span></p>
          {profile?.created_at && (
            <p className="mt-1">Member since {new Date(profile.created_at).toLocaleDateString()}</p>
          )}
        </div>
      </div>
    </div>
  );
}
