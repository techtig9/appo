import type { MetadataRoute } from "next";

function baseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://appo.app")
  );
}

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // `/auth/` is excluded alongside the obvious private areas: those
        // URLs carry single-use authorization codes, and a crawler
        // following one burns it before the user can.
        disallow: ["/dashboard", "/admin", "/api", "/auth/", "/preview/"],
      },
    ],
    sitemap: `${baseUrl()}/sitemap.xml`,
  };
}
