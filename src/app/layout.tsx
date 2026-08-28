import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "appo — Describe it. Get a real app.",
  description:
    "appo generates a complete, runnable React Native/Expo app from a plain-language description — no coding required.",
  openGraph: {
    title: "appo — Describe it. Get a real app.",
    description: "appo generates a complete, runnable React Native/Expo app from a plain-language description.",
    type: "website",
    siteName: "appo",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "appo — Describe it. Get a real app." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "appo — Describe it. Get a real app.",
    description: "appo generates a complete, runnable React Native/Expo app from a plain-language description.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-brand-gradient">
        <div className="aurora-field" aria-hidden="true">
          <div className="aurora-blob b1" />
          <div className="aurora-blob b2" />
          <div className="aurora-blob b3" />
        </div>
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
