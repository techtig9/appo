import type { MetadataRoute } from "next";
import { TEMPLATE_CATALOG } from "@/lib/templates/catalog";

/**
 * The base URL comes from configuration rather than a hardcoded constant.
 * A sitemap that names the wrong domain is worse than no sitemap: it
 * advertises URLs that do not resolve, which search engines treat as a
 * quality signal against the site.
 */
function baseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://appo.app")
  );
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = baseUrl();
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/help`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/changelog`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/signup`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  // Template detail pages sit behind auth today, so they are deliberately
  // NOT listed: submitting URLs that return a redirect to a sign-in page
  // is exactly the "soft 404" pattern that damages a domain's standing.
  // The catalogue is referenced here so this comment cannot rot silently
  // if those pages are ever made public.
  void TEMPLATE_CATALOG;

  return staticPages;
}
