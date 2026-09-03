"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/theme/ThemeProvider";
import { cn } from "./cn";

/**
 * Command palette (Cmd/Ctrl-K).
 *
 * Two kinds of entry, in one list:
 *  - Commands: fixed destinations and actions, matched locally so the
 *    palette is useful the instant it opens, with no network round trip.
 *  - Results: projects and templates from /api/search, fetched with a
 *    debounce and an AbortController so a fast typist does not race four
 *    responses into the wrong order.
 *
 * Keyboard behaviour follows the combobox pattern: arrows move a virtual
 * cursor, aria-activedescendant tells assistive tech where it is, Enter
 * runs the highlighted item, Escape closes.
 */

interface Command {
  id: string;
  label: string;
  hint?: string;
  group: string;
  keywords?: string[];
  run: () => void;
}

interface RemoteHit {
  type: "project" | "template" | "page";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

export function CommandPalette() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [hits, setHits] = useState<RemoteHit[]>([]);
  const [searching, setSearching] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setHits([]);
    setCursor(0);
  }, []);

  const go = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router]
  );

  const commands = useMemo<Command[]>(
    () => [
      { id: "new", label: "Create an app", hint: "AI Builder", group: "Actions", keywords: ["new", "generate", "build"], run: () => go("/dashboard/generator") },
      { id: "templates", label: "Browse templates", group: "Actions", keywords: ["marketplace", "starter"], run: () => go("/dashboard/templates") },
      { id: "projects", label: "Go to my apps", group: "Navigate", keywords: ["projects"], run: () => go("/dashboard/apps") },
      { id: "deployments", label: "Go to deployments", group: "Navigate", keywords: ["deploy", "release"], run: () => go("/dashboard/deployments") },
      { id: "analytics", label: "Go to analytics", group: "Navigate", keywords: ["usage", "metrics"], run: () => go("/dashboard/analytics") },
      { id: "billing", label: "Go to billing", group: "Navigate", keywords: ["plan", "credits", "subscription"], run: () => go("/dashboard/billing") },
      { id: "team", label: "Go to team", group: "Navigate", keywords: ["invite", "collaborators"], run: () => go("/dashboard/team") },
      { id: "settings", label: "Open settings", group: "Navigate", keywords: ["account", "security"], run: () => go("/dashboard/settings") },
      { id: "help", label: "Open help", group: "Navigate", keywords: ["docs", "support"], run: () => go("/help") },
      {
        id: "theme",
        label: `Switch to ${theme === "dark" ? "light" : theme === "light" ? "system" : "dark"} theme`,
        hint: `Currently ${theme}`,
        group: "Preferences",
        keywords: ["dark", "light", "appearance"],
        run: () => {
          setTheme(theme === "dark" ? "light" : theme === "light" ? "system" : "dark");
          close();
        },
      },
      {
        id: "logout",
        label: "Sign out",
        group: "Account",
        keywords: ["log out", "exit"],
        run: () => {
          close();
          // Full navigation rather than a client push, so the server
          // clears the session cookie on the way through.
          window.location.href = "/api/auth/signout";
        },
      },
    ],
    [go, theme, setTheme, close]
  );

  const matchingCommands = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return commands;
    return commands.filter(
      (command) =>
        command.label.toLowerCase().includes(needle) ||
        command.keywords?.some((keyword) => keyword.includes(needle))
    );
  }, [commands, query]);

  const items = useMemo(
    () => [
      ...matchingCommands.map((command) => ({ kind: "command" as const, command })),
      ...hits.map((hit) => ({ kind: "hit" as const, hit })),
    ],
    [matchingCommands, hits]
  );

  // Global shortcut.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.documentElement.classList.add("overflow-locked");
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(timer);
      document.documentElement.classList.remove("overflow-locked");
    };
  }, [open]);

  // Debounced remote search. The AbortController is what stops an earlier,
  // slower response from overwriting a later one.
  useEffect(() => {
    const term = query.trim();
    if (!open || term.length < 2) {
      setHits([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    setSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(term)}&limit=5`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          setHits([]);
          return;
        }
        const payload = (await response.json()) as {
          results: { projects: RemoteHit[]; templates: RemoteHit[]; pages: RemoteHit[] };
        };
        setHits([...payload.results.projects, ...payload.results.templates]);
      } catch {
        // Aborted or offline. The local commands still work, so there is
        // nothing useful to show the user here.
      } finally {
        setSearching(false);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, open]);

  useEffect(() => setCursor(0), [query]);

  // Keep the highlighted row in view as the cursor moves by keyboard.
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${cursor}"]`)?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  if (!open || typeof document === "undefined") return null;

  const runItem = (index: number) => {
    const item = items[index];
    if (!item) return;
    if (item.kind === "command") item.command.run();
    else go(item.hit.href);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((current) => (items.length === 0 ? 0 : (current + 1) % items.length));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((current) => (items.length === 0 ? 0 : (current - 1 + items.length) % items.length));
    } else if (event.key === "Enter") {
      event.preventDefault();
      runItem(cursor);
    }
  };

  let renderedIndex = -1;
  let lastGroup = "";

  return createPortal(
    <div className="fixed inset-0 z-dialog flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 animate-fade-in bg-[var(--app-scrim)] backdrop-blur-sm" onClick={close} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative w-full max-w-xl animate-scale-in overflow-hidden rounded-xl border border-line bg-surface shadow-overlay"
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <SearchIcon />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search projects, templates and commands…"
            aria-label="Search projects, templates and commands"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-list"
            aria-activedescendant={items.length ? `command-item-${cursor}` : undefined}
            className="h-14 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-muted"
          />
          <kbd className="kbd">esc</kbd>
        </div>

        <div ref={listRef} id="command-palette-list" role="listbox" aria-label="Results" className="max-h-[52vh] overflow-y-auto p-2">
          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-small text-ink-muted">
              {searching ? "Searching…" : `No matches for "${query}".`}
            </p>
          ) : (
            items.map((item) => {
              renderedIndex += 1;
              const index = renderedIndex;
              const group = item.kind === "command" ? item.command.group : item.hit.type === "project" ? "Your projects" : "Templates";
              const showHeading = group !== lastGroup;
              lastGroup = group;

              const label = item.kind === "command" ? item.command.label : item.hit.title;
              const hint = item.kind === "command" ? item.command.hint : item.hit.subtitle;

              return (
                <div key={`${group}-${label}-${index}`}>
                  {showHeading ? (
                    <p className="px-3 pb-1 pt-3 text-caption font-semibold uppercase tracking-wider text-ink-muted">{group}</p>
                  ) : null}
                  <div
                    id={`command-item-${index}`}
                    data-index={index}
                    role="option"
                    aria-selected={cursor === index}
                    tabIndex={-1}
                    onMouseEnter={() => setCursor(index)}
                    onClick={() => runItem(index)}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-small transition-colors duration-micro",
                      cursor === index ? "bg-brand-subtle text-ink" : "text-ink-secondary"
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
                    {hint ? <span className="hidden shrink-0 truncate text-caption text-ink-muted sm:block sm:max-w-[45%]">{hint}</span> : null}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-line px-4 py-2.5 text-caption text-ink-muted">
          <span className="flex items-center gap-1.5">
            <kbd className="kbd">↑</kbd>
            <kbd className="kbd">↓</kbd> navigate
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="kbd">↵</kbd> open
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            <kbd className="kbd">⌘</kbd>
            <kbd className="kbd">K</kbd>
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}

function SearchIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="shrink-0 text-ink-muted">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.6-3.6" />
    </svg>
  );
}
