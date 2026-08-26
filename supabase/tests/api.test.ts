import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  getEntryBySlug,
  getFacetCounts,
  listRelated,
  listSection,
  listTrophies,
} from "../../lib/content/queries";
import { ContentValidationError, ENTRY_COLUMNS, FACETS, KINDS } from "../../lib/content/schema";
import { awaitPostgrest, createPool, createTestClient } from "./harness";

// The query layer (lib/content) against the migrated database, read the way
// production reads it: supabase-js → PostgREST → Postgres as `anon`. Every
// assertion goes through the layer's public functions; `pg` is used only to
// compute the expected values in SQL and to plant the one malformed row.
//
// The brief §4.1 record is addressed by its fixed ids (they never change —
// slugs may, so they are looked up), and the expected counts are computed
// from the database, so the owner's pending seed edits do not break this
// file.

const CONTENT = {
  btt: "0e02f978-92d2-5be6-a19a-b0addaa5bc2c",
  project: "64517535-a8d4-5176-bd87-4617453a9a5b",
  certification: "d9a232aa-96f4-5577-817c-8ca40dbd8b18",
} as const;

/** A deliberately invalid row, committed for one test and removed again. */
const PROBE = {
  id: "00000000-0000-4000-8000-00000000f00d",
  slug: "api-probe-malformed",
} as const;

const pool = createPool();
const client = createTestClient();
const slug: Record<keyof typeof CONTENT, string> = { btt: "", project: "", certification: "" };

async function removeProbe(): Promise<void> {
  await pool.query("delete from public.entries where slug = $1 or id = $2", [PROBE.slug, PROBE.id]);
}

beforeAll(async () => {
  await removeProbe();
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
  await removeProbe();
  await pool.end();
});

