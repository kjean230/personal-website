/**
 * lib/content/schema.ts — Zod schemas per `kind` (S4, BUILD_PLAN §4).
 *
 * Brief §4: the database keeps `entries.kind` and `entries.facet` open so a
 * new section type costs zero migrations; type safety is recovered here, at
 * the database → app boundary. This file is therefore the single source of
 * the closed value sets for kind, facet and the metadata keys each kind
 * carries. `status`, `relation_type`, `tags.category` and `links.kind` mirror
 * the named CHECK constraints in supabase/migrations.
 *
 * Boundary behaviour: a row that fails validation throws
 * `ContentValidationError` naming the slug. It fails loudly in every
 * environment and is never silently dropped from a page — an invalid row is
 * an editing mistake to fix, not something to hide.
 *
 * Dates stay ISO strings (`YYYY-MM-DD`, `date_precision` says how much of it
 * is real — LinkedIn gives months, so the day is a placeholder); renderers
 * format them. Metadata is `.loose()`: unknown keys pass through untouched so
 * lane/content can add fields before this file knows them; known keys are
 * typed and checked.
 */

import { z, type ZodError } from "zod";

// Closed value sets ---------------------------------------------------------

/** Brief §4 kinds. Four have content today; hobby, interest and post are lane/content's. */
export const KINDS = [
  "experience",
  "project",
  "certification",
  "education",
  "hobby",
  "interest",
  "post",
] as const;
export type Kind = (typeof KINDS)[number];

/** Brief §4 facets; the column is nullable and most real rows are null today. */
export const FACETS = ["corporate", "research", "volunteer", "classroom", "coursework"] as const;
export type Facet = (typeof FACETS)[number];

/** Trophy states (brief §5). Mirrors `entries_status_allowed`. */
export const STATUSES = ["unlocked", "in_progress", "archived"] as const;
export type Status = (typeof STATUSES)[number];

/** Read as `<from> <relation_type> <to>`. Mirrors `entry_relations_type_allowed`. */
export const RELATION_TYPES = ["part_of", "certifies", "produced_by", "related_to"] as const;
export type RelationType = (typeof RELATION_TYPES)[number];

/** Mirrors `tags_category_allowed`; `team` renders as followed-team cards. */
export const TAG_CATEGORIES = ["skill", "tool", "domain", "team"] as const;
export type TagCategory = (typeof TAG_CATEGORIES)[number];

/** Mirrors `links_kind_allowed`. A credential link uses `profile` (no `credential` value yet). */
export const LINK_KINDS = ["company", "repo", "paper", "demo", "profile"] as const;
export type LinkKind = (typeof LINK_KINDS)[number];

/** How much of a `start_date` / `end_date` is real (S3: LinkedIn gives months). */
export const DATE_PRECISIONS = ["day", "month", "year"] as const;
export type DatePrecision = (typeof DATE_PRECISIONS)[number];

/** Brief §5: the trophy case holds certifications and awards — one kind, two categories. */
export const CERTIFICATION_CATEGORIES = ["certification", "award"] as const;
export type CertificationCategory = (typeof CERTIFICATION_CATEGORIES)[number];

// Field schemas -------------------------------------------------------------

/** Ids are validated by the database; `guid` accepts any well-formed UUID. */
const id = z.guid();
/** Mirrors `entries_slug_format` / `tags_slug_format`. */
const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug must be lowercase words joined by single hyphens");
const isoDate = z.iso.date();
const timestamp = z.iso.datetime({ offset: true });

/** Where a row came from (S3 importer): an export file or a public page. */
export const sourceSchema = z
  .object({
    export: z.string().min(1),
    file: z.string().min(1).optional(),
    url: z.url().optional(),
  })
  .loose();

/** Keys every kind may carry. */
export const metadataBaseSchema = z
  .object({
    /** `true` only on supabase/seed.sql rows; real rows carry `source` instead. */
    fixture: z.boolean().optional(),
    source: sourceSchema.optional(),
    date_precision: z.enum(DATE_PRECISIONS).optional(),
    location: z.string().optional(),
  })
  .loose();

export const experienceMetadataSchema = metadataBaseSchema
  .extend({
    /** Volunteering cause (LinkedIn `Volunteering.csv`). */
    cause: z.string().optional(),
  })
  .loose();

export const educationMetadataSchema = metadataBaseSchema
  .extend({
    /** Activities and societies (LinkedIn `Education.csv`). */
    activities: z.string().optional(),
  })
  .loose();

export const certificationMetadataSchema = metadataBaseSchema
  .extend({
    /** Absent on older rows means a certification; honors are `award`. */
    category: z.enum(CERTIFICATION_CATEGORIES).default("certification"),
    credential_id: z.string().optional(),
    credential_url: z.url().optional(),
  })
  .loose();

/** Every `entries` column, in migration order. Compared against the database by the API tests. */
export const ENTRY_COLUMNS = [
  "id",
  "kind",
  "facet",
  "slug",
  "title",
  "subtitle",
  "summary",
  "body",
  "start_date",
  "end_date",
  "is_current",
  "status",
  "icon_asset",
  "accent_color",
  "featured",
  "sort_weight",
  "metadata",
  "created_at",
  "updated_at",
] as const;

/** Columns a tile needs — every column but `body`, which only the detail page renders. */
export const TILE_COLUMNS = ENTRY_COLUMNS.filter((column) => column !== "body");

/**
 * `TILE_COLUMNS` as the literal PostgREST `select` string. Spelled out
 * because supabase-js can only type a select whose column string is a
 * literal type; `schema.test.ts` pins it to `TILE_COLUMNS`.
 */
