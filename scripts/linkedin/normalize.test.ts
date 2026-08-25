/**
 * Normalizer tests on inline fixtures shaped like the LinkedIn export's
 * files. The real export is never read here (it lives outside the repo and
 * is never committed).
 */
import { describe, expect, it } from "vitest";
import {
  bulletsToMarkdown,
  decodeEntities,
  normalize,
  parseDate,
  slugify,
} from "./normalize.mjs";
import type { Supplement } from "./supplement.mjs";

const POSITIONS = `Company Name,Title,Description,Location,Started On,Finished On
Program Org,Research Fellow,"• Studied things. • Built a model.","New York, NY",May 2026,
Acme,Data Intern,"• Did work.","New York, NY",May 2026,Aug 2026
Same School,Tutor,Tutored.,,Jan 2025,May 2025
Same School,Mentor,Mentored.,,Jan 2024,May 2024
`;

const PROJECTS = `Title,Description,Url,Started On,Finished On
Classifier Project,Trained a classifier.,,Jul 2026,Jul 2026
Field Project,Modelled a field.,https://example.com/field,Jun 2025,Aug 2025
`;

const EDUCATION = `School Name,Start Date,End Date,Notes,Degree Name,Activities
Same School,Jul 2023,May 2027,Dean's List &amp; more.,Bachelor of Science - BS,Club A Club B
Other School,Aug 2026,,,,
`;

const HONORS = `Title,Description,Issued On
Some Scholarship,Renewable scholarship.,Aug 2024
Dean's List,Spring 2024,
`;

const VOLUNTEERING = `Company Name,Role,Cause,Started On,Finished On,Description
Local Library,Stocker,environment,Jun 2019,Jun 2020,Shelved books.
`;

const FILES = {
  "Positions.csv": POSITIONS,
  "Projects.csv": PROJECTS,
  "Education.csv": EDUCATION,
  "Honors.csv": HONORS,
  "Volunteering.csv": VOLUNTEERING,
};

const PROGRAM = { file: "Positions.csv", "Company Name": "Program Org", Title: "Research Fellow" };

const SUPPLEMENT: Supplement = {
  credentials: [
    {
      credential_id: "abc123",
      credential_url: "https://credentials.example.com/abc123",
      title: "Foundations Course",
      issuer: "Example Issuer",
      issued_on: "2026-08-05",
      certifies: PROGRAM,
      source: "test",
    },
  ],
  facets: [{ ref: PROGRAM, facet: "research", source: "test" }],
  relations: [
    {
      from: { file: "Projects.csv", Title: "Classifier Project" },
      type: "part_of",
      to: PROGRAM,
      note: "test",
    },
  ],
  suggested: [
    {
      from: { file: "Projects.csv", Title: "Field Project" },
      type: "part_of",
      to: { file: "Positions.csv", "Company Name": "Acme", Title: "Data Intern" },
      note: "test",
    },
  ],
};

const EMPTY: Supplement = { credentials: [], facets: [], relations: [], suggested: [] };

describe("parseDate", () => {
  it("reads LinkedIn's month, year, and day forms with a precision", () => {
    expect(parseDate("May 2026")).toEqual({ date: "2026-05-01", precision: "month" });
    expect(parseDate("September 2025")).toEqual({ date: "2025-09-01", precision: "month" });
    expect(parseDate("2024")).toEqual({ date: "2024-01-01", precision: "year" });
    expect(parseDate("Aug 5, 2026")).toEqual({ date: "2026-08-05", precision: "day" });
    expect(parseDate("2026-08-05")).toEqual({ date: "2026-08-05", precision: "day" });
  });

  it("returns null for empty and throws on anything else, never a silent null", () => {
    expect(parseDate("")).toBeNull();
    expect(parseDate("  ")).toBeNull();
    expect(() => parseDate("05/2026")).toThrow(/unrecognised date/);
    expect(() => parseDate("Foo 2026")).toThrow(/unrecognised date/);
  });
});

describe("slugify / decodeEntities / bulletsToMarkdown", () => {
  it("produces slugs that satisfy entries_slug_format", () => {
    const pattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    for (const input of ["Guardian Life", "AI/ML Cornell Tech Fellow", "Information & Data (CISC 2500)", "Café -- Résumé"]) {
      expect(slugify(input)).toMatch(pattern);
    }
    expect(slugify("Information & Data")).toBe("information-and-data");
    expect(() => slugify("---")).toThrow();
  });

  it("decodes the entities LinkedIn emits", () => {
    expect(decodeEntities("Information &amp; Data &quot;x&quot; &#39;y&#39;")).toBe(
      'Information & Data "x" \'y\'',
    );
  });

  it("turns a bullet run into a markdown list and leaves plain text alone", () => {
    expect(bulletsToMarkdown("• One thing.   • Two things. • Three")).toBe(
      "- One thing.\n- Two things.\n- Three",
    );
    expect(bulletsToMarkdown("Just a sentence.")).toBe("Just a sentence.");
    expect(bulletsToMarkdown("   ")).toBeNull();
  });
});

