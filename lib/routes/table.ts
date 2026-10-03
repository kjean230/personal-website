/**
 * lib/routes/table.ts — the shared route table (S5, BUILD_PLAN §4).
 *
 * The URL contract both renderers bind to (brief §8: "lanes 5 and 6 must
 * agree on the URL contract before either starts; write it down as a shared
 * route table"). Recruiter mode and Explorer mode serve the *same* URLs —
 * mode is not a URL dimension — and there is exactly one App Router page
 * file per URL, which both renderers plug into. Every tile resolves to a
 * real, shareable URL (brief §2.2); nothing navigates by state alone.
 *
 * URL                    Reads (lib/content/queries.ts)         Notes
 * /                      —                                      home: the six sections + Resume
 * /<section>             listSection(kind) per kind of the      six segments below; unknown → 404;
 *                        section · getFacetCounts(kind)         ?facet=<facet> narrows (brief §4.2 chips);
 *                                                               invalid facet → 404
 * /certifications        listTrophies()                         the trophy case (brief §5) *is* the
 *                                                               Certifications section
 * /<section>/<slug>      getEntryBySlug(slug)                   the entry's canonical URL; null → 404;
 *                                                               a slug reached under the wrong section
 *                                                               308s to its canonical URL
 * /all                   listSection(kind) per kind of every    the "All Software" index (brief §5):
 *                        section · listTagGroups()              every entry once, in tile order;
 *                                                               one of ?q=<words> | ?facet=<facet> |
 *                                                               ?tag=<slug> narrows it (Groups, brief
 *                                                               §5); two at once, a repeated or invalid
 *                                                               value, or a slug no tag has → 404
 * /resume                listSection(experience | project |     plain HTML, one action from anywhere
 *                        education) · listTrophies() ·          (the site header links it); reads no
 *                        listLinks()                            dynamic input, so it prerenders
 * /privacy               —                                      reserved: brief §2.3, Phase 3 hardening
 * /admin                 —                                      reserved: lane/admin (Supabase Auth)
 * /sitemap.xml           listSection(kind) per kind of every    app/sitemap.ts: /, /resume, /all, every
 *                        section                                section and every entry's canonical URL —
 *                                                               never a ?facet=, ?q= or ?tag= view, never
 *                                                               a reserved route
 * /robots.txt            —                                      app/robots.ts: allow all, name the sitemap
 * /opengraph-image       —                                      app/opengraph-image.tsx: the one site-wide
 *                                                               share image, rendered at build
 *
 * Sections (brief §4.3 order): /experience · /projects · /certifications ·
 * /education · /hobbies (kinds hobby + interest — one tile) · /now (kind
 * post). The section of an entry is derived from its `kind`, so an entry has
 * one canonical URL and multi-placement (brief §4.1) is expressed by links
 * between canonical URLs, never by copies. Adding a section is one entry in
 * `SECTIONS` — no new route files, mirroring "new section types cost zero
 * migrations". The kind and facet value sets are owned by
 * lib/content/schema.ts and are never redeclared here.
 */

import { z } from "zod";
import { FACETS, KINDS, isFacet, slugSchema, type Facet, type Kind } from "../content/schema";

// Static routes -------------------------------------------------------------

export const HOME_HREF = "/";
/** Brief §2.2: plain HTML, reachable in one action from anywhere (site header). Rendered by S6. */
export const RESUME_HREF = "/resume";
/**
 * Brief §5's "All Software" grid: the searchable index of every entry. Not a
 * section — it lists every kind — so it is a static route with its own page
 * file. The URL and the name are the owner's (handoff/feat-shell-tile-grid.md).
 */
export const ALL_HREF = "/all";
/** The index's heading and the label of the link to it. */
export const ALL_LABEL = "All Software";
/** Brief §2.3. Reserved; the page lands in Phase 3 hardening (plan §6). */
export const PRIVACY_HREF = "/privacy";
/** Brief §7. Reserved for lane/admin. Never linked from the public site. */
export const ADMIN_HREF = "/admin";
/** app/sitemap.ts; robots.txt names it. */
export const SITEMAP_HREF = "/sitemap.xml";

