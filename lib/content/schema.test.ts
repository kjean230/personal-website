import { describe, expect, it } from "vitest";
import {
  CERTIFICATION_CATEGORIES,
  ContentValidationError,
  DATE_PRECISIONS,
  ENTRY_COLUMNS,
  FACETS,
  KINDS,
  STATUSES,
  TILE_COLUMNS,
  TILE_SELECT,
  linkSchema,
  parseEntry,
  parseEntrySummary,
  parseRow,
} from "./schema";

// The value sets and metadata shapes here are the ones both seeds use
// (supabase/seed.sql fixtures, supabase/seed.content.sql from the LinkedIn
// export) plus every value brief §4 allows the owner to set. A row that
// matches none of them must fail loudly, naming its slug — never vanish.

const base = {
  id: "0e02f978-92d2-5be6-a19a-b0addaa5bc2c",
  kind: "experience",
  facet: "research",
  slug: "break-through-tech",
  title: "AI/ML Fellow",
  subtitle: "Break Through Tech",
  summary: null,
  body: "- bullet",
  start_date: "2026-05-01",
  end_date: null,
  is_current: true,
  status: "unlocked",
  icon_asset: null,
  accent_color: null,
  featured: false,
  sort_weight: 0,
  metadata: {
    source: { export: "linkedin", file: "Positions.csv" },
    date_precision: "month",
    location: "New York, NY",
  },
  created_at: "2026-08-25T04:00:00.123456+00:00",
  updated_at: "2026-08-25T04:00:00+00:00",
};

const row = (overrides: Record<string, unknown>) => ({ ...base, ...overrides });

describe("closed value sets", () => {
  it("accepts every kind, facet and status the brief lists, and a null facet", () => {
    for (const kind of KINDS) expect(parseEntry(row({ kind })).kind).toBe(kind);
    for (const facet of [...FACETS, null]) expect(parseEntry(row({ facet })).facet).toBe(facet);
    for (const status of STATUSES) expect(parseEntry(row({ status })).status).toBe(status);
  });

  it("rejects a kind or facet outside the brief, naming the slug", () => {
    expect(() => parseEntry(row({ kind: "award" }))).toThrow(ContentValidationError);
    expect(() => parseEntry(row({ kind: "award" }))).toThrow(/"break-through-tech"/);
    expect(() => parseEntry(row({ facet: "ai" }))).toThrow(/facet/);
    expect(() => parseEntry(row({ status: "locked" }))).toThrow(/status/);
  });

  it("lists every entries column once, and tiles carry all of them but body", () => {
    expect(new Set(ENTRY_COLUMNS).size).toBe(ENTRY_COLUMNS.length);
    expect(TILE_COLUMNS).toEqual(ENTRY_COLUMNS.filter((c) => c !== "body"));
    expect(TILE_SELECT).toBe(TILE_COLUMNS.join(","));
    const parsed = parseEntry(base);
    expect(Object.keys(parsed).sort()).toEqual([...ENTRY_COLUMNS].sort());
  });
});

describe("metadata by kind", () => {
  it("accepts the fixture shape on every kind", () => {
    for (const kind of KINDS) {
      const parsed = parseEntry(row({ kind, metadata: { fixture: true } }));
      expect(parsed.metadata).toMatchObject({ fixture: true });
      // The only key added on parse is a certification's default category.
      expect(Object.keys(parsed.metadata).sort()).toEqual(
        kind === "certification" ? ["category", "fixture"] : ["fixture"],
      );
    }
  });

  it("accepts the LinkedIn shapes: positions, volunteering, projects, education", () => {
    expect(parseEntry(base).metadata.location).toBe("New York, NY");
    const volunteer = parseEntry(
      row({
        facet: "volunteer",
        metadata: { source: { export: "linkedin", file: "Volunteering.csv" }, date_precision: "month", cause: "environment" },
      }),
    );
    expect(volunteer.kind === "experience" && volunteer.metadata.cause).toBe("environment");
    expect(
      parseEntry(row({ kind: "project", metadata: { source: { export: "linkedin", file: "Projects.csv" }, date_precision: "month" } }))
        .metadata.date_precision,
    ).toBe("month");
    const education = parseEntry(
      row({
        kind: "education",
        metadata: { source: { export: "linkedin", file: "Education.csv" }, date_precision: "month", activities: "Clubs" },
      }),
    );
    expect(education.kind === "education" && education.metadata.activities).toBe("Clubs");
  });

  it("accepts honors as certification + award, and a credential with its page as source", () => {
    const honor = parseEntry(
      row({ kind: "certification", metadata: { source: { export: "linkedin", file: "Honors.csv" }, category: "award" } }),
    );
    expect(honor.kind === "certification" && honor.metadata.category).toBe("award");
    const credential = parseEntry(
      row({
        kind: "certification",
        metadata: {
          source: { export: "credential-page", url: "https://example.edu/credential/abc" },
          date_precision: "day",
          category: "certification",
          credential_id: "abc",
          credential_url: "https://example.edu/credential/abc",
        },
      }),
    );
    expect(credential.kind === "certification" && credential.metadata.credential_id).toBe("abc");
  });

  it("defaults a certification without a category to certification", () => {
    const parsed = parseEntry(row({ kind: "certification", metadata: { fixture: true } }));
    expect(parsed.kind === "certification" && parsed.metadata.category).toBe("certification");
    expect(CERTIFICATION_CATEGORIES).toContain("award");
  });

  it("lets an unknown metadata key through unchanged", () => {
    const parsed = parseEntry(row({ metadata: { ...base.metadata, team: "Knicks" } }));
    expect(parsed.metadata).toMatchObject({ team: "Knicks" });
  });

  it("rejects malformed known keys loudly", () => {
    expect(() => parseEntry(row({ metadata: { date_precision: "week" } }))).toThrow(/date_precision/);
    expect(() => parseEntry(row({ kind: "certification", metadata: { category: "medal" } }))).toThrow(/category/);
    expect(() => parseEntry(row({ kind: "certification", metadata: { credential_url: "not a url" } }))).toThrow(
      /credential_url/,
    );
    expect(() => parseEntry(row({ metadata: [] }))).toThrow(ContentValidationError);
    expect(DATE_PRECISIONS).toEqual(["day", "month", "year"]);
  });
});

describe("row fields", () => {
  it("rejects a bad id, slug or date", () => {
    expect(() => parseEntry(row({ id: "not-a-uuid" }))).toThrow(/id/);
    expect(() => parseEntry(row({ slug: "Bad_Slug" }))).toThrow(/slug/);
    expect(() => parseEntry(row({ start_date: "May 2026" }))).toThrow(/start_date/);
  });

  it("parses a tile row without body and rejects a full row missing a column", () => {
    const tile = Object.fromEntries(Object.entries(base).filter(([key]) => key !== "body"));
    expect(parseEntrySummary(tile).slug).toBe("break-through-tech");
    expect(() => parseEntry(tile)).toThrow(/body/);
  });

  it("names the table when a related row is invalid", () => {
    expect(() => parseRow(linkSchema, "link", { id: base.id, entry_id: base.id, label: "x", url: "ftp://x", kind: "profile" })).toThrow(
      /Invalid link/,
    );
  });
});
