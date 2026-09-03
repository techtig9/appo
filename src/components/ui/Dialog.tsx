"use client";

import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "./cn";
import { Button } from "./Button";

/**
 * Modal dialog.
 *
 * Hand-rolled rather than pulling in a headless UI library — the app has
 * no such dependency today and this needs four behaviours, all of which
 * are specified by the ARIA dialog pattern:
 *
 *   1. Focus moves into the dialog on open and returns to the trigger on
 *      close (otherwise keyboard users are dumped at the top of the page).
 *   2. Tab is trapped inside while it is open.
 *   3. Escape closes it.
 *   4. The page behind does not scroll.
 *
 * Rendered through a portal so a dialog opened from inside a card with
 * `overflow: hidden` is not clipped by it.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  /** Wider variant for content-heavy dialogs like a template preview. */
  size?: "sm" | "md" | "lg";
  /** Set false for a destructive confirm, where a stray click must not dismiss. */
  dismissOnBackdrop?: boolean;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  dismissOnBackdrop = true,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null
      );
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      // Wrap in both directions so focus never escapes to the page behind.
      if (event.shiftKey && (active === first || !panelRef.current.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    document.documentElement.classList.add("overflow-locked");
    document.addEventListener("keydown", handleKeyDown, true);

    // Focus the first control, or the panel itself when there is none.
    const timer = window.setTimeout(() => {
      const target = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE) ?? panelRef.current;
      target?.focus();
    }, 0);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.documentElement.classList.remove("overflow-locked");
      // Return focus to whatever opened the dialog.
      previouslyFocused.current?.focus?.();
    };
  }, [open, handleKeyDown]);

  if (!open || typeof document === "undefined") return null;

  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-3xl" }[size];

  return createPortal(
    <div className="fixed inset-0 z-dialog flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div
        className="absolute inset-0 animate-fade-in bg-[var(--app-scrim)] backdrop-blur-sm"
        onClick={dismissOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          "relative w-full animate-scale-in rounded-t-xl border border-line bg-surface shadow-overlay outline-none sm:rounded-xl",
          widths
        )}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-5">
          <div className="min-w-0">
            <h2 id={titleId} className="text-card font-semibold tracking-tight text-ink">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1.5 text-small leading-relaxed text-ink-secondary">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="-m-1 shrink-0 rounded-md p-1.5 text-ink-muted transition-colors duration-micro hover:bg-canvas-subtle hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {children ? <div className="max-h-[65vh] overflow-y-auto px-5 py-5">{children}</div> : <div className="h-2" />}

        {footer ? <div className="flex flex-wrap justify-end gap-3 border-t border-line px-5 py-4">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}

/**
 * Confirmation for an irreversible action. Backdrop dismissal is off by
 * design — deleting a project should never happen because someone clicked
 * slightly outside the box.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      dismissOnBackdrop={false}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={destructive ? "danger" : "primary"} onClick={onConfirm} loading={busy} loadingLabel="Working…">
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
