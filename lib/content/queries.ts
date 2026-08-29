/**
 * lib/content/queries.ts — the query layer (S4, BUILD_PLAN §4): tile row,
 * detail, facet counts, relation traversal, and every link at once (S6, for
 * `/resume`).
 *
 * These are the shapes S5 (route table), S6 (recruiter render), S7 (console
 * tile) and S8 (trophy case) build on. Every function reads through the anon
 * client in lib/db/client.ts (so it is cached and revalidated as documented
 * there), validates every row through lib/content/schema.ts, and throws
 * rather than returning partial data: a PostgREST error is a
 * `ContentQueryError`, an invalid row a `ContentValidationError`, and a
 * result the Data API truncated at its row limit is also an error.
 *
 * Multi-placement (brief §4.1): one record surfaces wherever a relation
 * points at it. `listSection("experience")` returns the Break Through Tech
 * experience once; `listSection("project")` returns its child project, whose
 * `part_of` edge (`listRelated`) leads back to the same id; `listTrophies()`
 * returns the certification whose `certifies` edge does the same. Nothing is
 * copied — consumers follow edges.
 */

import { getAnonClient, type ContentClient } from "../db/client";
import {
  ContentValidationError,
  FACETS,
  TILE_SELECT,
  isFacet,
  linkSchema,
  mediaSchema,
  parseEntry,
  parseEntrySummary,
  parseRow,
  relationTypeSchema,
  tagSchema,
  type Entry,
  type EntrySummary,
  type EntrySummaryOf,
  type Facet,
  type Kind,
  type Link,
  type Media,
  type RelationType,
  type Tag,
} from "./schema";
import { z } from "zod";

// Errors --------------------------------------------------------------------

interface PostgrestFailure {
  readonly message: string;
  readonly code: string;
  readonly details: string;
  readonly hint: string;
}

/** A Data API request failed, or returned fewer rows than exist. */
export class ContentQueryError extends Error {
  readonly operation: string;
  readonly code: string;
  readonly details: string;
  readonly hint: string;

  constructor(operation: string, failure: PostgrestFailure) {
    super(`${operation}: ${failure.message} (${failure.code})`);
    this.name = "ContentQueryError";
    this.operation = operation;
    this.code = failure.code;
    this.details = failure.details;
    this.hint = failure.hint;
  }
}

interface ListResult<T> {
  readonly data: T[] | null;
  readonly error: PostgrestFailure | null;
  readonly count: number | null;
}

/**
 * Unwraps a list response. Requests ask for `count: "exact"`, so a result the
 * server cut at `max_rows` (1000 on the hosted project) is detected here and
 * refused instead of being served as if it were complete.
 */
function complete<T>(operation: string, result: ListResult<T>): T[] {
  if (result.error) throw new ContentQueryError(operation, result.error);
  const rows = result.data ?? [];
  if (typeof result.count === "number" && result.count !== rows.length) {
    throw new ContentQueryError(operation, {
      message: `result truncated: ${rows.length} of ${result.count} rows`,
      code: "TRUNCATED",
      details: "the Data API row limit was reached",
      hint: "narrow the query or raise max_rows",
    });
  }
  return rows;
}

const entryId = z.guid();

// Ordering ------------------------------------------------------------------

/** Tile order: featured, then owner weight, then most recent start, then title. Matches `entries_recency_idx`. */
export function compareRecency(a: EntrySummary, b: EntrySummary): number {
  if (a.featured !== b.featured) return a.featured ? -1 : 1;
  if (a.sort_weight !== b.sort_weight) return b.sort_weight - a.sort_weight;
  if (a.start_date !== b.start_date) {
    if (a.start_date === null) return 1;
    if (b.start_date === null) return -1;
    return a.start_date < b.start_date ? 1 : -1;
  }
  if (a.title !== b.title) return a.title < b.title ? -1 : 1;
  return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
}

// Tile row ------------------------------------------------------------------

export interface ListSectionOptions {
  /** `undefined`: every row of the kind. `null`: rows with no facet. A facet: that facet only. */
  readonly facet?: Facet | null;
}

/**
 * The rows of one top-level section (brief §4.3), recency-ordered, without
 * `body`.
 * @returns tile rows, optionally narrowed to one facet or to the unfaceted rows.
 */
export async function listSection(
  kind: Kind,
  options: ListSectionOptions = {},
  client: ContentClient = getAnonClient(),
): Promise<EntrySummary[]> {
  let query = client.from("entries").select(TILE_SELECT, { count: "exact" }).eq("kind", kind);
  if (options.facet === null) query = query.is("facet", null);
  else if (options.facet !== undefined) query = query.eq("facet", options.facet);
  query = query
    .order("featured", { ascending: false })
    .order("sort_weight", { ascending: false })
    .order("start_date", { ascending: false, nullsFirst: false })
    .order("title", { ascending: true })
    .order("slug", { ascending: true });
  return complete(`listSection(${kind})`, await query).map((row) => parseEntrySummary(row));
}

// Facet counts --------------------------------------------------------------

export interface FacetCounts {
  /** Every row of the kind — the "All (n)" chip. */
  readonly all: number;
  /** One entry per facet in `FACETS`, zero when empty. */
  readonly byFacet: Readonly<Record<Facet, number>>;
  /** Rows whose facet is null; not a chip, but `all` includes them. */
  readonly unfaceted: number;
}

/**
 * Live counts for the facet chips (brief §4.2), from one request over the
 * kind's `facet` column. Counted here rather than by a server aggregate,
 * which the Data API disables by default.
 * @returns counts that always include the null facet in `all`.
 */
