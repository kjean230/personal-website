/**
 * lib/render/json-ld.ts — structured data (feat/recruiter-seo).
 *
 * A `<script type="application/ld+json">` reaches the page as raw text
 * (`dangerouslySetInnerHTML`), which makes this the second place in the tree
 * allowed to produce unescaped output — lib/render/markdown.ts is the first,
 * and CLAUDE.md names both. The JSON is never hand-written: every document is
 * an object built here and serialised by `serializeJsonLd`, which replaces
 * every `<` with its JSON escape `\u003c`. That one substitution is the whole
 * boundary. Inside a script element the HTML parser only looks for `</script`
 * (and `<!--`), both of which start with `<`, so a title reading
 * `</script><script>…` cannot leave the element — and `\u003c` is still `<`
 * to every JSON parser, so the data is unchanged.
 *
 * The builders state only what the repo records: the site's name and origin
 * (lib/site.ts), route-table paths and labels, entry titles, and — for the one
 * Person — the `sameAs` URLs the caller passes in, which come from the settled
 * contact values in app/resume/contact.tsx and are never retyped here. No
 * job title, description, image or employer is asserted: the schema would
 * accept them, and nothing in the data supplies them.
 *
 * Server-only, like markdown.ts: a client component must never import it.
 */

import { HOME_HREF } from "../routes/table";
import { SITE_NAME, absoluteUrl } from "../site";

/** Any value JSON can carry. */
export type JsonValue = string | number | boolean | null | readonly JsonValue[] | { readonly [key: string]: JsonValue };

/** A top-level schema.org document. */
export interface JsonLd {
  readonly "@context": "https://schema.org";
  readonly "@type": string;
  readonly [key: string]: JsonValue;
}

const SCHEMA_ORG = "https://schema.org";

/**
 * The script body for one JSON-LD document.
 * @returns `JSON.stringify(value)` with every `<` replaced by `\u003c`.
 */
export function serializeJsonLd(value: JsonLd): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/**
 * The home page's `WebSite`: the name search engines may show for the site.
 * @returns `{ name: SITE_NAME, url: <origin>/ }`.
 */
export function websiteJsonLd(): JsonLd {
  return { "@context": SCHEMA_ORG, "@type": "WebSite", name: SITE_NAME, url: absoluteUrl(HOME_HREF) };
}

/** One step of a breadcrumb trail: its visible name and its site-relative canonical path. */
export interface Crumb {
  readonly name: string;
  readonly path: string;
}

/**
 * A `BreadcrumbList` for the trail the caller passes, first to last.
 * @returns items numbered from 1, each `item` an absolute URL.
 */
export function breadcrumbJsonLd(crumbs: readonly Crumb[]): JsonLd {
  return {
    "@context": SCHEMA_ORG,
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

/**
 * The resume's `ProfilePage`, whose main entity is the owner as a `Person`.
 * @param options.path the profile page's own path (`/resume`).
 * @param options.sameAs the owner's profiles elsewhere, exactly as settled; nothing is added.
 * @returns `{ url, mainEntity: { Person: name, url: <origin>/, sameAs } }`.
 */
export function profilePageJsonLd(options: { readonly path: string; readonly sameAs: readonly string[] }): JsonLd {
  return {
    "@context": SCHEMA_ORG,
    "@type": "ProfilePage",
    url: absoluteUrl(options.path),
    mainEntity: {
      "@type": "Person",
      name: SITE_NAME,
      url: absoluteUrl(HOME_HREF),
      sameAs: [...options.sameAs],
    },
  };
}
