/**
 * lib/routes/load.ts — what each URL in the route table reads (S5).
 *
 * One loader per route shape, bound to the S4 query contract
 * (lib/content/queries.ts) and nothing else: `loadSection` for `/<section>`
 * (`listSection` per kind + `getFacetCounts` for the chips, `listTrophies`
 * for the trophy case), `loadEntry` for `/<section>/<slug>`
 * (`getEntryBySlug`), `loadResume` for `/resume` (three `listSection` calls,
 * `listTrophies` and `listLinks`), `loadSitemap` for `/sitemap.xml` (one
 * `listSection` per kind). Loaders are framework-free: they return
 * discriminated results and the page files map them to `notFound()` /
 * `permanentRedirect()`, so the loaders are unit-testable with fake queries
 * and the same functions serve both renderers. `loadAll` for `/all` reads the
 * same lists as the sitemap, plus every tag (`listTagGroups`), and narrows
 * them in code.
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
  listTagGroups,
  listTrophies,
  type EntryDetail,
  type Trophy,
} from "../content/queries";
import { TAG_CATEGORIES, type EntrySummary, type Facet, type Link, type Tag, type TagCategory } from "../content/schema";
import {
  ALL_HREF,
  FACET_ORDER,
  HOME_HREF,
  RESUME_HREF,
  SECTIONS,
  allHref,
  entryHref,
  sectionForKind,
  sectionHref,
  type AllFilter,
  type Section,
} from "./table";

/** The queries a loader may call. Typed against the S4 module so a contract change fails `tsc` here. */
export type RouteQueries = Pick<
  typeof import("../content/queries"),
  "listSection" | "getFacetCounts" | "getEntryBySlug" | "listTrophies" | "listLinks" | "listTagGroups"
>;

