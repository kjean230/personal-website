import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  getEntryBySlug,
  getFacetCounts,
  listLinks,
  listSection,
  listTagGroups,
  listTrophies,
} from "../../lib/content/queries";
import { FACETS } from "../../lib/content/schema";
import { loadAll, loadEntry, loadResume, loadSection, type AllPage, type RouteQueries } from "../../lib/routes/load";
import { SECTIONS, entryHref, sectionForKind, sectionFromSegment } from "../../lib/routes/table";
import { awaitPostgrest, createPool, createTestClient } from "./harness";

// The route table (lib/routes, S5) over the migrated database, read the way
// production reads it — the S4 layer through supabase-js → PostgREST as
// `anon`. The brief §4.1 record is addressed by its fixed ids (slugs are
// looked up), and expected values are computed through the query layer
// itself, so the owner's seed edits do not break this file.

const CONTENT = {
  btt: "0e02f978-92d2-5be6-a19a-b0addaa5bc2c",
  project: "64517535-a8d4-5176-bd87-4617453a9a5b",
  certification: "d9a232aa-96f4-5577-817c-8ca40dbd8b18",
} as const;

const pool = createPool();
const client = createTestClient();
const queries: RouteQueries = {
  listSection: (kind, options) => listSection(kind, options, client),
  getFacetCounts: (kind) => getFacetCounts(kind, client),
  getEntryBySlug: (slug) => getEntryBySlug(slug, client),
  listTrophies: () => listTrophies(client),
  listLinks: () => listLinks(client),
  listTagGroups: () => listTagGroups(client),
};
const slug: Record<keyof typeof CONTENT, string> = { btt: "", project: "", certification: "" };

const section = (segment: string) => {
  const found = sectionFromSegment(segment);
  if (!found) throw new Error(`no section ${segment}`);
  return found;
};

beforeAll(async () => {
  const { rows } = await pool.query<{ id: string; slug: string }>(
    "select id, slug from public.entries where id = any($1::uuid[])",
    [Object.values(CONTENT)],
  );
  if (rows.length !== 3) {
    throw new Error("content rows missing — run `npm run db:apply` (migrations + both seeds) first");
  }
  for (const [key, id] of Object.entries(CONTENT) as [keyof typeof CONTENT, string][]) {
    slug[key] = rows.find((row) => row.id === id)!.slug;
  }
  await awaitPostgrest(pool);
});

afterAll(async () => {
  await pool.end();
});

describe("brief §4.1 through the route table — one record, three canonical URLs", () => {
  it("gives the experience, its project and its certification distinct URLs under three sections", async () => {
    const hrefs = {
      btt: `/experience/${slug.btt}`,
      project: `/projects/${slug.project}`,
      certification: `/certifications/${slug.certification}`,
    };
    for (const key of Object.keys(CONTENT) as (keyof typeof CONTENT)[]) {
      const detail = await getEntryBySlug(slug[key], client);
      expect(detail?.entry.id).toBe(CONTENT[key]);
      expect(entryHref(detail!.entry)).toBe(hrefs[key]);
    }
    expect(new Set(Object.values(hrefs)).size).toBe(3);
  });

  it("finds the experience at its canonical URL with both placements linked back as canonical URLs", async () => {
    const result = await loadEntry(section("experience"), slug.btt, queries);
    expect(result.kind).toBe("found");
    if (result.kind !== "found") return;
    expect(result.href).toBe(`/experience/${slug.btt}`);
    expect(result.detail.entry.id).toBe(CONTENT.btt);
    const incoming = result.related
      .filter((link) => link.direction === "incoming")
      .map((link) => [link.type, link.entry.id, link.href]);
    expect(incoming).toContainEqual(["part_of", CONTENT.project, `/projects/${slug.project}`]);
    expect(incoming).toContainEqual(["certifies", CONTENT.certification, `/certifications/${slug.certification}`]);
  });

  it("redirects the experience's slug reached under Projects or Certifications to its canonical URL", async () => {
    for (const segment of ["projects", "certifications"]) {
      expect(await loadEntry(section(segment), slug.btt, queries)).toEqual({
        kind: "redirect",
        href: `/experience/${slug.btt}`,
      });
    }
    expect(await loadEntry(section("experience"), slug.project, queries)).toEqual({
      kind: "redirect",
      href: `/projects/${slug.project}`,
    });
  });

  it("lists the experience once under Experience, the project under Projects, the certification in the trophy case", async () => {
    const experience = await loadSection(section("experience"), undefined, queries);
    expect(experience.entries.filter((row) => row.id === CONTENT.btt)).toHaveLength(1);
    const projects = await loadSection(section("projects"), undefined, queries);
    expect(projects.entries.map((row) => row.id)).toContain(CONTENT.project);
    expect(projects.entries.map((row) => row.id)).not.toContain(CONTENT.btt);
    const trophies = await loadSection(section("certifications"), undefined, queries);
    expect(trophies.entries.map((row) => row.id)).toContain(CONTENT.certification);
    expect(trophies.entries.map((row) => row.id)).not.toContain(CONTENT.btt);
  });
});

