/**
 * lib/site.ts — the handful of site-wide constants (S6).
 *
 * `SITE_NAME` was repeated in the layout and in three page files before S6,
 * which meant the `<h1>` of `/resume` and the suffix of every page title could
 * drift apart. It is one string now. The origin landed with
 * `feat/recruiter-seo`, once the domain was settled (BUILD_PLAN §8): it is
 * `metadataBase` in the root layout, and the base of every absolute URL the
 * site writes itself — the sitemap, robots.txt and the JSON-LD.
 */

/** The owner's name: the site title, every page-title suffix, and the resume's `<h1>`. */
export const SITE_NAME = "Kerwyn Jean";

/** The canonical origin (BUILD_PLAN §8): https, the apex, no trailing slash. */
export const SITE_URL = "https://kerwynjean.dev";

/**
 * The absolute URL of a site-relative path, e.g. an href from the route table.
 *
 * Only a path starting with a single `/` is accepted. A bare `//host` is a
 * protocol-relative URL that would resolve off-site, and anything already
 * absolute was not produced by the route table — both are refused rather than
 * passed through, because every caller writes the result into a document a
 * crawler trusts.
 * @returns e.g. `https://kerwynjean.dev/experience`.
 */
export function absoluteUrl(path: string): string {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error(`absoluteUrl: "${path}" is not a site-relative path`);
  }
  return new URL(path, SITE_URL).href;
}