const defaultQueries: RouteQueries = {
  listSection,
  getFacetCounts,
  getEntryBySlug,
  listTrophies,
  listLinks,
  listTagGroups,
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

// All Software --------------------------------------------------------------

/** One tag chip in Groups: `Label (n)`. */
export interface TagChip {
  readonly slug: string;
  readonly label: string;
  /** How many entries carry the tag. Never zero: a tag no entry carries has no chip. */
  readonly count: number;
  readonly href: string;
  readonly active: boolean;
}

/** One category's row of tag chips — Skills, say. Never empty: a category with no chips has no row. */
export interface TagRow {
  readonly category: TagCategory;
  /** A to Z by label. */
  readonly chips: readonly TagChip[];
}

export interface AllPage {
  /** What narrows the index, if anything — one thing at a time. */
  readonly filter: AllFilter;
  /** How many entries the site has, whatever the filter. */
  readonly total: number;
  /** The rows to list, in tile order; every entry appears at most once. */
  readonly entries: readonly EntrySummary[];
  /** Groups, the facet row: `All (n)` plus every facet at least one entry has, counted across every kind. */
  readonly facets: readonly FacetChip[];
  /** Groups, the tag rows: one per category that has a chip, in `TAG_CATEGORIES` order. Empty when no entry is tagged. */
  readonly tags: readonly TagRow[];
}

export type AllResult =
  | { readonly kind: "found"; readonly page: AllPage }
  /** `?tag=` named a slug no tag has (404). */
  | { readonly kind: "not-found" };

/** A to Z by label, whatever its case; the slug settles two labels that differ only by case. */
function byLabel(a: Tag, b: Tag): number {
  const x = a.label.toLowerCase();
  const y = b.label.toLowerCase();
  if (x !== y) return x < y ? -1 : 1;
  return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
}

/**
 * Everything `/all` renders (brief §5: the "full searchable index of every
 * entry", and "Groups — tag and facet browsing"): one flat list of every
 * kind, in the same tile order a section uses, narrowed by at most one thing —
 * a search, a facet or a tag — and the chips that offer each group.
 *
 * Both contracts are the owner's. Search (handoff/feat-shell-tile-grid.md,
 * BUILD_PLAN §5) reads three fields — title, subtitle and summary, which are
 * also what an index row shows — case-insensitively; every word typed must
 * appear somewhere in them, and a match keeps its place. It does not read
 * tags. Groups (handoff/feat-shell-facets.md): a facet narrows across every
 * kind; a tag narrows to the entries that carry it; team tags are a category
 * like the others; a chip exists only for a group with at least one entry.
 *
 * Everything is narrowed and counted in code. The lists are the ones the
 * sitemap already reads and the tags are one more cached read, so a filter
 * costs no database round-trip of its own — and nothing a visitor types or
 * puts in a URL ever reaches a PostgREST filter.
 * @returns the index, with `entries` empty when nothing matches; or not-found for a tag slug no tag has.
 */
export async function loadAll(filter: AllFilter, queries: RouteQueries = defaultQueries): Promise<AllResult> {
  const [lists, groups] = await Promise.all([
    Promise.all(SECTIONS.flatMap((section) => section.kinds).map((kind) => queries.listSection(kind, {}))),
    queries.listTagGroups(),
  ]);
  const all = lists.flat().sort(compareRecency);
  const listed = new Set(all.map((entry) => entry.id));

  const facets: FacetChip[] = [
    { facet: null, label: "All", count: all.length, href: allHref(), active: filter.kind === "none" },
  ];
  for (const candidate of FACET_ORDER) {
    const count = all.filter((entry) => entry.facet === candidate).length;
    if (count === 0) continue;
    facets.push({
      facet: candidate,
      label: chipLabel(candidate),
      count,
      href: allHref({ facet: candidate }),
      active: filter.kind === "facet" && filter.facet === candidate,
    });
  }

  // A tag's entries, as far as the index lists them: the count on a chip is
  // then exactly the number of rows the chip leads to.
  const members = groups.map(({ tag, entryIds }) => ({
    tag,
    ids: new Set(entryIds.filter((id) => listed.has(id))),
  }));
  const tags: TagRow[] = TAG_CATEGORIES.map((category) => ({
    category,
    chips: members
      .filter(({ tag, ids }) => tag.category === category && ids.size > 0)
      .sort((a, b) => byLabel(a.tag, b.tag))
      .map(({ tag, ids }) => ({
        slug: tag.slug,
        label: tag.label,
        count: ids.size,
        href: allHref({ tag: tag.slug }),
        active: filter.kind === "tag" && filter.slug === tag.slug,
      })),
  })).filter((row) => row.chips.length > 0);

  let entries = all;
  if (filter.kind === "search") {
    const words = filter.query.toLowerCase().split(/\s+/).filter(Boolean);
    entries = all.filter((entry) => {
      const text = [entry.title, entry.subtitle, entry.summary].join("\n").toLowerCase();
      return words.every((word) => text.includes(word));
    });
  } else if (filter.kind === "facet") {
    entries = all.filter((entry) => entry.facet === filter.facet);
  } else if (filter.kind === "tag") {
    const group = members.find(({ tag }) => tag.slug === filter.slug);
    if (!group) return { kind: "not-found" };
    entries = all.filter((entry) => group.ids.has(entry.id));
  }

  return { kind: "found", page: { filter, total: all.length, entries, facets, tags } };
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

// Sitemap -------------------------------------------------------------------

/** One `/sitemap.xml` row: a site-relative canonical path, and when it last changed if that is known. */
export interface SitemapUrl {
  readonly path: string;
  /** The entry row's `updated_at`. Absent for the home, resume and section URLs, which have no such fact. */
  readonly lastModified?: string;
}

/**
 * Every canonical URL the site serves, derived from the route table and the
 * query layer rather than listed: `/`, `/resume`, `/all`, then each section
 * followed by its entries in tile order. Adding a section stays one
 * `SECTIONS` entry.
 *
 * What is left out is deliberate. `?facet=` views are subsets of their
 * section and canonicalise to it, as a `?q=`, `?facet=` or `?tag=` view of the
 * index does to `/all`;
 * `/privacy` and `/admin` are reserved and have no page. `lastModified` is only written where the database records
 * it — an entry's `updated_at`, which the row trigger stamps on real edits
 * only (the content seed upserts `where … is distinct from`) — and no
 * priority or change frequency is invented for anything.
 * @returns the URLs in that order; a section with no entries still has its own URL.
 */
export async function loadSitemap(queries: RouteQueries = defaultQueries): Promise<SitemapUrl[]> {
  const lists = await Promise.all(
    SECTIONS.map((section) => Promise.all(section.kinds.map((kind) => queries.listSection(kind, {})))),
  );
  const urls: SitemapUrl[] = [{ path: HOME_HREF }, { path: RESUME_HREF }, { path: ALL_HREF }];
  SECTIONS.forEach((section, index) => {
    urls.push({ path: sectionHref(section) });
    for (const entry of lists[index].flat().sort(compareRecency)) {
      urls.push({ path: entryHref(entry), lastModified: entry.updated_at });
    }
  });
  return urls;
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
