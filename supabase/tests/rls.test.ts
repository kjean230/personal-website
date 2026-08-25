/**
 * Schema + RLS integration tests (S2). Run with `npm run db:test` against a
 * database that `npm run db:apply` has migrated and seeded.
 *
 * Every test runs inside a transaction that is rolled back, under the Data
 * API role it names (`set local role`) with a `request.jwt.claims` setting
 * shaped like the one PostgREST sets — which is exactly what the policies
 * and public.is_admin() read. Nothing here touches the network stack; it
 * tests the database contract the brief §7 rules depend on.
 */
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const DEFAULT_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

type Role = "anon" | "authenticated" | "service_role";
type Claims = Record<string, unknown>;

const FIXTURE = {
  program: "00000000-0000-4000-8000-000000000101",
  projectAlpha: "00000000-0000-4000-8000-000000000102",
  projectBeta: "00000000-0000-4000-8000-000000000103",
  certificate: "00000000-0000-4000-8000-000000000104",
  certificatePending: "00000000-0000-4000-8000-000000000105",
  certificateRetired: "00000000-0000-4000-8000-000000000106",
  school: "00000000-0000-4000-8000-000000000107",
} as const;

const ADMIN_CLAIMS: Claims = {
  sub: "00000000-0000-4000-8000-00000000aaaa",
  app_metadata: { role: "admin" },
};
const USER_CLAIMS: Claims = {
  sub: "00000000-0000-4000-8000-00000000bbbb",
  app_metadata: {},
  // user_metadata is user-writable and must never grant admin.
  user_metadata: { role: "admin" },
};

// A 64-hex digest, the shape the app stores (sha-256 of salt + IP).
const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? DEFAULT_URL,
  max: 2,
});

/** Runs `fn` as `role` inside a transaction that is always rolled back. */
async function as<T>(
  role: Role,
  claims: Claims,
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ role, ...claims }),
    ]);
    await client.query(`set local role ${role}`);
    return await fn(client);
  } finally {
    await client.query("rollback").catch(() => undefined);
    client.release();
  }
}

/**
 * Executes `sql` inside a savepoint and returns the SQLSTATE it failed with,
 * or null if it succeeded — so one role session can probe several denials.
 */
async function sqlstate(
  client: pg.PoolClient,
  sql: string,
  params: unknown[] = [],
): Promise<string | null> {
  await client.query("savepoint probe");
  try {
    await client.query(sql, params);
    await client.query("release savepoint probe");
    return null;
  } catch (error) {
    await client.query("rollback to savepoint probe");
    return (error as { code?: string }).code ?? "unknown";
  }
}

const INSUFFICIENT_PRIVILEGE = "42501"; // permission denied / RLS violation
const CHECK_VIOLATION = "23514";
const UNIQUE_VIOLATION = "23505";

const CONTENT_TABLES = [
  "entries",
  "tags",
  "entry_tags",
  "entry_relations",
  "media",
  "links",
] as const;

beforeAll(async () => {
  const { rows } = await pool.query(
    "select count(*)::int as n from public.entries where (metadata->>'fixture')::boolean",
  );
  if (rows[0].n === 0) {
    throw new Error(
      "no fixture rows — run `npm run db:apply` (migrations + seed) first",
    );
  }
});

afterAll(async () => {
  await pool.end();
});

describe("public.is_admin()", () => {
  it("is false for anon", async () => {
    const ok = await as("anon", {}, async (c) => {
      const { rows } = await c.query("select public.is_admin() as admin");
      return rows[0].admin;
    });
    expect(ok).toBe(false);
  });

  it("is false for a signed-in user without the app_metadata claim, even with user_metadata.role = admin", async () => {
    const ok = await as("authenticated", USER_CLAIMS, async (c) => {
      const { rows } = await c.query("select public.is_admin() as admin");
      return rows[0].admin;
    });
    expect(ok).toBe(false);
  });

  it("is true only with app_metadata.role = admin", async () => {
    const ok = await as("authenticated", ADMIN_CLAIMS, async (c) => {
      const { rows } = await c.query("select public.is_admin() as admin");
      return rows[0].admin;
    });
    expect(ok).toBe(true);
  });
});

describe("row level security is on everywhere", () => {
  it("every S2 table has RLS enabled", async () => {
    const { rows } = await pool.query(
      `select relname, relrowsecurity
         from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and relkind = 'r'
        order by relname`,
    );
    const names = rows.map((r) => r.relname);
    expect(names).toEqual([...CONTENT_TABLES, "reactions"].sort());
    expect(rows.every((r) => r.relrowsecurity)).toBe(true);
  });
});

