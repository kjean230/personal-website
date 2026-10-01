import type { MetadataRoute } from "next";
// Relative, not the `@/` alias, like every app/ module that may be tested.
import { loadSitemap } from "../lib/routes/load";
import { absoluteUrl } from "../lib/site";

// /sitemap.xml — the route table's canonical URLs, absolute on the settled
// origin. Which URLs belong here, and which facts each carries, is decided in
// lib/routes/load.ts (`loadSitemap`): this file only makes them absolute.
//
// Rendering mode: it reads content through the query layer's tagged fetch
// cache and takes no request input, so it prerenders at build and revalidates
// on the same 3600 s window and `content` tags as /resume (○ with a 1h
// revalidate column). No file is read at runtime.

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const urls = await loadSitemap();
  return urls.map(({ path, lastModified }) => ({
    url: absoluteUrl(path),
    ...(lastModified === undefined ? {} : { lastModified }),
  }));
}
