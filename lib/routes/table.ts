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
 * /resume                —                                      plain HTML, one action from anywhere
 *                                                               (the site header links it)
 * /privacy               —                                      reserved: brief §2.3, Phase 3 hardening
 * /admin                 —                                      reserved: lane/admin (Supabase Auth)
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

import { FACETS, KINDS, isFacet, type Facet, type Kind } from "../content/schema";

// Static routes -------------------------------------------------------------

export const HOME_HREF = "/";
/** Brief §2.2: plain HTML, reachable in one action from anywhere (site header). Rendered by S6. */
export const RESUME_HREF = "/resume";
/** Brief §2.3. Reserved; the page lands in Phase 3 hardening (plan §6). */
export const PRIVACY_HREF = "/privacy";
/** Brief §7. Reserved for lane/admin. Never linked from the public site. */
export const ADMIN_HREF = "/admin";

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
 * Resolves the first URL segment. Static routes (`resume`, `privacy`,
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