describe("content tables — public read, admin write", () => {
  it("anon reads every content table", async () => {
    await as("anon", {}, async (c) => {
      for (const table of CONTENT_TABLES) {
        const { rows } = await c.query(
          `select count(*)::int as n from public.${table}`,
        );
        expect(rows[0].n, table).toBeGreaterThan(0);
      }
    });
  });

  it("anon cannot insert, update, or delete content", async () => {
    await as("anon", {}, async (c) => {
      expect(
        await sqlstate(
          c,
          "insert into public.entries (kind, slug, title) values ('project', 'anon-probe', 'x')",
        ),
      ).toBe(INSUFFICIENT_PRIVILEGE);
      expect(
        await sqlstate(c, "update public.entries set title = 'x'"),
      ).toBe(INSUFFICIENT_PRIVILEGE);
      expect(await sqlstate(c, "delete from public.tags")).toBe(
        INSUFFICIENT_PRIVILEGE,
      );
      expect(await sqlstate(c, "delete from public.entry_relations")).toBe(
        INSUFFICIENT_PRIVILEGE,
      );
    });
  });

  it("a signed-in non-admin reads but cannot write", async () => {
    await as("authenticated", USER_CLAIMS, async (c) => {
      const { rows } = await c.query("select count(*)::int as n from public.entries");
      expect(rows[0].n).toBeGreaterThan(0);
      // Grants allow the statement; the RLS with-check / using clauses deny it.
      expect(
        await sqlstate(
          c,
          "insert into public.entries (kind, slug, title) values ('project', 'user-probe', 'x')",
        ),
      ).toBe(INSUFFICIENT_PRIVILEGE);
      const upd = await c.query("update public.entries set title = title || '!'");
      expect(upd.rowCount).toBe(0);
      const del = await c.query("delete from public.links");
      expect(del.rowCount).toBe(0);
    });
  });

  it("the admin writes every content table", async () => {
    await as("authenticated", ADMIN_CLAIMS, async (c) => {
      const ins = await c.query(
        `insert into public.entries (kind, facet, slug, title, metadata)
         values ('project', 'classroom', 'admin-probe', 'Admin probe', '{"fixture": true}')
         returning id`,
      );
      const id = ins.rows[0].id;
      const tag = await c.query(
        "insert into public.tags (slug, label, category) values ('admin-probe-tag', 'Probe', 'skill') returning id",
      );
      await c.query("insert into public.entry_tags (entry_id, tag_id) values ($1, $2)", [
        id,
        tag.rows[0].id,
      ]);
      await c.query(
        "insert into public.entry_relations (from_entry_id, to_entry_id, relation_type) values ($1, $2, 'related_to')",
        [id, FIXTURE.projectAlpha],
      );
      await c.query(
        "insert into public.links (entry_id, label, url, kind) values ($1, 'Probe', 'https://example.com/probe', 'demo')",
        [id],
      );
      await c.query(
        "insert into public.media (entry_id, storage_path, alt_text) values ($1, 'probe/cover.svg', 'Probe alt text')",
        [id],
      );
      const upd = await c.query(
        "update public.entries set title = 'Admin probe 2' where id = $1",
        [id],
      );
      expect(upd.rowCount).toBe(1);
      const del = await c.query("delete from public.entries where id = $1", [id]);
      expect(del.rowCount).toBe(1);
    });
  });
});