export const TILE_SELECT =
  "id,kind,facet,slug,title,subtitle,summary,start_date,end_date,is_current,status,icon_asset,accent_color,featured,sort_weight,metadata,created_at,updated_at" as const;

const entryBaseSchema = z.object({
  id,
  kind: z.enum(KINDS),
  facet: z.enum(FACETS).nullable(),
  slug,
  title: z.string().min(1),
  subtitle: z.string().nullable(),
  summary: z.string().nullable(),
  body: z.string().nullable(),
  start_date: isoDate.nullable(),
  end_date: isoDate.nullable(),
  is_current: z.boolean(),
  status: z.enum(STATUSES),
  icon_asset: z.string().nullable(),
  accent_color: z.string().nullable(),
  featured: z.boolean(),
  sort_weight: z.int(),
  metadata: metadataBaseSchema,
  created_at: timestamp,
  updated_at: timestamp,
});

// Per-kind schemas ----------------------------------------------------------

export const experienceEntrySchema = entryBaseSchema.extend({
  kind: z.literal("experience"),
  metadata: experienceMetadataSchema,
});
export const projectEntrySchema = entryBaseSchema.extend({ kind: z.literal("project") });
export const certificationEntrySchema = entryBaseSchema.extend({
  kind: z.literal("certification"),
  metadata: certificationMetadataSchema,
});
export const educationEntrySchema = entryBaseSchema.extend({
  kind: z.literal("education"),
  metadata: educationMetadataSchema,
});
export const hobbyEntrySchema = entryBaseSchema.extend({ kind: z.literal("hobby") });
export const interestEntrySchema = entryBaseSchema.extend({ kind: z.literal("interest") });
export const postEntrySchema = entryBaseSchema.extend({ kind: z.literal("post") });

/** A full `entries` row, discriminated on `kind`. */
export const entrySchema = z.discriminatedUnion("kind", [
  experienceEntrySchema,
  projectEntrySchema,
  certificationEntrySchema,
  educationEntrySchema,
  hobbyEntrySchema,
  interestEntrySchema,
  postEntrySchema,
]);
export type Entry = z.infer<typeof entrySchema>;

/** A tile row: the same union without `body`. */
export const entrySummarySchema = z.discriminatedUnion("kind", [
  experienceEntrySchema.omit({ body: true }),
  projectEntrySchema.omit({ body: true }),
  certificationEntrySchema.omit({ body: true }),
  educationEntrySchema.omit({ body: true }),
  hobbyEntrySchema.omit({ body: true }),
  interestEntrySchema.omit({ body: true }),
  postEntrySchema.omit({ body: true }),
]);
export type EntrySummary = z.infer<typeof entrySummarySchema>;

export type EntryOf<K extends Kind> = Extract<Entry, { kind: K }>;
export type EntrySummaryOf<K extends Kind> = Extract<EntrySummary, { kind: K }>;

// Related tables ------------------------------------------------------------

export const linkSchema = z.object({
  id,
  entry_id: id,
  label: z.string().min(1),
  /** Mirrors `links_url_http`: only http(s) links leave the site. */
  url: z.url({ protocol: /^https?$/ }),
  kind: z.enum(LINK_KINDS),
});
export type Link = z.infer<typeof linkSchema>;

export const tagSchema = z.object({
  id,
  slug,
  label: z.string().min(1),
  category: z.enum(TAG_CATEGORIES),
});
export type Tag = z.infer<typeof tagSchema>;

export const mediaSchema = z.object({
  id,
  entry_id: id,
  storage_path: z.string().min(1),
  caption: z.string().nullable(),
  alt_text: z.string().min(1),
  sort: z.int(),
});
export type Media = z.infer<typeof mediaSchema>;

export const relationTypeSchema = z.enum(RELATION_TYPES);

// Boundary ------------------------------------------------------------------

/** Thrown when a database row does not match its schema. Never swallowed. */
export class ContentValidationError extends Error {
  readonly slug: string | null;
  readonly issues: ZodError["issues"];

  constructor(what: string, slug: string | null, error: ZodError) {
    super(`Invalid ${what}${slug ? ` "${slug}"` : ""}: ${z.prettifyError(error)}`);
    this.name = "ContentValidationError";
    this.slug = slug;
    this.issues = error.issues;
  }
}

function slugOf(row: unknown): string | null {
  return typeof row === "object" && row !== null && "slug" in row && typeof row.slug === "string"
    ? row.slug
    : null;
}

/**
 * Validates one row against `schema`.
 * @returns the parsed value.
 * @throws ContentValidationError with the row's slug (when it has one) and every issue.
 */
export function parseRow<T>(schema: z.ZodType<T>, what: string, row: unknown): T {
  const result = schema.safeParse(row);
  if (!result.success) throw new ContentValidationError(what, slugOf(row), result.error);
  return result.data;
}

/** @returns a validated full entry. */
export function parseEntry(row: unknown): Entry {
  return parseRow(entrySchema, "entry", row);
}

/** @returns a validated tile row. */
export function parseEntrySummary(row: unknown): EntrySummary {
  return parseRow(entrySummarySchema, "entry", row);
}

/** @returns `true` when `value` is one of the closed facet values. */
export function isFacet(value: unknown): value is Facet {
  return typeof value === "string" && (FACETS as readonly string[]).includes(value);
}

/** @returns `true` when `value` is one of the closed kind values. */
export function isKind(value: unknown): value is Kind {
  return typeof value === "string" && (KINDS as readonly string[]).includes(value);
}
