"use client";

import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "link";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand text-brand-contrast hover:bg-brand-hover",
  secondary: "bg-surface-raised text-ink border border-line hover:border-line-strong",
  ghost: "bg-transparent text-ink-secondary hover:bg-brand-subtle hover:text-ink",
  danger: "bg-danger text-white hover:opacity-90",
  link: "bg-transparent text-brand underline-offset-4 hover:underline px-0",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-small rounded-md",
  md: "h-10 px-4 text-body rounded-md",
  lg: "h-12 px-6 text-body-lg rounded-lg",
};

const BASE =
  "inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap select-none " +
  "transition-[background-color,border-color,color,transform,opacity] duration-micro ease-out " +
  "active:scale-[0.985] disabled:pointer-events-none disabled:opacity-55 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Renders a spinner and blocks interaction. */
  loading?: boolean;
  /** Replaces the label while loading, so the button does not resize. */
  loadingLabel?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  fullWidth?: boolean;
}

export interface ButtonProps extends CommonProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, loadingLabel, leading, trailing, fullWidth, className, children, disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      // A loading button is not "disabled" semantically — it is busy.
      // aria-busy tells assistive tech that without removing it from the
      // tab order mid-interaction.
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && "w-full", className)}
      {...rest}
    >
      {loading ? <Spinner /> : leading}
      {loading && loadingLabel ? loadingLabel : children}
      {!loading && trailing}
    </button>
  );
});

export interface ButtonLinkProps extends CommonProps {
  href: string;
  children?: ReactNode;
  className?: string;
  external?: boolean;
  "aria-label"?: string;
  onClick?: () => void;
}

/**
 * A link that looks like a button. Kept separate rather than adding an
 * `as` prop: navigation must be a real anchor so it can be middle-clicked,
 * opened in a new tab and read as a link by a screen reader.
 */
export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  leading,
  trailing,
  fullWidth,
  className,
  children,
  external,
  ...rest
}: ButtonLinkProps) {
  const classes = cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && "w-full", className);

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes} {...rest}>
        {leading}
        {children}
        {trailing}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} {...rest}>
      {leading}
      {children}
      {trailing}
    </Link>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("animate-spin", className)}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