describe("reactions — brief §7", () => {
  it("anon inserts exactly (entry_id, emoji, ip_hash)", async () => {
    await as("anon", {}, async (c) => {
      expect(
        await sqlstate(
          c,
          "insert into public.reactions (entry_id, emoji, ip_hash) values ($1, '👍', $2)",
          [FIXTURE.projectBeta, HASH_A],
        ),
      ).toBeNull();
    });
  });

  it("anon cannot set id or created_at on a reaction", async () => {
    await as("anon", {}, async (c) => {
      expect(
        await sqlstate(
          c,
          "insert into public.reactions (entry_id, emoji, ip_hash, created_at) values ($1, '👍', $2, now() - interval '1 year')",
          [FIXTURE.projectBeta, HASH_A],
        ),
      ).toBe(INSUFFICIENT_PRIVILEGE);
      expect(
        await sqlstate(
          c,
          "insert into public.reactions (id, entry_id, emoji, ip_hash) values (gen_random_uuid(), $1, '👍', $2)",
          [FIXTURE.projectBeta, HASH_A],
        ),
      ).toBe(INSUFFICIENT_PRIVILEGE);
    });
  });

  it("rejects an emoji outside the fixed allowlist", async () => {
    await as("anon", {}, async (c) => {
      for (const emoji of ["💩", "a", "", "👍👍", "<script>"]) {
        expect(
          await sqlstate(
            c,
            "insert into public.reactions (entry_id, emoji, ip_hash) values ($1, $2, $3)",
            [FIXTURE.projectBeta, emoji, HASH_A],
          ),
          JSON.stringify(emoji),
        ).toBe(CHECK_VIOLATION);
      }
    });
  });

  it("the allowlist function is the single source of the allowed set", async () => {
    await as("anon", {}, async (c) => {
      const { rows } = await c.query(
        "select public.reaction_emoji_allowlist() as list",
      );
      const list: string[] = rows[0].list;
      expect(list.length).toBeGreaterThan(0);
      for (const emoji of list) {
        // every allowed emoji is a single code point
        expect([...emoji]).toHaveLength(1);
        expect(
          await sqlstate(
            c,
            "insert into public.reactions (entry_id, emoji, ip_hash) values ($1, $2, $3)",
            [FIXTURE.school, emoji, HASH_A],
          ),
        ).toBeNull();
      }
    });
  });

  it("cannot store a raw IP: ip_hash must be a 64-char hex digest", async () => {
    await as("anon", {}, async (c) => {
      for (const raw of [
        "203.0.113.7",
        "2001:db8::1",
        "203.0.113.7-salted",
        "A".repeat(64), // upper-case hex is not the app's output either
        "a".repeat(63),
        "",
      ]) {
        expect(
          await sqlstate(
            c,
            "insert into public.reactions (entry_id, emoji, ip_hash) values ($1, '👍', $2)",
            [FIXTURE.projectBeta, raw],
          ),
          JSON.stringify(raw),
        ).toBe(CHECK_VIOLATION);
      }
    });
  });

  it("is idempotent per visitor: a repeat is a unique violation, and `on conflict do nothing` absorbs it", async () => {
    await as("anon", {}, async (c) => {
      const insert =
        "insert into public.reactions (entry_id, emoji, ip_hash) values ($1, '🔥', $2)";
      expect(await sqlstate(c, insert, [FIXTURE.projectBeta, HASH_B])).toBeNull();
      expect(await sqlstate(c, insert, [FIXTURE.projectBeta, HASH_B])).toBe(
        UNIQUE_VIOLATION,
      );
      const again = await c.query(`${insert} on conflict do nothing`, [
        FIXTURE.projectBeta,
        HASH_B,
      ]);
      expect(again.rowCount).toBe(0);
    });
  });

  it("anon can never read raw reaction rows", async () => {
    await as("anon", {}, async (c) => {
      expect(await sqlstate(c, "select * from public.reactions")).toBe(
        INSUFFICIENT_PRIVILEGE,
      );
      expect(await sqlstate(c, "select ip_hash from public.reactions")).toBe(
        INSUFFICIENT_PRIVILEGE,
      );
      expect(await sqlstate(c, "select count(*) from public.reactions")).toBe(
        INSUFFICIENT_PRIVILEGE,
      );
      // `returning` would be a read too.
      expect(
        await sqlstate(
          c,
          "insert into public.reactions (entry_id, emoji, ip_hash) values ($1, '👀', $2) returning id",
          [FIXTURE.projectBeta, HASH_A],
        ),
      ).toBe(INSUFFICIENT_PRIVILEGE);
    });
  });

  it("anon can neither update nor delete reactions", async () => {
    await as("anon", {}, async (c) => {
      expect(await sqlstate(c, "delete from public.reactions")).toBe(
        INSUFFICIENT_PRIVILEGE,
      );
      expect(await sqlstate(c, "update public.reactions set emoji = '🎉'")).toBe(
        INSUFFICIENT_PRIVILEGE,
      );
    });
  });

  it("anon reads aggregate counts only, through reaction_counts", async () => {
    await as("anon", {}, async (c) => {
      const cols = await c.query(
        `select column_name from information_schema.columns
          where table_schema = 'public' and table_name = 'reaction_counts'
          order by ordinal_position`,
      );
      expect(cols.rows.map((r) => r.column_name)).toEqual([
        "entry_id",
        "emoji",
        "count",
      ]);
      const { rows } = await c.query(
        "select emoji, count from public.reaction_counts where entry_id = $1 order by emoji",
        [FIXTURE.projectAlpha],
      );
      expect(rows).toEqual([
        { emoji: "🎉", count: 1 },
        { emoji: "👍", count: 2 },
      ]);
      // and a fresh insert is reflected in the aggregate without a raw read
      await c.query(
        "insert into public.reactions (entry_id, emoji, ip_hash) values ($1, '👍', $2)",
        [FIXTURE.projectAlpha, HASH_A],
      );
      const after = await c.query(
        "select count from public.reaction_counts where entry_id = $1 and emoji = '👍'",
        [FIXTURE.projectAlpha],
      );
      expect(after.rows[0].count).toBe(3);
    });
  });

  it("a signed-in non-admin is treated like anon on reactions", async () => {
    await as("authenticated", USER_CLAIMS, async (c) => {
      // grant exists, policy hides every row
      const { rows } = await c.query("select count(*)::int as n from public.reactions");
      expect(rows[0].n).toBe(0);
      const del = await c.query("delete from public.reactions");
      expect(del.rowCount).toBe(0);
      expect(await sqlstate(c, "update public.reactions set emoji = '🎉'")).toBe(
        INSUFFICIENT_PRIVILEGE,
      );
    });
  });

  it("the admin reads raw rows and deletes them (moderation), but cannot rewrite them", async () => {
    await as("authenticated", ADMIN_CLAIMS, async (c) => {
      const { rows } = await c.query(
        "select count(*)::int as n from public.reactions where entry_id = $1",
        [FIXTURE.projectAlpha],
      );
      expect(rows[0].n).toBe(3);
      const del = await c.query(
        "delete from public.reactions where entry_id = $1 and emoji = '🎉'",
        [FIXTURE.projectAlpha],
      );
      expect(del.rowCount).toBe(1);
      expect(await sqlstate(c, "update public.reactions set emoji = '🎉'")).toBe(
        INSUFFICIENT_PRIVILEGE,
      );
    });
  });
});