// Sections ------------------------------------------------------------------

export interface Section {
  /** The URL segment: `/<segment>` and `/<segment>/<slug>`. Slug-shaped. */
  readonly segment: string;
  /** Heading and tile label (brief §4.3). */
  readonly label: string;
  /** The `entries.kind` values this section lists; most sections list one. */
  readonly kinds: readonly Kind[];
  /** `true` for the section rendered as the trophy case (brief §5); it reads `listTrophies()`. */
  readonly trophyCase: boolean;
}

/** The top-level sections in brief §4.3 order. */
export const SECTIONS: readonly Section[] = [
  { segment: "experience", label: "Experience", kinds: ["experience"], trophyCase: false },
  { segment: "projects", label: "Projects", kinds: ["project"], trophyCase: false },
  { segment: "certifications", label: "Certifications", kinds: ["certification"], trophyCase: true },
  { segment: "education", label: "Education", kinds: ["education"], trophyCase: false },
  { segment: "hobbies", label: "Hobbies & Interests", kinds: ["hobby", "interest"], trophyCase: false },
  { segment: "now", label: "Now", kinds: ["post"], trophyCase: false },
];

const bySegment = new Map(SECTIONS.map((section) => [section.segment, section]));
const byKind = new Map<Kind, Section>();
for (const section of SECTIONS) {
  for (const kind of section.kinds) {
    if (byKind.has(kind)) throw new Error(`route table: kind "${kind}" is listed by two sections`);
    byKind.set(kind, section);
  }
}
for (const kind of KINDS) {
  if (!byKind.has(kind)) throw new Error(`route table: kind "${kind}" has no section`);
}

/**
 * The section an entry of `kind` belongs to — total over `KINDS`, checked at
 * module load, so every entry has exactly one canonical URL.
 * @returns the section that lists `kind`.
 */
export function sectionForKind(kind: Kind): Section {
  const section = byKind.get(kind);
  if (!section) throw new Error(`route table: kind "${kind}" has no section`);
  return section;
}

/**
 * Resolves the first URL segment. Static routes (`all`, `resume`, `privacy`,
 * `admin`) are not sections and resolve to `null`, as does anything unknown.
 * @returns the section, or `null` when the segment is not one (→ 404).
 */
export function sectionFromSegment(segment: string): Section | null {
  return bySegment.get(segment) ?? null;
}

// Hrefs ---------------------------------------------------------------------

/**
 * @returns `/<segment>`, or `/<segment>?facet=<facet>` when narrowed to one facet.
 */
export function sectionHref(section: Section, facet?: Facet): string {
  return facet ? `/${section.segment}?facet=${facet}` : `/${section.segment}`;
}

/**
 * The canonical URL of an entry: `/<section of its kind>/<slug>`.
 * @returns e.g. `/experience/guardian`.
 */
export function entryHref(entry: { readonly kind: Kind; readonly slug: string }): string {
  return `/${sectionForKind(entry.kind).segment}/${entry.slug}`;
}

// Facet query parameter -----------------------------------------------------

export type FacetParam =
  | { readonly ok: true; readonly facet: Facet | undefined }
  | { readonly ok: false };

/**
 * Reads `?facet=` as Next hands it over (`searchParams` values are a string,
 * a list when repeated, or absent). Absent or empty means "All".
 * @returns the facet, `undefined` for All, or `ok: false` for a value outside `FACETS` or a repeated parameter (→ 404).
 */
export function parseFacetParam(value: string | readonly string[] | undefined): FacetParam {
  if (value === undefined || value === "") return { ok: true, facet: undefined };
  if (typeof value !== "string") return { ok: false };
  return isFacet(value) ? { ok: true, facet: value } : { ok: false };
}

/** The facets, in chip order (brief §4.2). Re-exported so pages import the route table only. */
export const FACET_ORDER: readonly Facet[] = FACETS;

// Search query parameter ----------------------------------------------------

