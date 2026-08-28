/**
 * lib/routes/load.ts — what each URL in the route table reads (S5).
 *
 * One loader per route shape, bound to the S4 query contract
 * (lib/content/queries.ts) and nothing else: `loadSection` for `/<section>`
 * (`listSection` per kind + `getFacetCounts` for the chips, `listTrophies`
 * for the trophy case), `loadEntry` for `/<section>/<slug>`
 * (`getEntryBySlug`), `loadResume` for `/resume` (three `listSection` calls,
 * `listTrophies` and `listLinks`). Loaders are framework-free: they return
 * discriminated results and the page files map them to `notFound()` /
 * `permanentRedirect()`, so the loaders are unit-testable with fake queries
 * and the same functions serve both renderers.
 *
 * Errors are never swallowed: a `ContentQueryError` or
 * `ContentValidationError` from the query layer propagates and fails the
 * render loudly, as S4 intends.
 */

import {
  compareRecency,
  getEntryBySlug,
  getFacetCounts,
  listLinks,
  listSection,
  listTrophies,
  type EntryDetail,
  type Trophy,
} from "../content/queries";
import type { EntrySummary, Facet, Link } from "../content/schema";
import { FACET_ORDER, entryHref, sectionForKind, sectionHref, type Section } from "./table";

/** The queries a loader may call. Typed against the S4 module so a contract change fails `tsc` here. */
export type RouteQueries = Pick<
  typeof import("../content/queries"),
  "listSection" | "getFacetCounts" | "getEntryBySlug" | "listTrophies" | "listLinks"
>;

const defaultQueries: RouteQueries = {
  listSection,
  getFacetCounts,
  getEntryBySlug,
  listTrophies,
  listLinks,
};

// Section -------------------------------------------------------------------

/** One facet chip (brief §4.2): `All (n)` is `facet: null`. */
export interface FacetChip {
  readonly facet: Facet | null;
  readonly label: string;
  readonly count: number;
  readonly href: string;
  readonly active: boolean;
}

export interface SectionPage {
  readonly section: Section;
  /** The active facet; `undefined` is All. */
  readonly facet: Facet | undefined;
  /** `All` plus every facet with at least one row, in `FACETS` order. Counts come from the query. */
  readonly chips: readonly FacetChip[];
  /** The rows to list, recency-ordered; `Trophy` rows for the trophy case. */
  readonly entries: readonly EntrySummary[];
}

function chipLabel(facet: Facet): string {
  return facet.charAt(0).toUpperCase() + facet.slice(1);
}

/**
 * Everything `/<section>` renders: the chips with live counts and the rows
 * of the section's kind(s), optionally narrowed to one facet. A section
 * with several kinds merges their lists in tile order and sums their counts.
 * @returns the section page data; `entries` is empty when nothing matches.
 */
export async function loadSection(
  section: Section,
  facet: Facet | undefined,
  queries: RouteQueries = defaultQueries,
): Promise<SectionPage> {
  const [counts, lists] = await Promise.all([
    Promise.all(section.kinds.map((kind) => queries.getFacetCounts(kind))),
    section.trophyCase
      ? queries.listTrophies().then((rows) => [narrowTrophies(rows, facet)])
      : Promise.all(section.kinds.map((kind) => queries.listSection(kind, { facet }))),
  ]);

  const all = counts.reduce((sum, count) => sum + count.all, 0);
  const chips: FacetChip[] = [
    { facet: null, label: "All", count: all, href: sectionHref(section), active: facet === undefined },
  ];
  for (const candidate of FACET_ORDER) {
    const count = counts.reduce((sum, c) => sum + c.byFacet[candidate], 0);
    if (count === 0) continue;
    chips.push({
      facet: candidate,
      label: chipLabel(candidate),
      count,
      href: sectionHref(section, candidate),
      active: facet === candidate,
    });
  }

  const entries = lists.length === 1 ? lists[0] : lists.flat().sort(compareRecency);
  return { section, facet, chips, entries };
}

function narrowTrophies(rows: readonly Trophy[], facet: Facet | undefined): Trophy[] {
  return facet === undefined ? [...rows] : rows.filter((row) => row.facet === facet);
}

/**
 * The trophy case (brief §5): `listTrophies()`, optionally one facet.
 * @returns certification-kind rows, recency-ordered.
 */
