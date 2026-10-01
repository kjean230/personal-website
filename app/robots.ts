import type { MetadataRoute } from "next";
// Relative, not the `@/` alias: this file has a test beside it.
import { SITEMAP_HREF } from "../lib/routes/table";
import { absoluteUrl } from "../lib/site";

// /robots.txt — everything public is crawlable, and the sitemap is named.
//
// There is deliberately no `Disallow`. The reserved routes (/privacy, /admin)
// have no page, so there is nothing to keep a crawler out of; robots.txt is
// not access control — Supabase Auth guards /admin when it exists (brief §7);
// and a Disallow line would advertise the admin path to anyone reading this
// file. Static: no request input, no content read.

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: absoluteUrl(SITEMAP_HREF),
  };
}