describe("section routes", () => {
  it("resolves every section with chips whose counts sum to All and match the query", async () => {
    for (const current of SECTIONS) {
      const page = await loadSection(current, undefined, queries);
      const expected = await Promise.all(current.kinds.map((kind) => getFacetCounts(kind, client)));
      const all = expected.reduce((sum, count) => sum + count.all, 0);
      expect(page.chips[0]).toMatchObject({ facet: null, count: all, href: `/${current.segment}`, active: true });
      expect(page.entries).toHaveLength(all);
      const faceted = page.chips.slice(1).reduce((sum, chip) => sum + chip.count, 0);
      const unfaceted = expected.reduce((sum, count) => sum + count.unfaceted, 0);
      expect(faceted + unfaceted).toBe(all);
      for (const chip of page.chips.slice(1)) {
        expect(chip.count).toBeGreaterThan(0);
        expect(chip.count).toBe(expected.reduce((sum, count) => sum + count.byFacet[chip.facet!], 0));
      }
      for (const row of page.entries) expect(sectionForKind(row.kind).segment).toBe(current.segment);
    }
  });

  it("narrows Experience to the research facet exactly as the query does", async () => {
    const page = await loadSection(section("experience"), "research", queries);
    const expected = await listSection("experience", { facet: "research" }, client);
    expect(page.entries.map((row) => row.id)).toEqual(expected.map((row) => row.id));
    expect(page.entries.map((row) => row.id)).toContain(CONTENT.btt);
    expect(page.chips.find((chip) => chip.facet === "research")).toMatchObject({
      count: expected.length,
      active: true,
    });
  });

  it("reads the trophy case through listTrophies", async () => {
    const page = await loadSection(section("certifications"), undefined, queries);
    const trophies = await listTrophies(client);
    expect(page.entries.map((row) => row.id)).toEqual(trophies.map((row) => row.id));
    for (const row of page.entries) expect(row.kind).toBe("certification");
  });

  it("is not-found for a slug no entry has", async () => {
    expect(await loadEntry(section("experience"), "no-such-slug", queries)).toEqual({ kind: "not-found" });
  });
});

