/**
 * lib/site.ts — the handful of site-wide constants (S6).
 *
 * `SITE_NAME` was repeated in the layout and in three page files before S6,
 * which meant the `<h1>` of `/resume` and the suffix of every page title could
 * drift apart. It is one string now. Anything else identifying the site —
 * the domain, `metadataBase`, canonical URLs — waits on the domain
 * (BUILD_PLAN §8) and belongs to `feat/recruiter-seo`, not here.
 */

/** The owner's name: the site title, every page-title suffix, and the resume's `<h1>`. */
export const SITE_NAME = "Kerwyn Jean";
