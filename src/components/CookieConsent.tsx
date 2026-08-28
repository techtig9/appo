"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "appo-cookie-consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!window.localStorage?.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  function accept() {
    window.localStorage?.setItem(STORAGE_KEY, "accepted");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="glass-card fade-in fixed bottom-5 left-5 right-5 z-[100] mx-auto flex max-w-lg flex-wrap items-center gap-4 p-5">
      <p className="min-w-[200px] flex-1 text-sm text-slate-300">
        We use cookies for essential site function and basic analytics.{" "}
        <Link href="/privacy" className="text-cyan-400 underline">
          Learn more
        </Link>
      </p>
      <button onClick={accept} className="btn-accent px-5 py-2 text-sm">
        Got it
      </button>
    </div>
  );
}