describe("brief §4.1 — one record, three placements, through the query layer", () => {
  it("surfaces under Experience exactly once", async () => {
    const ids = (await listSection("experience", {}, client)).map((row) => row.id);
    expect(ids.filter((id) => id === CONTENT.btt)).toHaveLength(1);
  });

  it("surfaces under Projects through its child, whose part_of edge leads back to the one id", async () => {
    const projects = await listSection("project", {}, client);
    expect(projects.map((row) => row.id)).toContain(CONTENT.project);
    expect(projects.map((row) => row.id)).not.toContain(CONTENT.btt);
    const { outgoing } = await listRelated(CONTENT.project, client);
    const partOf = outgoing.filter((edge) => edge.type === "part_of");
    expect(partOf.map((edge) => edge.entry.id)).toEqual([CONTENT.btt]);
    expect(partOf[0].entry.kind).toBe("experience");
  });

  it("surfaces in the trophy case through the certification, whose certifies edge leads back to the one id", async () => {
    const trophies = await listTrophies(client);
    const trophy = trophies.find((row) => row.id === CONTENT.certification);
    expect(trophy).toMatchObject({ kind: "certification", status: "unlocked" });
    expect(trophy?.metadata.category).toBe("certification");
    expect(trophies.map((row) => row.id)).not.toContain(CONTENT.btt);
    const { outgoing } = await listRelated(CONTENT.certification, client);
    expect(outgoing.filter((edge) => edge.type === "certifies").map((edge) => edge.entry.id)).toEqual([
      CONTENT.btt,
    ]);
  });

  it("is one record: the detail carries both incoming edges and every placement resolves to the same id", async () => {
    const detail = await getEntryBySlug(slug.btt, client);
    expect(detail).not.toBeNull();
    expect(detail!.entry).toMatchObject({ id: CONTENT.btt, kind: "experience", facet: "research", is_current: true });
    const incoming = detail!.relations.incoming.map((edge) => [edge.type, edge.entry.id]);
    expect(incoming).toContainEqual(["part_of", CONTENT.project]);
    expect(incoming).toContainEqual(["certifies", CONTENT.certification]);
    expect(new Set(detail!.relations.incoming.map((edge) => edge.entry.id)).size).toBe(
      detail!.relations.incoming.length,
    );
    const placements = [
      (await listSection("experience", {}, client)).find((row) => row.id === CONTENT.btt)?.id,
      (await listRelated(CONTENT.project, client)).outgoing.find((edge) => edge.type === "part_of")?.entry.id,
      (await listRelated(CONTENT.certification, client)).outgoing.find((edge) => edge.type === "certifies")?.entry
        .id,
    ];
    expect(new Set(placements)).toEqual(new Set([CONTENT.btt]));
  });

  it("gives the certification its credential link, and nothing else links out of the record", async () => {
    const detail = await getEntryBySlug(slug.certification, client);
    expect(detail?.links).toHaveLength(1);
    expect(detail?.links[0]).toMatchObject({ kind: "profile", entry_id: CONTENT.certification });
    expect(detail?.links[0].url).toMatch(/^https:\/\//);
    expect(detail?.relations.outgoing.map((edge) => edge.type)).toEqual(["certifies"]);
  });
});

describe("tile row", () => {
  it("orders by featured, sort_weight, most recent start (nulls last), title — the recency index", async () => {
    for (const kind of ["experience", "certification"] as const) {
      const { rows } = await pool.query<{ id: string }>(
        `select id from public.entries where kind = $1
          order by featured desc, sort_weight desc, start_date desc nulls last, title asc, slug asc`,
        [kind],
      );
      const tiles = await listSection(kind, {}, client);
      expect(tiles.map((row) => row.id)).toEqual(rows.map((row) => row.id));
      expect(tiles.every((row) => !("body" in row))).toBe(true);
    }
  });

  it("narrows to one facet, or to the rows without one", async () => {
    const research = await listSection("experience", { facet: "research" }, client);
    expect(research.length).toBeGreaterThan(0);
    expect(research.every((row) => row.facet === "research")).toBe(true);
    const unfaceted = await listSection("experience", { facet: null }, client);
    expect(unfaceted.every((row) => row.facet === null)).toBe(true);
    const all = await listSection("experience", {}, client);
    expect(all.length).toBeGreaterThanOrEqual(research.length + unfaceted.length);
  });

  it("validates every row of both seeds: the kind enum covers the whole table", async () => {
    let total = 0;
    for (const kind of KINDS) total += (await listSection(kind, {}, client)).length;
    const { rows } = await pool.query<{ n: number }>("select count(*)::int as n from public.entries");
    expect(total).toBe(rows[0].n);
  });
});

describe("facet counts", () => {
  it("match a SQL group-by for every kind, null facet included", async () => {
    for (const kind of KINDS) {
      const { rows } = await pool.query<{ facet: string | null; n: number }>(
        "select facet, count(*)::int as n from public.entries where kind = $1 group by facet",
        [kind],
      );
      const expected = {
        all: rows.reduce((sum, row) => sum + row.n, 0),
        byFacet: Object.fromEntries(FACETS.map((facet) => [facet, rows.find((row) => row.facet === facet)?.n ?? 0])),
        unfaceted: rows.find((row) => row.facet === null)?.n ?? 0,
      };
      expect(await getFacetCounts(kind, client)).toEqual(expected);
    }
  });
});

describe("trophy case", () => {
  it("holds certifications and awards as one kind, telling them apart by category", async () => {
    const trophies = await listTrophies(client);
    const { rows } = await pool.query<{ category: string; n: number }>(
      `select coalesce(metadata->>'category', 'certification') as category, count(*)::int as n
         from public.entries where kind = 'certification' group by 1`,
    );
    for (const { category, n } of rows) {
      expect(trophies.filter((trophy) => trophy.metadata.category === category)).toHaveLength(n);
    }
    expect(trophies.every((trophy) => ["unlocked", "in_progress", "archived"].includes(trophy.status))).toBe(true);
  });
});

describe("boundary", () => {
  it("returns null for an unknown slug", async () => {
    expect(await getEntryBySlug("no-such-entry-slug", client)).toBeNull();
  });

  it("reads as anon: raw reactions are denied (42501) while the aggregate view is readable", async () => {
    const raw = await client.from("reactions").select("*").limit(1);
    expect(raw.error?.code).toBe("42501");
    const counts = await client.from("reaction_counts").select("*").limit(1);
    expect(counts.error).toBeNull();
    const write = await client.from("entries").insert({ kind: "experience", slug: "anon-write-probe", title: "x" });
    expect(write.error?.code).toBe("42501");
  });

  it("knows every column of entries, in order", async () => {
    const { rows } = await pool.query<{ column_name: string }>(
      `select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'entries' order by ordinal_position`,
    );
    expect(rows.map((row) => row.column_name)).toEqual([...ENTRY_COLUMNS]);
  });

  it("fails loudly on a malformed row instead of dropping it from the trophy case", async () => {
    await pool.query(
      `insert into public.entries (id, kind, slug, title, status, metadata)
       values ($1, 'certification', $2, 'API probe (malformed metadata)', 'unlocked', '{"category":"medal"}')`,
      [PROBE.id, PROBE.slug],
    );
    try {
      await expect(listTrophies(client)).rejects.toThrow(ContentValidationError);
      await expect(listTrophies(client)).rejects.toThrow(PROBE.slug);
    } finally {
      await removeProbe();
    }
    expect((await listTrophies(client)).map((row) => row.slug)).not.toContain(PROBE.slug);
  });
});
