import { describe, expect, it, vi } from "vitest";
import { ContentQueryError, type EntryDetail, type FacetCounts, type Trophy } from "../content/queries";
import { FACETS, type EntrySummary, type Facet, type Kind, type Link } from "../content/schema";
import { loadEntry, loadResume, loadSection, loadTrophies, type RouteQueries } from "./load";
import { sectionFromSegment } from "./table";

// The loaders bind URLs to the S4 query contract. Every query here is a fake
// (no network, no environment): the tests pin what a page receives for each
// route shape — chips with live counts, recency-ordered rows, and the
// found / redirect / not-found decision for an entry URL.

const tile = (overrides: Partial<EntrySummary> & { kind: Kind; slug: string }): EntrySummary =>
  ({
    id: "00000000-0000-4000-8000-000000000000",
    facet: null,
    title: overrides.slug,
    subtitle: null,
    summary: null,
    start_date: null,
    end_date: null,
    is_current: false,
    status: "unlocked",
    icon_asset: null,
    accent_color: null,
    featured: false,
    sort_weight: 0,
    metadata: {},
    created_at: "2026-08-27T00:00:00+00:00",
    updated_at: "2026-08-27T00:00:00+00:00",
    ...overrides,
  }) as EntrySummary;

const counts = (partial: Partial<Record<Facet, number>>, unfaceted = 0): FacetCounts => {
  const byFacet = Object.fromEntries(FACETS.map((facet) => [facet, partial[facet] ?? 0])) as Record<
    Facet,
    number
  >;
  return { all: Object.values(byFacet).reduce((a, b) => a + b, 0) + unfaceted, byFacet, unfaceted };
};

const detailOf = (
  entry: EntrySummary,
  relations: EntryDetail["relations"] = { outgoing: [], incoming: [] },
): EntryDetail => ({
  entry: { ...entry, body: null } as EntryDetail["entry"],
  links: [],
  media: [],
  tags: [],
  relations,
});

const unused = () => Promise.reject(new Error("query not expected on this route"));

const section = (segment: string) => {
  const found = sectionFromSegment(segment);
  if (!found) throw new Error(`no section ${segment}`);
  return found;
};

