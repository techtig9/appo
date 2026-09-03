"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "appo-cookie-consent";

/**
 * Cookie notice.
 *
 * Two fixes over the previous version:
 *
 *  - `window.localStorage?.getItem(...)` looks defensive but is not:
 *    accessing `window.localStorage` at all THROWS in a browser configured
 *    to block site data, and optional chaining does not catch a throw. In
 *    that browser the notice crashed the client render of every page it
 *    appeared on. Both accesses are now inside try/catch.
 *  - It is a dismissible notice, not a consent gate, so it is announced
 *    politely and can be dismissed from the keyboard.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      // Storage is blocked. Showing the notice once per session is the
      // right fallback — it is better than crashing, and better than
      // never showing it at all.
      setVisible(true);
    }
  }, []);

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "acknowledged");
    } catch {
      // The choice will not persist, but the notice still goes away for
      // this session.
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      // Left-anchored and given right padding so it never sits underneath the
      // assistant launcher pinned to the bottom-right corner.
      className="fixed inset-x-4 bottom-4 z-toast flex max-w-lg animate-fade-up flex-wrap items-center gap-4 rounded-lg border border-line bg-surface p-4 pr-20 shadow-lg sm:inset-x-auto sm:left-4 sm:pr-4"
    >
      <p className="min-w-[200px] flex-1 text-caption leading-relaxed text-ink-secondary">
        Appo uses cookies that are strictly necessary to keep you signed in. Read the{" "}
        <Link href="/privacy" className="text-brand underline underline-offset-2">
          Privacy Policy
        </Link>
        .
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="inline-flex h-9 items-center rounded-md bg-brand px-4 text-small font-medium text-brand-contrast transition-colors duration-micro hover:bg-brand-hover"
      >
        Got it
      </button>
    </div>
  );
}