describe("normalize", () => {
  const data = normalize(FILES, SUPPLEMENT);
  const bySlug = Object.fromEntries(data.entries.map((e) => [e.slug, e]));

  it("maps each export file to its kind", () => {
    const kinds = data.entries.map((e) => `${e.source.file}:${e.kind}`);
    expect(new Set(kinds)).toEqual(
      new Set([
        "Positions.csv:experience",
        "Projects.csv:project",
        "Education.csv:education",
        "Honors.csv:certification",
        "Volunteering.csv:experience",
        "credential:certification",
      ]),
    );
    expect(data.entries).toHaveLength(4 + 2 + 2 + 2 + 1 + 1);
  });

  it("slugs a single-position company by company alone, a repeated one by company + title", () => {
    expect(bySlug["acme"]).toBeDefined();
    expect(bySlug["program-org"]).toBeDefined();
    expect(bySlug["same-school-tutor"]).toBeDefined();
    expect(bySlug["same-school-mentor"]).toBeDefined();
    expect(new Set(data.entries.map((e) => e.slug)).size).toBe(data.entries.length);
  });

  it("treats an empty end date as current for experience and education only", () => {
    expect(bySlug["program-org"]).toMatchObject({ is_current: true, end_date: null });
    expect(bySlug["acme"]).toMatchObject({ is_current: false, end_date: "2026-08-01" });
    expect(bySlug["other-school"]).toMatchObject({ is_current: true, end_date: null });
    expect(bySlug["deans-list"]).toMatchObject({ is_current: false, start_date: null });
  });

  it("records date precision and the source file in metadata, never a fixture flag", () => {
    expect(bySlug["acme"].metadata).toMatchObject({
      source: { export: "linkedin", file: "Positions.csv" },
      date_precision: "month",
      location: "New York, NY",
    });
    expect(bySlug["foundations-course"].metadata).toMatchObject({
      date_precision: "day",
      category: "certification",
      credential_id: "abc123",
    });
    for (const e of data.entries) expect(e.metadata).not.toHaveProperty("fixture");
  });

  it("renders bullets as markdown and decodes entities in bodies", () => {
    expect(bySlug["program-org"].body).toBe("- Studied things.\n- Built a model.");
    expect(bySlug["same-school-bachelor-of-science-bs"].body).toBe(
      "Dean's List & more.\n\nActivities: Club A Club B",
    );
  });

  it("marks honors as awards with the issuer left for the owner", () => {
    expect(bySlug["some-scholarship"]).toMatchObject({
      kind: "certification",
      subtitle: null,
      start_date: "2024-08-01",
      metadata: { category: "award" },
    });
    expect(bySlug["some-scholarship"].review.join(" ")).toMatch(/subtitle/);
  });

  it("gives volunteering the volunteer facet and the supplement facet to its target only", () => {
    expect(bySlug["local-library-stocker"]).toMatchObject({ kind: "experience", facet: "volunteer" });
    expect(bySlug["program-org"].facet).toBe("research");
    expect(bySlug["acme"].facet).toBeNull();
    expect(bySlug["acme"].review.join(" ")).toMatch(/facet/);
  });

  it("leaves summary null and lists it for review on every entry", () => {
    for (const e of data.entries) {
      expect(e.summary).toBeNull();
      expect(e.review.join(" ")).toMatch(/summary/);
    }
  });

  it("emits links only for a real project URL and for the credential", () => {
    expect(data.links).toEqual([
      expect.objectContaining({ entry_id: bySlug["field-project"].id, url: "https://example.com/field", kind: "demo" }),
      expect.objectContaining({ entry_id: bySlug["foundations-course"].id, kind: "profile" }),
    ]);
  });

  it("resolves supplement relations to slugs: part_of from the spec, certifies from the credential", () => {
    expect(data.relations).toEqual([
      expect.objectContaining({ from_slug: "classifier-project", to_slug: "program-org", type: "part_of" }),
      expect.objectContaining({ from_slug: "foundations-course", to_slug: "program-org", type: "certifies" }),
    ]);
    expect(data.suggested).toEqual([
      expect.objectContaining({ from_slug: "field-project", to_slug: "acme", type: "part_of" }),
    ]);
  });

  it("is deterministic: ids and output are identical across runs", () => {
    expect(normalize(FILES, SUPPLEMENT)).toEqual(data);
  });

  it("keeps ids stable when a slug changes but the export row does not", () => {
    const before = normalize(FILES, EMPTY).entries.find((e) => e.source.key["Company Name"] === "Acme");
    const renamed = normalize(
      { ...FILES, "Positions.csv": POSITIONS.replace("Acme,Data Intern", "Acme,Data Intern") },
      EMPTY,
    ).entries.find((e) => e.source.key["Company Name"] === "Acme");
    expect(renamed?.id).toBe(before?.id);
  });

  it("appends the start year on a slug collision and throws on a second one", () => {
    const twice = `Title,Description,Url,Started On,Finished On
Same Name,a,,Jul 2026,
Same Name,b,,Jul 2025,
`;
    const slugs = normalize({ ...FILES, "Projects.csv": twice }, EMPTY).entries
      .filter((e) => e.kind === "project")
      .map((e) => e.slug);
    expect(slugs).toEqual(["same-name", "same-name-2025"]);
    const thrice = `${twice}Same Name,c,,Aug 2025,\n`;
    expect(() => normalize({ ...FILES, "Projects.csv": thrice }, EMPTY)).toThrow(/slug collision/);
  });

  it("throws when a supplement ref matches no row or several", () => {
    const bad: Supplement = {
      ...EMPTY,
      facets: [{ ref: { file: "Positions.csv", "Company Name": "Nobody" }, facet: "corporate", source: "t" }],
    };
    expect(() => normalize(FILES, bad)).toThrow(/matched 0 rows/);
    const ambiguous: Supplement = {
      ...EMPTY,
      facets: [{ ref: { file: "Positions.csv", "Company Name": "Same School" }, facet: "classroom", source: "t" }],
    };
    expect(() => normalize(FILES, ambiguous)).toThrow(/matched 2 rows/);
  });

  it("refuses a missing export file", () => {
    const rest: Record<string, string> = { ...FILES };
    delete rest["Honors.csv"];
    expect(() => normalize(rest, EMPTY)).toThrow(/missing Honors.csv/);
  });
});