export async function loadTrophies(
  facet?: Facet,
  queries: RouteQueries = defaultQueries,
): Promise<Trophy[]> {
  return narrowTrophies(await queries.listTrophies(), facet);
}

// Resume --------------------------------------------------------------------

/** One resume row: a tile row and the entry's external links. */
export interface ResumeEntry {
  readonly entry: EntrySummary;
  readonly links: readonly Link[];
}

export interface ResumeSection {
  /** Stable, slug-shaped; the page uses it as the `aria-labelledby` target. */
  readonly id: string;
  readonly label: string;
  /** In tile order (`compareRecency`), the same order the section pages use. Empty is normal. */
  readonly entries: readonly ResumeEntry[];
}

export interface ResumePage {
  readonly sections: readonly ResumeSection[];
}

/** Brief §2.2's plain resume: these four, in this order. Labels are the resume's, not the route table's. */
const RESUME_SECTIONS = [
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "education", label: "Education" },
  { id: "certifications", label: "Certifications & awards" },
] as const;

/**
 * Everything `/resume` renders. Unlike the other loaders this one cannot
 * fail to resolve — `/resume` is a fixed URL with no segment and no query —
 * so it returns the page directly rather than a discriminated result.
 *
 * Links come from one `listLinks()` grouped by `entry_id` rather than a
 * detail request per row: the resume lists every entry, and 19 round trips to
 * render one page would defeat the hourly fetch cache.
 * @returns the four sections in resume order, each in tile order; a section with no rows is still present.
 */
export async function loadResume(queries: RouteQueries = defaultQueries): Promise<ResumePage> {
  const [experience, projects, education, certifications, links] = await Promise.all([
    queries.listSection("experience", {}),
    queries.listSection("project", {}),
    queries.listSection("education", {}),
    queries.listTrophies(),
    queries.listLinks(),
  ]);

  const byEntry = new Map<string, Link[]>();
  for (const link of links) {
    const existing = byEntry.get(link.entry_id);
    if (existing) existing.push(link);
    else byEntry.set(link.entry_id, [link]);
  }

  const rows: readonly (readonly EntrySummary[])[] = [experience, projects, education, certifications];
  return {
    sections: RESUME_SECTIONS.map((section, index) => ({
      id: section.id,
      label: section.label,
      entries: rows[index].map((entry) => ({ entry, links: byEntry.get(entry.id) ?? [] })),
    })),
  };
}

// Entry ---------------------------------------------------------------------

/** An edge from the detail page to a related entry, ready to link. */
export interface RelatedLink {
  readonly type: EntryDetail["relations"]["outgoing"][number]["type"];
  /** `outgoing`: `<this> <type> <entry>`; `incoming`: `<entry> <type> <this>`. */
  readonly direction: "outgoing" | "incoming";
  readonly entry: EntrySummary;
  readonly href: string;
}

export type EntryPage =
  | {
      readonly kind: "found";
      readonly section: Section;
      readonly href: string;
      readonly detail: EntryDetail;
      readonly related: readonly RelatedLink[];
    }
  /** The slug exists under another section: send the visitor to its canonical URL (308). */
  | { readonly kind: "redirect"; readonly href: string }
  /** No entry has this slug (404). */
  | { readonly kind: "not-found" };

/**
 * Resolves `/<section>/<slug>`. Slugs are unique across kinds, so the slug
 * alone identifies the entry; the section in the URL must be the one its
 * kind belongs to, otherwise the canonical URL is returned as a redirect.
 * @returns the entry with its relations as canonical links, a redirect, or not-found.
 */
export async function loadEntry(
  section: Section,
  slug: string,
  queries: RouteQueries = defaultQueries,
): Promise<EntryPage> {
  const detail = await queries.getEntryBySlug(slug);
  if (!detail) return { kind: "not-found" };
  const href = entryHref(detail.entry);
  if (sectionForKind(detail.entry.kind).segment !== section.segment) return { kind: "redirect", href };
  const related: RelatedLink[] = [
    ...detail.relations.outgoing.map((edge) => ({
      type: edge.type,
      direction: "outgoing" as const,
      entry: edge.entry,
      href: entryHref(edge.entry),
    })),
    ...detail.relations.incoming.map((edge) => ({
      type: edge.type,
      direction: "incoming" as const,
      entry: edge.entry,
      href: entryHref(edge.entry),
    })),
  ];
  return { kind: "found", section, href, detail, related };
}