describe("loadSection", () => {
  const guardian = tile({ kind: "experience", slug: "guardian", facet: "corporate", featured: true });
  const btt = tile({ kind: "experience", slug: "break-through-tech", facet: "research" });

  it("lists one kind with All plus the non-empty facets, counts from the query, All active", async () => {
    const queries: RouteQueries = {
      listSection: vi.fn(async () => [guardian, btt]),
      getFacetCounts: vi.fn(async () => counts({ corporate: 1, research: 4, classroom: 3 }, 2)),
      getEntryBySlug: unused,
      listTrophies: unused,
      listLinks: unused,
    };
    const page = await loadSection(section("experience"), undefined, queries);
    expect(queries.listSection).toHaveBeenCalledWith("experience", { facet: undefined });
    expect(queries.getFacetCounts).toHaveBeenCalledWith("experience");
    expect(page.entries).toEqual([guardian, btt]);
    expect(page.chips).toEqual([
      { facet: null, label: "All", count: 10, href: "/experience", active: true },
      { facet: "corporate", label: "Corporate", count: 1, href: "/experience?facet=corporate", active: false },
      { facet: "research", label: "Research", count: 4, href: "/experience?facet=research", active: false },
      { facet: "classroom", label: "Classroom", count: 3, href: "/experience?facet=classroom", active: false },
    ]);
  });

  it("narrows to one facet and marks its chip active", async () => {
    const queries: RouteQueries = {
      listSection: vi.fn(async () => [btt]),
      getFacetCounts: vi.fn(async () => counts({ corporate: 1, research: 4 })),
      getEntryBySlug: unused,
      listTrophies: unused,
      listLinks: unused,
    };
    const page = await loadSection(section("experience"), "research", queries);
    expect(queries.listSection).toHaveBeenCalledWith("experience", { facet: "research" });
    expect(page.facet).toBe("research");
    expect(page.entries).toEqual([btt]);
    expect(page.chips.map((chip) => [chip.facet, chip.active])).toEqual([
      [null, false],
      ["corporate", false],
      ["research", true],
    ]);
  });

  it("shows only the All chip for an empty section, and no rows", async () => {
    const queries: RouteQueries = {
      listSection: async () => [],
      getFacetCounts: async () => counts({}),
      getEntryBySlug: unused,
      listTrophies: unused,
      listLinks: unused,
    };
    const page = await loadSection(section("now"), undefined, queries);
    expect(page.entries).toEqual([]);
    expect(page.chips).toEqual([{ facet: null, label: "All", count: 0, href: "/now", active: true }]);
  });

  it("merges a two-kind section in tile order and sums its counts", async () => {
    const older = tile({ kind: "hobby", slug: "basketball", start_date: "2020-01-01" });
    const newer = tile({ kind: "interest", slug: "knicks", start_date: "2024-01-01" });
    const pinned = tile({ kind: "hobby", slug: "music", featured: true });
    const queries: RouteQueries = {
      listSection: async (kind) => (kind === "hobby" ? [pinned, older] : [newer]),
      getFacetCounts: async (kind) => (kind === "hobby" ? counts({ volunteer: 1 }, 1) : counts({ volunteer: 2 })),
      getEntryBySlug: unused,
      listTrophies: unused,
      listLinks: unused,
    };
    const page = await loadSection(section("hobbies"), undefined, queries);
    expect(page.entries.map((row) => row.slug)).toEqual(["music", "knicks", "basketball"]);
    expect(page.chips).toEqual([
      { facet: null, label: "All", count: 4, href: "/hobbies", active: true },
      { facet: "volunteer", label: "Volunteer", count: 3, href: "/hobbies?facet=volunteer", active: false },
    ]);
  });

  it("reads the trophy case through listTrophies and narrows the facet in code", async () => {
    const award = tile({ kind: "certification", slug: "deans-list", facet: "classroom" }) as Trophy;
    const cert = tile({ kind: "certification", slug: "machine-learning-foundations" }) as Trophy;
    const queries: RouteQueries = {
      listSection: unused,
      getFacetCounts: async () => counts({ classroom: 1 }, 1),
      getEntryBySlug: unused,
      listTrophies: vi.fn(async () => [award, cert]),
      listLinks: unused,
    };
    const all = await loadSection(section("certifications"), undefined, queries);
    expect(all.entries).toEqual([award, cert]);
    const narrowed = await loadSection(section("certifications"), "classroom", queries);
    expect(narrowed.entries).toEqual([award]);
    expect(narrowed.chips.map((chip) => chip.href)).toEqual([
      "/certifications",
      "/certifications?facet=classroom",
    ]);
    expect(await loadTrophies("classroom", queries)).toEqual([award]);
    expect(await loadTrophies(undefined, queries)).toEqual([award, cert]);
  });

  it("lets a query error through untouched", async () => {
    const failure = new ContentQueryError("listSection(experience)", {
      message: "boom",
      code: "500",
      details: "",
      hint: "",
    });
    const queries: RouteQueries = {
      listSection: async () => {
        throw failure;
      },
      getFacetCounts: async () => counts({}),
      getEntryBySlug: unused,
      listTrophies: unused,
      listLinks: unused,
    };
    await expect(loadSection(section("experience"), undefined, queries)).rejects.toBe(failure);
  });
});

describe("loadEntry", () => {
  const btt = tile({ kind: "experience", slug: "break-through-tech", facet: "research" });
  const project = tile({ kind: "project", slug: "airbnb-superhost-classifier" });
  const certification = tile({ kind: "certification", slug: "machine-learning-foundations" });

  const queriesFor = (detail: EntryDetail | null): RouteQueries => ({
    listSection: unused,
    getFacetCounts: unused,
    getEntryBySlug: vi.fn(async () => detail),
    listTrophies: unused,
    listLinks: unused,
  });

  it("is not-found when no entry has the slug", async () => {
    const queries = queriesFor(null);
    expect(await loadEntry(section("experience"), "no-such-slug", queries)).toEqual({ kind: "not-found" });
    expect(queries.getEntryBySlug).toHaveBeenCalledWith("no-such-slug");
  });

  it("redirects a slug reached under the wrong section to its canonical URL", async () => {
    const result = await loadEntry(section("projects"), btt.slug, queriesFor(detailOf(btt)));
    expect(result).toEqual({ kind: "redirect", href: "/experience/break-through-tech" });
  });

  it("finds the entry under its own section, with every edge as a canonical link", async () => {
    const detail = detailOf(btt, {
      outgoing: [],
      incoming: [
        { type: "certifies", entry: certification },
        { type: "part_of", entry: project },
      ],
    });
    const result = await loadEntry(section("experience"), btt.slug, queriesFor(detail));
    expect(result.kind).toBe("found");
    if (result.kind !== "found") return;
    expect(result.href).toBe("/experience/break-through-tech");
    expect(result.section.segment).toBe("experience");
    expect(result.detail).toBe(detail);
    expect(result.related).toEqual([
      {
        type: "certifies",
        direction: "incoming",
        entry: certification,
        href: "/certifications/machine-learning-foundations",
      },
      { type: "part_of", direction: "incoming", entry: project, href: "/projects/airbnb-superhost-classifier" },
    ]);
  });

  it("lists outgoing edges before incoming ones", async () => {
    const detail = detailOf(project, {
      outgoing: [{ type: "part_of", entry: btt }],
      incoming: [{ type: "related_to", entry: certification }],
    });
    const result = await loadEntry(section("projects"), project.slug, queriesFor(detail));
    if (result.kind !== "found") throw new Error(result.kind);
    expect(result.related.map((link) => [link.direction, link.type, link.href])).toEqual([
      ["outgoing", "part_of", "/experience/break-through-tech"],
      ["incoming", "related_to", "/certifications/machine-learning-foundations"],
    ]);
  });
});

