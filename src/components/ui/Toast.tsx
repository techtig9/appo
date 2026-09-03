"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "./cn";

/**
 * Toasts.
 *
 * Every micro-interaction the brief lists — save, copy, favourite, deploy,
 * generate, delete, share, invite — needs an acknowledgement, and the app
 * previously had none: actions either silently succeeded or replaced a
 * button's label with a string. This is the one place that feedback lives.
 *
 * The region is a polite live region so screen readers announce it, and
 * error toasts are assertive because they interrupt a task.
 */

export type ToastTone = "success" | "error" | "info" | "warning";

export interface ToastOptions {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** Milliseconds before auto-dismiss. Errors default to staying longer. */
  duration?: number;
  action?: { label: string; onClick: () => void };
}

interface ToastRecord extends ToastOptions {
  id: number;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {}, dismiss: () => {} });

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

const DEFAULT_DURATION: Record<ToastToneKey, number> = {
  success: 4000,
  info: 4000,
  warning: 6000,
  // Errors carry information the user has to read and often act on.
  error: 8000,
};
type ToastToneKey = ToastTone;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((entry) => entry.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (options: ToastOptions) => {
      const id = nextId.current++;
      const tone = options.tone ?? "info";
      const record: ToastRecord = { ...options, id, tone };

      // Cap the stack: a loop that fires toasts should not bury the page.
      setToasts((current) => [...current.slice(-3), record]);

      const duration = options.duration ?? DEFAULT_DURATION[tone];
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), duration)
      );
    },
    [dismiss]
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => clearTimeout(timer));
      pending.clear();
    };
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        // Fixed to the viewport, above dialogs, and pointer-events-none on
        // the container so it never blocks clicks on the page beneath.
        className="pointer-events-none fixed inset-x-0 bottom-0 z-toast flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((entry) => (
          <ToastItem key={entry.id} toast={entry} onDismiss={() => dismiss(entry.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const TONE_STYLES: Record<ToastTone, { border: string; icon: ReactNode }> = {
  success: { border: "border-success/40", icon: <Check className="text-success" /> },
  error: { border: "border-danger/40", icon: <Cross className="text-danger" /> },
  warning: { border: "border-warning/40", icon: <Bang className="text-warning" /> },
  info: { border: "border-info/40", icon: <Info className="text-info" /> },
};

function ToastItem({ toast, onDismiss }: { toast: ToastRecord; onDismiss: () => void }) {
  const tone = TONE_STYLES[toast.tone];

  return (
    <div
      role={toast.tone === "error" ? "alert" : "status"}
      aria-live={toast.tone === "error" ? "assertive" : "polite"}
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border bg-surface-raised p-3.5 shadow-overlay",
        "animate-slide-in-right",
        tone.border
      )}
    >
      <span className="mt-0.5 shrink-0">{tone.icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-small font-medium text-ink">{toast.title}</p>
        {toast.description ? (
          <p className="mt-0.5 text-caption leading-relaxed text-ink-secondary">{toast.description}</p>
        ) : null}
        {toast.action ? (
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick();
              onDismiss();
            }}
            className="mt-2 text-caption font-medium text-brand underline-offset-2 hover:underline"
          >
            {toast.action.label}
          </button>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="-m-1 shrink-0 rounded p-1 text-ink-muted transition-colors duration-micro hover:text-ink"
      >
        <Cross />
      </button>
    </div>
  );
}

function iconProps(className?: string) {
  return {
    width: 15,
    height: 15,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className,
  };
}

function Check({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <path d="m4 12 5 5L20 6" />
    </svg>
  );
}
function Cross({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
function Bang({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <path d="M12 8v5M12 17h.01" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}
function Info({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7.5h.01" />
    </svg>
  );
}
