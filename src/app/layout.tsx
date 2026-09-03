import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/components/theme/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";

/**
 * Inter, self-hosted by next/font: no render-blocking request to Google,
 * no layout shift from a late swap, and no third-party font request from
 * the user's browser (which is a privacy consideration as much as a
 * performance one).
 */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
});

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Appo — Build apps with AI. Ship ideas faster.",
    // Every page sets its own title; this frames them consistently.
    template: "%s — Appo",
  },
  description:
    "Appo turns a plain-language description into a complete, runnable application — then helps you refine, version and deploy it. Start from 60+ templates or describe your own idea.",
  applicationName: "Appo",
  keywords: ["AI app builder", "generate app", "React Native", "Expo", "no-code", "AI development"],
  authors: [{ name: "Appo" }],
  openGraph: {
    type: "website",
    siteName: "Appo",
    title: "Appo — Build apps with AI. Ship ideas faster.",
    description: "Describe an app. Appo plans it, builds it, and helps you ship it.",
    url: siteUrl(),
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Appo — build apps with AI" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Appo — Build apps with AI. Ship ideas faster.",
    description: "Describe an app. Appo plans it, builds it, and helps you ship it.",
    images: ["/og-image.png"],
  },
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Zoom is not capped: pinch-zoom is an accessibility requirement, and
  // maximum-scale=1 is a common and avoidable way to break it.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // `no-js` is removed by the theme script; CSS uses it so scroll-reveal
    // content is visible when JavaScript never runs.
    <html lang="en" className={`${inter.variable} no-js`} suppressHydrationWarning>
      <head>
        {/* Inline and synchronous, before any paint — otherwise a
            dark-theme user sees one white frame on every navigation. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-canvas text-ink antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-tooltip focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-brand-contrast"
        >
          Skip to content
        </a>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
