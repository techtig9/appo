"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ThemeChoice = "light" | "dark" | "system";

const STORAGE_KEY = "appo-theme";

interface ThemeContextValue {
  /** What the user chose. "system" means follow the OS. */
  theme: ThemeChoice;
  /** What is actually being rendered right now. */
  resolved: "light" | "dark";
  setTheme: (theme: ThemeChoice) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolved: "dark",
  setTheme: () => {},
});

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

/**
 * Runs before first paint, inlined in <head>.
 *
 * Without it the page renders with the default palette for one frame and
 * then swaps — the white flash a dark-first product cannot afford. Reading
 * localStorage can throw outright in a browser configured to block site
 * data, so the whole thing is wrapped: a theme preference must never be
 * able to stop the app from rendering.
 */
export const THEME_INIT_SCRIPT = `(function(){try{
var stored=localStorage.getItem('${STORAGE_KEY}');
var choice=stored==='light'||stored==='dark'||stored==='system'?stored:'system';
var dark=choice==='dark'||(choice==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
var root=document.documentElement;
if(choice==='system'){root.removeAttribute('data-theme');}else{root.setAttribute('data-theme',choice);}
root.style.colorScheme=dark?'dark':'light';
root.classList.remove('no-js');
}catch(e){document.documentElement.classList.remove('no-js');}})();`;

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function readStoredTheme(): ThemeChoice {
  if (typeof window === "undefined") return "system";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // Private mode / blocked storage. Fall through to the default.
  }
  return "system";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Starts at the SSR-safe default and is corrected in the effect below.
  // The inline script has already applied the right attribute to <html>,
  // so this reconciliation is invisible.
  const [theme, setThemeState] = useState<ThemeChoice>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const stored = readStoredTheme();
    setThemeState(stored);
    setResolved(stored === "system" ? (systemPrefersDark() ? "dark" : "light") : stored);
  }, []);

  // Follow the OS live while the choice is "system" — a user switching
  // their machine to dark at sunset should see the app follow.
  useEffect(() => {
    if (theme !== "system" || typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => {
      setResolved(event.matches ? "dark" : "light");
      document.documentElement.style.colorScheme = event.matches ? "dark" : "light";
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((next: ThemeChoice) => {
    setThemeState(next);
    const isDark = next === "dark" || (next === "system" && systemPrefersDark());
    setResolved(isDark ? "dark" : "light");

    const root = document.documentElement;
    if (next === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", next);
    root.style.colorScheme = isDark ? "dark" : "light";

    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Preference simply will not persist. The session still works.
    }
  }, []);

  const value = useMemo(() => ({ theme, resolved, setTheme }), [theme, resolved, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
