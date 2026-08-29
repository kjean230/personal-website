/**
 * Content seed tests (S3). Run with `npm run db:test` against a database
 * that `npm run db:apply` has migrated and seeded with both seed files.
 *
 * supabase/seed.content.sql is the real, owner-edited content. This file
 * pins the one thing the spine depends on it for: the brief §4.1 Break
 * Through Tech record — one experience row that surfaces in Experience,
 * in Projects (via `part_of`), and in the trophy case (via `certifies`)
 * with zero duplication — plus the seed's own contract: idempotent, never
 * flagged as fixture data, and loud when a relation names a missing slug.
 *
 * Rows are addressed by their fixed ids (the seed's stable handles), never
 * by slug or title, which the owner is expected to edit before S6.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const DEFAULT_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

const CONTENT = {
  btt: "0e02f978-92d2-5be6-a19a-b0addaa5bc2c", // Positions.csv: Break Through Tech · AI/ML Cornell Tech Fellow
  bttProject: "64517535-a8d4-5176-bd87-4617453a9a5b", // Projects.csv: Airbnb Superhost Classifier
  bttCertification: "d9a232aa-96f4-5577-817c-8ca40dbd8b18", // credential bgjKUexFfN: Machine Learning Foundations
} as const;

const SEED_FILE = fileURLToPath(new URL("../seed.content.sql", import.meta.url));

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? DEFAULT_URL,
  max: 2,
});

/** Runs `fn` as the anon Data API role inside a rolled-back transaction. */
async function asAnon<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ role: "anon" }),
    ]);
    await client.query("set local role anon");
    return await fn(client);
  } finally {
    await client.query("rollback").catch(() => undefined);
    client.release();
  }
}

/** Runs `fn` as the database owner inside a rolled-back transaction. */
async function inRolledBackTx<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    return await fn(client);
  } finally {
    await client.query("rollback").catch(() => undefined);
    client.release();
  }
}

async function counts(client: pg.PoolClient) {
  const { rows } = await client.query(
    `select (select count(*) from public.entries)::int as entries,
            (select count(*) from public.entry_relations)::int as relations,
            (select count(*) from public.links)::int as links,
            (select max(updated_at) from public.entries) as last_update`,
  );
  return rows[0];
}

beforeAll(async () => {
  const { rows } = await pool.query(
    "select count(*)::int as n from public.entries where metadata->'source'->>'export' = 'linkedin'",
  );
  if (rows[0].n === 0) {
    throw new Error(
      "no content rows — run `npm run db:apply` (migrations + both seeds) first",
    );
  }
});

afterAll(async () => {
  await pool.end();
});

describe("brief §4.1 — the real Break Through Tech record", () => {
  it("is one experience row with facet research", async () => {
    const { rows } = await pool.query(
      "select kind, facet, is_current from public.entries where id = $1",
      [CONTENT.btt],
    );
    expect(rows).toEqual([{ kind: "experience", facet: "research", is_current: true }]);
  });

  it("surfaces under Experience by kind", async () => {
    await asAnon(async (c) => {
      const { rows } = await c.query("select id from public.entries where kind = 'experience'");
      expect(rows.map((r) => r.id)).toContain(CONTENT.btt);
    });
  });

  it("surfaces under Projects through a part_of child that is itself a project", async () => {
    await asAnon(async (c) => {
      const { rows } = await c.query(
        `select e.id, e.kind
           from public.entries e
           join public.entry_relations r on r.from_entry_id = e.id and r.relation_type = 'part_of'
          where r.to_entry_id = $1`,
        [CONTENT.btt],
      );
      expect(rows).toContainEqual({ id: CONTENT.bttProject, kind: "project" });
      expect(rows.every((r) => r.kind === "project")).toBe(true);
    });
  });

  it("surfaces in the trophy case through exactly one unlocked certification, with its credential link", async () => {
    await asAnon(async (c) => {
      const { rows } = await c.query(
        `select e.id, e.status, e.metadata->>'category' as category
           from public.entries e
           join public.entry_relations r on r.from_entry_id = e.id and r.relation_type = 'certifies'
          where e.kind = 'certification' and r.to_entry_id = $1`,
        [CONTENT.btt],
      );
      expect(rows).toEqual([
        { id: CONTENT.bttCertification, status: "unlocked", category: "certification" },
      ]);
      const links = await c.query(
        "select kind, url from public.links where entry_id = $1",
        [CONTENT.bttCertification],
      );
      expect(links.rows).toHaveLength(1);
      expect(links.rows[0].kind).toBe("profile");
      expect(links.rows[0].url).toMatch(/^https:\/\//);
    });
  });

  it("is one record in all three placements — zero duplication", async () => {
    await asAnon(async (c) => {
      const { rows } = await c.query(
        `select distinct r.to_entry_id as id
           from public.entry_relations r
          where r.from_entry_id in ($1, $2)
            and r.relation_type in ('part_of', 'certifies')`,
        [CONTENT.bttProject, CONTENT.bttCertification],
      );
      expect(rows).toEqual([{ id: CONTENT.btt }]);
      const twins = await c.query(
        `select count(*)::int as n
           from public.entries
          where kind = 'experience'
            and (title, subtitle) = (select title, subtitle from public.entries where id = $1)`,
        [CONTENT.btt],
      );
      expect(twins.rows[0].n).toBe(1);
    });
  });
});

describe("supabase/seed.content.sql — the seed's own contract", () => {
  it("names its source on every row and never carries the fixture flag", async () => {
    const { rows } = await pool.query(
      `select count(*) filter (where metadata ? 'fixture')::int as flagged,
              count(*) filter (where metadata->'source'->>'export' not in ('linkedin', 'credential-page'))::int as unsourced,
              count(*)::int as total
         from public.entries
        where not coalesce((metadata->>'fixture')::boolean, false)`,
    );
    expect(rows[0].total).toBeGreaterThan(0);
    expect(rows[0].flagged).toBe(0);
    expect(rows[0].unsourced).toBe(0);
  });

  it("keeps the fixture and the content disjoint by id and slug", async () => {
    const { rows } = await pool.query(
      `select count(*)::int as n from public.entries
        where (metadata->>'fixture')::boolean and metadata ? 'source'`,
    );
    expect(rows[0].n).toBe(0);
  });

  it("is idempotent: re-applying changes no row and touches no updated_at", async () => {
    const sql = await readFile(SEED_FILE, "utf8");
    await inRolledBackTx(async (c) => {
      const before = await counts(c);
      await c.query(sql);
      const after = await counts(c);
      expect(after).toEqual(before);
    });
  });

  it("fails loudly when a relation names a slug that does not exist", async () => {
    const sql = await readFile(SEED_FILE, "utf8");
    const broken = sql.replace(
      "slug = 'break-through-tech'",
      "slug = 'no-such-slug-owner-renamed-it'",
    );
    expect(broken).not.toBe(sql);
    const code = await inRolledBackTx(async (c) => {
      try {
        await c.query(broken);
        return null;
      } catch (error) {
        return (error as { code?: string }).code ?? "unknown";
      }
    });
    expect(code).toBe("23502"); // not_null_violation on from/to_entry_id
  });
});