export async function getFacetCounts(
  kind: Kind,
  client: ContentClient = getAnonClient(),
): Promise<FacetCounts> {
  const rows = complete(
    `getFacetCounts(${kind})`,
    await client.from("entries").select("facet", { count: "exact" }).eq("kind", kind),
  );
  const byFacet = Object.fromEntries(FACETS.map((facet) => [facet, 0])) as Record<Facet, number>;
  let unfaceted = 0;
  for (const { facet } of rows) {
    if (facet === null) unfaceted += 1;
    else if (isFacet(facet)) byFacet[facet] += 1;
    else {
      const result = z.enum(FACETS).safeParse(facet);
      if (!result.success) throw new ContentValidationError(`facet on ${kind}`, null, result.error);
    }
  }
  return { all: rows.length, byFacet, unfaceted };
}

// Relation traversal --------------------------------------------------------

export interface RelationEdge {
  readonly type: RelationType;
  /** The entry at the other end of the edge. */
  readonly entry: EntrySummary;
}

export interface EntryRelations {
  /** Edges where this entry is the `from` side: `<this> <type> <entry>` (a project `part_of` its program). */
  readonly outgoing: readonly RelationEdge[];
  /** Edges where this entry is the `to` side: `<entry> <type> <this>` (the projects that are `part_of` this). */
  readonly incoming: readonly RelationEdge[];
}

// Two foreign keys point at `entries`, so each embed names its constraint.
// A template of literals stays a literal type, which supabase-js needs to
// type the embedded rows.
const RELATION_SELECT =
  `relation_type,from_entry_id,to_entry_id,from:entries!entry_relations_from_entry_id_fkey(${TILE_SELECT}),to:entries!entry_relations_to_entry_id_fkey(${TILE_SELECT})` as const;

/**
 * Every relation touching one entry, in both directions, each edge carrying
 * the related entry as a tile row. `related_to` is stored once and appears
 * on whichever side it was written.
 * @returns the entry's edges; empty lists when it has none.
 */
export async function listRelated(
  id: string,
  client: ContentClient = getAnonClient(),
): Promise<EntryRelations> {
  const safeId = entryId.parse(id);
  const rows = complete(
    "listRelated",
    await client
      .from("entry_relations")
      .select(RELATION_SELECT, { count: "exact" })
      .or(`from_entry_id.eq.${safeId},to_entry_id.eq.${safeId}`),
  );
  const outgoing: RelationEdge[] = [];
  const incoming: RelationEdge[] = [];
  for (const row of rows) {
    const type = relationTypeSchema.parse(row.relation_type);
    if (row.from_entry_id === safeId) outgoing.push({ type, entry: parseEntrySummary(row.to) });
    if (row.to_entry_id === safeId) incoming.push({ type, entry: parseEntrySummary(row.from) });
  }
  const byEdge = (a: RelationEdge, b: RelationEdge) =>
    a.type === b.type ? compareRecency(a.entry, b.entry) : a.type < b.type ? -1 : 1;
  return { outgoing: outgoing.sort(byEdge), incoming: incoming.sort(byEdge) };
}

// Detail --------------------------------------------------------------------

export interface EntryDetail {
  readonly entry: Entry;
  readonly links: readonly Link[];
  readonly media: readonly Media[];
  readonly tags: readonly Tag[];
  readonly relations: EntryRelations;
}

const DETAIL_SELECT = "*,links(*),media(*),tags(*)";

/**
 * The full record behind one URL (brief §5 "detail dive"): the entry with
 * its links, media, tags and relations.
 * @returns the detail, or `null` when no entry has that slug.
 */
export async function getEntryBySlug(
  slug: string,
  client: ContentClient = getAnonClient(),
): Promise<EntryDetail | null> {
  const { data, error } = await client
    .from("entries")
    .select(DETAIL_SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new ContentQueryError(`getEntryBySlug(${slug})`, error);
  if (!data) return null;
  const { links, media, tags, ...row } = data;
  const entry = parseEntry(row);
  return {
    entry,
    links: links.map((link) => parseRow(linkSchema, "link", link)).sort((a, b) => a.label.localeCompare(b.label)),
    media: media.map((item) => parseRow(mediaSchema, "media", item)).sort((a, b) => a.sort - b.sort),
    tags: tags.map((tag) => parseRow(tagSchema, "tag", tag)).sort((a, b) => a.slug.localeCompare(b.slug)),
    relations: await listRelated(entry.id, client),
  };
}

// Links ---------------------------------------------------------------------

/**
 * Every `links` row in one request, for a page that renders many entries'
 * links at once (`/resume`). `getEntryBySlug` already embeds an entry's own
 * links, so this exists only so the resume does not need one detail request
 * per row; group the result by `entry_id`.
 * @returns every link, ordered by entry then label.
 */
export async function listLinks(client: ContentClient = getAnonClient()): Promise<Link[]> {
  const rows = complete(
    "listLinks",
    await client.from("links").select("*", { count: "exact" }).order("entry_id").order("label"),
  );
  return rows.map((row) => parseRow(linkSchema, "link", row));
}

// Trophy case ---------------------------------------------------------------

/** A trophy: a certification-kind tile row, whose metadata carries `category` and whose `status` is its state. */
export type Trophy = EntrySummaryOf<"certification">;

/**
 * The trophy case (brief §5): certifications and awards are one kind, so
 * this is `listSection("certification")` with the narrowed type.
 * @returns every certification-kind row, recency-ordered; `status` gives locked / in_progress / unlocked.
 */
export async function listTrophies(client: ContentClient = getAnonClient()): Promise<Trophy[]> {
  const rows = await listSection("certification", {}, client);
  return rows.filter((row): row is Trophy => row.kind === "certification");
}