describe("schema invariants", () => {
  it("entries.status is the closed trophy-state set", async () => {
    await as("authenticated", ADMIN_CLAIMS, async (c) => {
      expect(
        await sqlstate(
          c,
          "insert into public.entries (kind, slug, title, status) values ('project', 'status-probe', 'x', 'locked')",
        ),
      ).toBe(CHECK_VIOLATION);
    });
  });

  it("entries.kind is open (zero-migration section types) but must be slug-shaped", async () => {
    await as("authenticated", ADMIN_CLAIMS, async (c) => {
      expect(
        await sqlstate(
          c,
          "insert into public.entries (kind, slug, title) values ('award', 'kind-probe', 'x')",
        ),
      ).toBeNull();
      expect(
        await sqlstate(
          c,
          "insert into public.entries (kind, slug, title) values ('Award!', 'kind-probe-2', 'x')",
        ),
      ).toBe(CHECK_VIOLATION);
    });
  });

  it("slugs are URL-safe and unique", async () => {
    await as("authenticated", ADMIN_CLAIMS, async (c) => {
      expect(
        await sqlstate(
          c,
          "insert into public.entries (kind, slug, title) values ('project', 'Not A Slug', 'x')",
        ),
      ).toBe(CHECK_VIOLATION);
      expect(
        await sqlstate(
          c,
          "insert into public.entries (kind, slug, title) values ('project', 'fixture-program', 'dup')",
        ),
      ).toBe(UNIQUE_VIOLATION);
    });
  });

  it("dates are ordered and a current entry has no end date", async () => {
    await as("authenticated", ADMIN_CLAIMS, async (c) => {
      expect(
        await sqlstate(
          c,
          "insert into public.entries (kind, slug, title, start_date, end_date) values ('project', 'date-probe', 'x', '2024-02-01', '2024-01-01')",
        ),
      ).toBe(CHECK_VIOLATION);
      expect(
        await sqlstate(
          c,
          "insert into public.entries (kind, slug, title, is_current, end_date) values ('project', 'current-probe', 'x', true, '2024-01-01')",
        ),
      ).toBe(CHECK_VIOLATION);
    });
  });

  it("updated_at moves on update", async () => {
    await as("authenticated", ADMIN_CLAIMS, async (c) => {
      const before = await c.query(
        "select updated_at from public.entries where id = $1",
        [FIXTURE.program],
      );
      await c.query("select pg_sleep(0.01)");
      await c.query(
        "update public.entries set sort_weight = sort_weight where id = $1",
        [FIXTURE.program],
      );
      const after = await c.query(
        "select updated_at from public.entries where id = $1",
        [FIXTURE.program],
      );
      expect(after.rows[0].updated_at.getTime()).toBeGreaterThan(
        before.rows[0].updated_at.getTime(),
      );
    });
  });

  it("relations are typed, non-reflexive, and cascade with their entries", async () => {
    await as("authenticated", ADMIN_CLAIMS, async (c) => {
      expect(
        await sqlstate(
          c,
          "insert into public.entry_relations (from_entry_id, to_entry_id, relation_type) values ($1, $2, 'child_of')",
          [FIXTURE.projectAlpha, FIXTURE.program],
        ),
      ).toBe(CHECK_VIOLATION);
      expect(
        await sqlstate(
          c,
          "insert into public.entry_relations (from_entry_id, to_entry_id, relation_type) values ($1, $1, 'related_to')",
          [FIXTURE.projectAlpha],
        ),
      ).toBe(CHECK_VIOLATION);
      await c.query("delete from public.entries where id = $1", [FIXTURE.projectAlpha]);
      const { rows } = await c.query(
        "select count(*)::int as n from public.entry_relations where from_entry_id = $1 or to_entry_id = $1",
        [FIXTURE.projectAlpha],
      );
      expect(rows[0].n).toBe(0);
    });
  });

  it("media requires alt text; links require an http(s) url and a known kind", async () => {
    await as("authenticated", ADMIN_CLAIMS, async (c) => {
      expect(
        await sqlstate(
          c,
          "insert into public.media (entry_id, storage_path, alt_text) values ($1, 'x.svg', '   ')",
          [FIXTURE.projectAlpha],
        ),
      ).toBe(CHECK_VIOLATION);
      expect(
        await sqlstate(
          c,
          "insert into public.links (entry_id, label, url, kind) values ($1, 'x', 'javascript:alert(1)', 'demo')",
          [FIXTURE.projectAlpha],
        ),
      ).toBe(CHECK_VIOLATION);
      expect(
        await sqlstate(
          c,
          "insert into public.links (entry_id, label, url, kind) values ($1, 'x', 'https://example.com', 'social')",
          [FIXTURE.projectAlpha],
        ),
      ).toBe(CHECK_VIOLATION);
    });
  });
});

