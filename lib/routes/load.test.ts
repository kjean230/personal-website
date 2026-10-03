import { describe, expect, it, vi } from "vitest";
import { ContentQueryError, type EntryDetail, type FacetCounts, type Trophy } from "../content/queries";
import { FACETS, KINDS, type EntrySummary, type Facet, type Kind, type Link } from "../content/schema";
import { loadAll, loadEntry, loadResume, loadSection, loadSitemap, loadTrophies, type RouteQueries } from "./load";
import { ADMIN_HREF, ALL_HREF, PRIVACY_HREF, SECTIONS, entryHref, sectionFromSegment, sectionHref } from "./table";

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

// `/all` — brief §5's "full searchable index of every entry"
// (feat/shell-tile-grid). The search contract is the owner's: title, subtitle
// and summary; case-insensitive; every word must appear; nothing is ranked.
describe("loadAll", () => {
  const btt = tile({
    kind: "experience",
    slug: "break-through-tech",
    title: "AI Fellow",
    subtitle: "Break Through Tech",
    summary: "A year of machine learning coursework and an industry project.",
    featured: true,
  });
  const guardian = tile({
    kind: "experience",
    slug: "guardian",
    title: "Data Engineering Intern",
    subtitle: "Guardian",
    start_date: "2025-06-01",
  });
  const classifier = tile({
    kind: "project",
    slug: "superhost-classifier",
    title: "Superhost classifier",
    summary: "Predicts host status from listing data.",
    start_date: "2024-09-01",
  });
  const cert = tile({
    kind: "certification",
    slug: "ml-foundations",
    title: "Machine Learning Foundations",
    subtitle: "eCornell",
    start_date: "2024-08-01",
  });
  const degree = tile({ kind: "education", slug: "degree", title: "B.S. Computer Science", sort_weight: 5 });
  const team = tile({ kind: "interest", slug: "team", title: "A followed team" });
  const byKind: Record<Kind, EntrySummary[]> = {
    experience: [btt, guardian],
    project: [classifier],
    certification: [cert],
    education: [degree],
    hobby: [],
    interest: [team],
    post: [],
  };
  const queries = (): RouteQueries => ({
    listSection: vi.fn(async (kind: Kind) => byKind[kind]),
    getFacetCounts: unused,
    getEntryBySlug: unused,
    listTrophies: unused,
    listLinks: unused,
  });
  const slugs = async (query: string) => (await loadAll(query, queries())).entries.map((entry) => entry.slug);

  it("lists every entry of every kind once, in tile order across kinds", async () => {
    const page = await loadAll("", queries());
    // featured, then owner weight, then most recent start, then title — the
    // order a section uses, applied to the whole site.
    expect(page.entries.map((entry) => entry.slug)).toEqual([
      "break-through-tech",
      "degree",
      "guardian",
      "superhost-classifier",
      "ml-foundations",
      "team",
    ]);
    expect(page.total).toBe(6);
    expect(page.query).toBe("");
    expect(new Set(page.entries.map((entry) => entry.id + entry.slug)).size).toBe(page.entries.length);
  });

  it("reads each kind once, through the route table, and nothing else", async () => {
    const fake = queries();
    await loadAll("guardian", fake);
    expect(fake.listSection).toHaveBeenCalledTimes(KINDS.length);
    expect(new Set(vi.mocked(fake.listSection).mock.calls.map(([kind]) => kind))).toEqual(new Set(KINDS));
    // The search never reaches the query layer: every call is the plain list.
    for (const [, options] of vi.mocked(fake.listSection).mock.calls) expect(options).toEqual({});
  });

  it("gives every result a real URL from the route table", async () => {
    const page = await loadAll("", queries());
    expect(page.entries.map((entry) => entryHref(entry))).toEqual([
      "/experience/break-through-tech",
      "/education/degree",
      "/experience/guardian",
      "/projects/superhost-classifier",
      "/certifications/ml-foundations",
      "/hobbies/team",
    ]);
  });

  it("matches the title, the subtitle and the summary", async () => {
    expect(await slugs("fellow")).toEqual(["break-through-tech"]);
    expect(await slugs("ecornell")).toEqual(["ml-foundations"]);
    expect(await slugs("listing")).toEqual(["superhost-classifier"]);
  });

  it("ignores case, in the search and in the entry", async () => {
    expect(await slugs("GUARDIAN")).toEqual(["guardian"]);
    expect(await slugs("break through TECH")).toEqual(["break-through-tech"]);
  });

  it("requires every word, wherever each one appears", async () => {
    // "machine" is in two entries; "foundations" in one of them.
    expect(await slugs("machine")).toEqual(["break-through-tech", "ml-foundations"]);
    expect(await slugs("machine foundations")).toEqual(["ml-foundations"]);
    // One word from the title, one from the summary.
    expect(await slugs("fellow industry")).toEqual(["break-through-tech"]);
    expect(await slugs("machine guardian")).toEqual([]);
  });

  it("matches part of a word", async () => {
    expect(await slugs("class")).toEqual(["superhost-classifier"]);
  });

  // Not the slug, the kind, the section name or the facet: none of them is
  // one of the three fields, and a row matching on text it does not show
  // would be a match the visitor cannot see.
  it("matches nothing outside those three fields", async () => {
    expect(await slugs("superhost-classifier")).toEqual([]);
    expect(await slugs("certification")).toEqual([]);
    expect(await slugs("hobbies")).toEqual([]);
  });

  it("keeps a match in its place rather than ranking it", async () => {
    // "e" is in all six; the order is the unsearched order.
    expect(await slugs("e")).toEqual(await slugs(""));
  });

  it("returns no rows, and still the total, when nothing matches", async () => {
    const page = await loadAll("zzz", queries());
    expect(page.entries).toEqual([]);
    expect(page.total).toBe(6);
    expect(page.query).toBe("zzz");
  });

  it("treats characters with a meaning elsewhere as plain text", async () => {
    for (const query of ["%", "_", ".*", "(", "a,b", "\\"]) expect(await slugs(query), query).toEqual([]);
    expect(await slugs("b.s.")).toEqual(["degree"]);
  });

  it("is empty, not an error, when the site has no entries", async () => {
    const empty: RouteQueries = { ...queries(), listSection: async () => [] };
    expect(await loadAll("", empty)).toEqual({ query: "", total: 0, entries: [] });
  });

  it("lets a query error through untouched", async () => {
    const failure = new ContentQueryError("listSection(project)", {
      message: "boom",
      code: "500",
      details: "",
      hint: "",
    });
    const fake: RouteQueries = {
      ...queries(),
      listSection: async (kind: Kind) => {
        if (kind === "project") throw failure;
        return byKind[kind];
      },
    };
    await expect(loadAll("", fake)).rejects.toBe(failure);
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

describe("loadSitemap", () => {
  // One fixture per shape that matters: a two-kind section (hobbies), an
  // entry-less section (now), and a section whose list is not already in tile
  // order when merged (hobbies again: the interest outranks the hobby).
  const guardian = tile({ kind: "experience", slug: "guardian", updated_at: "2026-09-01T10:00:00+00:00" });
  const btt = tile({ kind: "experience", slug: "break-through-tech", featured: true });
  const project = tile({ kind: "project", slug: "sample-project", updated_at: "2026-08-30T12:34:56.789+00:00" });
  const cert = tile({ kind: "certification", slug: "sample-credential" });
  const degree = tile({ kind: "education", slug: "sample-degree" });
  const hobby = tile({ kind: "hobby", slug: "sample-hobby" });
  const team = tile({ kind: "interest", slug: "sample-team", sort_weight: 5 });
  const byKind: Record<Kind, EntrySummary[]> = {
    experience: [btt, guardian],
    project: [project],
    certification: [cert],
    education: [degree],
    hobby: [hobby],
    interest: [team],
    post: [],
  };
  const queries = (): RouteQueries => ({
    listSection: vi.fn(async (kind: Kind) => byKind[kind]),
    getFacetCounts: unused,
    getEntryBySlug: unused,
    listTrophies: unused,
    listLinks: unused,
  });

  it("lists /, /resume, /all, then every section followed by its entries in tile order", async () => {
    const urls = await loadSitemap(queries());
    expect(urls.map((url) => url.path)).toEqual([
      "/",
      "/resume",
      "/all",
      "/experience",
      "/experience/break-through-tech",
      "/experience/guardian",
      "/projects",
      "/projects/sample-project",
      "/certifications",
      "/certifications/sample-credential",
      "/education",
      "/education/sample-degree",
      "/hobbies",
      "/hobbies/sample-team",
      "/hobbies/sample-hobby",
      "/now",
    ]);
  });

  // S5's rule, restated for this URL: adding a section is one SECTIONS entry.
  // Nothing in the sitemap is typed out, so every section and every entry's
  // canonical URL must come from the route table.
  it("is exactly the route table's sections and canonical entry URLs, with no duplicates", async () => {
    const paths = (await loadSitemap(queries())).map((url) => url.path);
    const entries = Object.values(byKind).flat().map((entry) => entryHref(entry));
    expect(new Set(paths)).toEqual(
      new Set(["/", "/resume", ALL_HREF, ...SECTIONS.map((s) => sectionHref(s)), ...entries]),
    );
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("never lists a facet view, a search or a reserved route", async () => {
    const paths = (await loadSitemap(queries())).map((url) => url.path);
    expect(paths.filter((path) => path.includes("?"))).toEqual([]);
    expect(paths).not.toContain(PRIVACY_HREF);
    expect(paths).not.toContain(ADMIN_HREF);
  });

  it("reads each kind once, through the route table, and nothing else", async () => {
    const fake = queries();
    await loadSitemap(fake);
    expect(fake.listSection).toHaveBeenCalledTimes(KINDS.length);
    expect(new Set(vi.mocked(fake.listSection).mock.calls.map(([kind]) => kind))).toEqual(new Set(KINDS));
    for (const [, options] of vi.mocked(fake.listSection).mock.calls) expect(options).toEqual({});
  });

  // lastModified is only written where the database records it: an entry's
  // updated_at, verbatim. The home, resume, index and section URLs have no
  // such fact and get none, rather than an invented one.
  it("dates entries by their updated_at and nothing else", async () => {
    const urls = await loadSitemap(queries());
    const dated = Object.fromEntries(urls.map((url) => [url.path, url.lastModified]));
    expect(dated["/experience/guardian"]).toBe("2026-09-01T10:00:00+00:00");
    expect(dated["/projects/sample-project"]).toBe("2026-08-30T12:34:56.789+00:00");
    for (const path of ["/", "/resume", ALL_HREF, ...SECTIONS.map((s) => sectionHref(s))]) {
      expect(urls.find((url) => url.path === path)).toEqual({ path });
    }
  });

  it("lets a query error through untouched", async () => {
    const failure = new ContentQueryError("listSection(project)", {
      message: "boom",
      code: "500",
      details: "",
      hint: "",
    });
    const fake: RouteQueries = {
      ...queries(),
      listSection: async (kind: Kind) => {
        if (kind === "project") throw failure;
        return byKind[kind];
      },
    };
    await expect(loadSitemap(fake)).rejects.toBe(failure);
  });
});
