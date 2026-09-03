import type { Config } from "tailwindcss";

/**
 * Tailwind is wired to the CSS custom properties in src/styles/tokens.css
 * rather than carrying its own copy of the palette. One source of truth
 * means a theme switch is a variable swap, not a rebuild, and it makes it
 * impossible for a utility class and a hand-written rule to disagree about
 * what "brand" means — which is how the product ended up with three
 * different purples.
 *
 * darkMode is "class" driven by data-theme so an explicit user choice wins
 * over the OS preference in both directions.
 */
const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: "var(--app-bg)",
          subtle: "var(--app-bg-subtle)",
          sunken: "var(--app-surface-sunken)",
        },
        surface: {
          DEFAULT: "var(--app-surface)",
          raised: "var(--app-surface-raised)",
        },
        line: {
          DEFAULT: "var(--app-border)",
          strong: "var(--app-border-strong)",
        },
        ink: {
          DEFAULT: "var(--app-text)",
          secondary: "var(--app-text-secondary)",
          muted: "var(--app-text-muted)",
          inverse: "var(--app-text-inverse)",
        },
        brand: {
          DEFAULT: "var(--app-brand)",
          hover: "var(--app-brand-hover)",
          subtle: "var(--app-brand-subtle)",
          border: "var(--app-brand-border)",
          contrast: "var(--app-brand-contrast)",
        },
        secondary: "var(--app-secondary)",
        ai: "var(--app-ai)",
        success: { DEFAULT: "var(--app-success)", subtle: "var(--app-success-subtle)" },
        warning: { DEFAULT: "var(--app-warning)", subtle: "var(--app-warning-subtle)" },
        danger: { DEFAULT: "var(--app-error)", subtle: "var(--app-error-subtle)" },
        info: { DEFAULT: "var(--app-info)", subtle: "var(--app-info-subtle)" },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      fontSize: {
        caption: ["var(--text-caption)", { lineHeight: "1.45" }],
        small: ["var(--text-small)", { lineHeight: "1.5" }],
        body: ["var(--text-body)", { lineHeight: "1.6" }],
        "body-lg": ["var(--text-body-lg)", { lineHeight: "1.6" }],
        card: ["var(--text-card)", { lineHeight: "1.4" }],
        section: ["var(--text-section)", { lineHeight: "1.3", letterSpacing: "-0.01em" }],
        page: ["var(--text-page)", { lineHeight: "1.2", letterSpacing: "-0.02em" }],
        hero: ["var(--text-hero)", { lineHeight: "1.05", letterSpacing: "-0.03em" }],
      },
      spacing: {
        gutter: "var(--space-6)",
        section: "var(--space-24)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        hero: "var(--radius-hero)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        overlay: "var(--shadow-overlay)",
        focus: "var(--shadow-focus)",
      },
      backgroundImage: {
        "brand-gradient": "var(--app-gradient-brand)",
      },
      transitionTimingFunction: {
        out: "var(--ease-out)",
        "in-out": "var(--ease-in-out)",
        spring: "var(--ease-spring)",
      },
      transitionDuration: {
        micro: "var(--duration-micro)",
        fast: "var(--duration-fast)",
        normal: "var(--duration-normal)",
        slow: "var(--duration-slow)",
      },
      zIndex: {
        sticky: "var(--z-sticky)",
        header: "var(--z-header)",
        sidebar: "var(--z-sidebar)",
        overlay: "var(--z-overlay)",
        dialog: "var(--z-dialog)",
        toast: "var(--z-toast)",
        tooltip: "var(--z-tooltip)",
      },
      maxWidth: {
        content: "var(--content-max)",
      },
      screens: {
        // Matches the widths the responsive pass is actually tested at.
        xs: "390px",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.97)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(12px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },
      animation: {
        "fade-up": "fade-up var(--duration-normal) var(--ease-out) both",
        "fade-in": "fade-in var(--duration-fast) var(--ease-out) both",
        "scale-in": "scale-in var(--duration-fast) var(--ease-out) both",
        "slide-in-right": "slide-in-right var(--duration-fast) var(--ease-out) both",
        shimmer: "shimmer 1.6s infinite",
        "pulse-dot": "pulse-dot 1.6s var(--ease-in-out) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