// `/all` and its Groups (feat/shell-facets), over real rows: the fixture's four
// tags plus whatever the content seed holds. Expected values come from SQL.
describe("/all", () => {
  const found = async (filter: Parameters<typeof loadAll>[0]): Promise<AllPage> => {
    const result = await loadAll(filter, queries);
    if (result.kind !== "found") throw new Error("expected the index to be found");
    return result.page;
  };

  it("lists every entry once, with facet chips that match a SQL group-by across every kind", async () => {
    const page = await found({ kind: "none" });
    const { rows } = await pool.query<{ facet: string | null; n: number }>(
      "select facet, count(*)::int as n from public.entries group by facet",
    );
    const total = rows.reduce((sum, row) => sum + row.n, 0);
    expect(page.total).toBe(total);
    expect(page.entries).toHaveLength(total);
    expect(new Set(page.entries.map((row) => row.id)).size).toBe(total);
    expect(page.facets[0]).toMatchObject({ facet: null, count: total, href: "/all", active: true });
    const expected = FACETS.filter((facet) => rows.some((row) => row.facet === facet));
    expect(page.facets.slice(1).map((chip) => chip.facet)).toEqual(expected);
    for (const chip of page.facets.slice(1)) {
      expect(chip.count, String(chip.facet)).toBe(rows.find((row) => row.facet === chip.facet)?.n);
      expect(chip.href).toBe(`/all?facet=${chip.facet}`);
    }
  });

  it("narrows to one facet across kinds exactly as SQL does", async () => {
    const page = await found({ kind: "facet", facet: "research" });
    const { rows } = await pool.query<{ id: string; kind: string }>(
      "select id, kind from public.entries where facet = 'research'",
    );
    expect(new Set(page.entries.map((row) => row.id))).toEqual(new Set(rows.map((row) => row.id)));
    // Research is not one section's: the brief §4.1 record is an experience
    // with a child project, and both carry it.
    expect(new Set(rows.map((row) => row.kind)).size).toBeGreaterThan(1);
    expect(page.entries.map((row) => row.id)).toContain(CONTENT.btt);
  });

  it("offers a chip for every tag with entries, and each chip leads to exactly those entries", async () => {
    const { rows } = await pool.query<{ slug: string; category: string; entry_ids: string[] }>(
      `select t.slug, t.category, array_agg(et.entry_id::text) as entry_ids
         from public.tags t join public.entry_tags et on et.tag_id = t.id
        group by t.id`,
    );
    const page = await found({ kind: "none" });
    const chips = page.tags.flatMap((row) => row.chips.map((chip) => ({ ...chip, category: row.category })));
    expect(chips.map((chip) => chip.slug).sort()).toEqual(rows.map((row) => row.slug).sort());
    for (const row of rows) {
      const chip = chips.find((candidate) => candidate.slug === row.slug);
      expect(chip, row.slug).toMatchObject({ category: row.category, count: row.entry_ids.length, href: `/all?tag=${row.slug}` });
      const narrowed = await found({ kind: "tag", slug: row.slug });
      expect(new Set(narrowed.entries.map((entry) => entry.id)), row.slug).toEqual(new Set(row.entry_ids));
      expect(narrowed.tags.flatMap((group) => group.chips).filter((candidate) => candidate.active).map((c) => c.slug)).toEqual([
        row.slug,
      ]);
    }
  });

  it("is empty for a tag no entry carries, and not-found for a slug no tag has", async () => {
    // The fixture's team tag is attached to nothing (supabase/seed.sql).
    const empty = await found({ kind: "tag", slug: "fixture-team" });
    expect(empty.entries).toEqual([]);
    expect(empty.tags.flatMap((row) => row.chips).map((chip) => chip.slug)).not.toContain("fixture-team");
    expect(await loadAll({ kind: "tag", slug: "no-such-tag" }, queries)).toEqual({ kind: "not-found" });
  });
});

describe("/resume", () => {
  it("lists the four sections in resume order, each matching its query, with links grouped by entry", async () => {
    const page = await loadResume(queries);
    expect(page.sections.map((s) => s.label)).toEqual([
      "Experience",
      "Projects",
      "Education",
      "Certifications & awards",
    ]);

    const expected = [
      await listSection("experience", {}, client),
      await listSection("project", {}, client),
      await listSection("education", {}, client),
      await listTrophies(client),
    ];
    expect(page.sections.map((s) => s.entries.map((row) => row.entry.id))).toEqual(
      expected.map((rows) => rows.map((row) => row.id)),
    );

    // Every link the resume shows hangs off its own entry, and no link that
    // belongs to a listed entry is dropped on the way through the grouping.
    for (const section of page.sections) {
      for (const row of section.entries) {
        for (const link of row.links) expect(link.entry_id).toBe(row.entry.id);
      }
    }
    const listed = new Set(page.sections.flatMap((s) => s.entries.map((row) => row.entry.id)));
    const shown = page.sections.flatMap((s) => s.entries.flatMap((row) => row.links.map((l) => l.id)));
    const expectedLinks = (await listLinks(client)).filter((l) => listed.has(l.entry_id));
    expect(new Set(shown)).toEqual(new Set(expectedLinks.map((l) => l.id)));

    // Brief §4.1: the certification's one `profile` link is its credential.
    const certification = page.sections[3].entries.find((row) => row.entry.id === CONTENT.certification);
    expect(certification?.links.map((l) => l.kind)).toEqual(["profile"]);
  });
});