describe("brief §4.1 — one record, three placements", () => {
  it("the fixture experience exists exactly once", async () => {
    const { rows } = await pool.query(
      "select count(*)::int as n from public.entries where slug = 'fixture-program'",
    );
    expect(rows[0].n).toBe(1);
  });

  it("surfaces under Experience by kind", async () => {
    await as("anon", {}, async (c) => {
      const { rows } = await c.query(
        "select id from public.entries where kind = 'experience'",
      );
      expect(rows.map((r) => r.id)).toContain(FIXTURE.program);
    });
  });

  it("surfaces under Projects through its part_of children, which are the only project rows", async () => {
    await as("anon", {}, async (c) => {
      const { rows } = await c.query(
        `select e.id
           from public.entries e
           join public.entry_relations r on r.from_entry_id = e.id and r.relation_type = 'part_of'
          where e.kind = 'project' and r.to_entry_id = $1
          order by e.sort_weight desc`,
        [FIXTURE.program],
      );
      expect(rows.map((r) => r.id)).toEqual([FIXTURE.projectAlpha, FIXTURE.projectBeta]);
      const projects = await c.query(
        "select count(*)::int as n from public.entries where kind = 'project' and (metadata->>'fixture')::boolean",
      );
      expect(projects.rows[0].n).toBe(2);
    });
  });

  it("surfaces in the trophy case through the certification that certifies it", async () => {
    await as("anon", {}, async (c) => {
      const { rows } = await c.query(
        `select e.id, e.status
           from public.entries e
           join public.entry_relations r on r.from_entry_id = e.id and r.relation_type = 'certifies'
          where e.kind = 'certification' and r.to_entry_id = $1`,
        [FIXTURE.program],
      );
      expect(rows).toEqual([{ id: FIXTURE.certificate, status: "unlocked" }]);
    });
  });

  it("the trophy case sees all three states from the fixture", async () => {
    await as("anon", {}, async (c) => {
      const { rows } = await c.query(
        "select status, count(*)::int as n from public.entries where kind = 'certification' group by status order by status",
      );
      expect(rows).toEqual([
        { status: "archived", n: 1 },
        { status: "in_progress", n: 1 },
        { status: "unlocked", n: 1 },
      ]);
    });
  });
});