/** The name of the index's search parameter: `/all?q=<words>`. The form field and the page share it. */
export const SEARCH_PARAM = "q";
/** The longest search the index accepts. The form's `maxlength` and the parser share it. */
export const SEARCH_MAX_LENGTH = 100;

const searchValue = z.string().max(SEARCH_MAX_LENGTH);

export type SearchParam =
  | { readonly ok: true; readonly query: string }
  | { readonly ok: false };

/**
 * Reads `?q=` as Next hands it over. Absent or blank means no search — the
 * whole index. Any text is a valid search, so the only invalid values are the
 * ones a form cannot send: a repeated parameter, and one past the length cap.
 * @returns the trimmed query (`""` for none), or `ok: false` (→ 404).
 */
export function parseSearchParam(value: string | readonly string[] | undefined): SearchParam {
  if (value === undefined) return { ok: true, query: "" };
  const parsed = searchValue.safeParse(value);
  return parsed.success ? { ok: true, query: parsed.data.trim() } : { ok: false };
}

// The index's groups (feat/shell-facets) ------------------------------------

/** The name of the index's tag parameter: `/all?tag=<slug>`. The chip links and the page share it. */
export const TAG_PARAM = "tag";

export type TagParam =
  | { readonly ok: true; readonly slug: string | undefined }
  | { readonly ok: false };

/**
 * Reads `?tag=` as Next hands it over. Absent or empty means no tag. The value
 * must be slug-shaped — the shape `tags_slug_format` holds every tag to — so
 * the parser is closed without knowing which tags exist. Whether any tag has
 * that slug is the loader's to answer: `loadAll` reports a slug no tag has as
 * not-found, and the page 404s.
 * @returns the slug, `undefined` for none, or `ok: false` for a repeated parameter or a value no slug can be (→ 404).
 */
export function parseTagParam(value: string | readonly string[] | undefined): TagParam {
  if (value === undefined || value === "") return { ok: true, slug: undefined };
  const parsed = slugSchema.safeParse(value);
  return parsed.success ? { ok: true, slug: parsed.data } : { ok: false };
}

/**
 * What narrows the index. One thing at a time (the owner's decision,
 * handoff/feat-shell-facets.md): a search, a facet or a tag — never two.
 */
export type AllFilter =
  | { readonly kind: "none" }
  | { readonly kind: "search"; readonly query: string }
  | { readonly kind: "facet"; readonly facet: Facet }
  | { readonly kind: "tag"; readonly slug: string };

export type AllParams =
  | { readonly ok: true; readonly filter: AllFilter }
  | { readonly ok: false };

/**
 * Reads `/all`'s three parameters together. Each goes through its own closed
 * parser, a blank one counts as absent as it does everywhere else, and at most
 * one may be present.
 * @returns the one filter, `none` when there is none, or `ok: false` when a value is invalid or two are present (→ 404).
 */
export function parseAllParams(params: {
  readonly q?: string | readonly string[];
  readonly facet?: string | readonly string[];
  readonly tag?: string | readonly string[];
}): AllParams {
  const search = parseSearchParam(params.q);
  const facet = parseFacetParam(params.facet);
  const tag = parseTagParam(params.tag);
  if (!search.ok || !facet.ok || !tag.ok) return { ok: false };
  const present: AllFilter[] = [];
  if (search.query !== "") present.push({ kind: "search", query: search.query });
  if (facet.facet !== undefined) present.push({ kind: "facet", facet: facet.facet });
  if (tag.slug !== undefined) present.push({ kind: "tag", slug: tag.slug });
  if (present.length > 1) return { ok: false };
  return { ok: true, filter: present[0] ?? { kind: "none" } };
}

/**
 * The index, optionally narrowed to one group. A facet value and a tag slug
 * are both URL-safe by construction, so nothing here needs encoding.
 * @returns `/all`, `/all?facet=<facet>` or `/all?tag=<slug>`.
 */
export function allHref(group?: { readonly facet: Facet } | { readonly tag: string }): string {
  if (!group) return ALL_HREF;
  return "facet" in group ? `${ALL_HREF}?facet=${group.facet}` : `${ALL_HREF}?${TAG_PARAM}=${group.tag}`;
}