describe("loadResume", () => {
  // `tile()` gives every fake row the same id and the resume groups links by
  // `entry_id`, so distinct ids are what make the grouping assertions mean
  // anything — with the default id every link would land on every entry.
  const entryId = (n: number) => `00000000-0000-4000-8000-00000000010${n}`;
  const guardian = tile({ kind: "experience", slug: "guardian", id: entryId(1) });
  const classifier = tile({ kind: "project", slug: "airbnb-superhost-classifier", id: entryId(2) });
  const degree = tile({ kind: "education", slug: "fordham-cs", id: entryId(3) });
  const cert = tile({ kind: "certification", slug: "machine-learning-foundations", id: entryId(4) }) as Trophy;

  const link = (n: number, entry: EntrySummary, label: string): Link => ({
    id: `00000000-0000-4000-8000-00000000020${n}`,
    entry_id: entry.id,
    label,
    url: "https://example.com/credential",
    kind: "profile",
  });

  const queriesWith = (links: Link[], education: EntrySummary[] = [degree]): RouteQueries => ({
    listSection: vi.fn(async (kind: Kind) => {
      if (kind === "experience") return [guardian];
      if (kind === "project") return [classifier];
      return education;
    }),
    getFacetCounts: unused,
    getEntryBySlug: unused,
    listTrophies: vi.fn(async () => [cert]),
    listLinks: vi.fn(async () => links),
  });

  it("lists the four sections in resume order, reading the trophy case for the last", async () => {
    const queries = queriesWith([]);
    const page = await loadResume(queries);
    expect(page.sections.map((s) => [s.id, s.label])).toEqual([
      ["experience", "Experience"],
      ["projects", "Projects"],
      ["education", "Education"],
      ["certifications", "Certifications & awards"],
    ]);
    expect(page.sections.map((s) => s.entries.map((row) => row.entry.slug))).toEqual([
      ["guardian"],
      ["airbnb-superhost-classifier"],
      ["fordham-cs"],
      ["machine-learning-foundations"],
    ]);
    expect(queries.listSection).toHaveBeenCalledTimes(3);
    for (const kind of ["experience", "project", "education"] as const) {
      expect(queries.listSection).toHaveBeenCalledWith(kind, {});
    }
    expect(queries.listTrophies).toHaveBeenCalledTimes(1);
  });

  it("attaches each entry's own links from the one listLinks call", async () => {
    const credential = link(1, cert, "View credential");
    const repo = link(2, classifier, "Repository");
    const page = await loadResume(queriesWith([repo, credential]));
    const byEntry = Object.fromEntries(
      page.sections.flatMap((s) => s.entries.map((row) => [row.entry.slug, row.links])),
    );
    expect(byEntry["machine-learning-foundations"]).toEqual([credential]);
    expect(byEntry["airbnb-superhost-classifier"]).toEqual([repo]);
    expect(byEntry.guardian).toEqual([]);
    expect(byEntry["fordham-cs"]).toEqual([]);
  });

  it("keeps every link of an entry that has more than one, in the order the query returned", async () => {
    const first = link(3, guardian, "Company");
    const second = link(4, guardian, "Profile");
    const page = await loadResume(queriesWith([first, second]));
    expect(page.sections[0].entries[0].links).toEqual([first, second]);
  });

  it("keeps an empty section, so the page still renders its heading", async () => {
    const page = await loadResume(queriesWith([], []));
    expect(page.sections).toHaveLength(4);
    expect(page.sections[2]).toEqual({ id: "education", label: "Education", entries: [] });
  });
});
