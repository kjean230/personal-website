// Applies supabase/migrations/*.sql in filename order, then the seed files,
// to DATABASE_URL (default: the docker-compose Postgres).
//
// This is the local and CI runner. The hosted project is migrated by the
// Supabase CLI / GitHub integration, which read the same files; this script
// mirrors their bookkeeping table (supabase_migrations.schema_migrations) so
// a database it has migrated looks the same to the CLI, and so re-running it
// only applies new files. Seeds are re-run every time (they are idempotent).
//
//   node scripts/db/apply.mjs            migrations + seeds
//   node scripts/db/apply.mjs --no-seed  migrations only

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const DEFAULT_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const root = fileURLToPath(new URL("../../", import.meta.url));
const migrationsDir = path.join(root, "supabase", "migrations");
// Applied in this order — fixture first, then the real, owner-edited content
// (S3). Keep in step with [db.seed] sql_paths in supabase/config.toml. Not a
// glob: "seed.content.sql" would sort before "seed.sql".
const SEED_FILES = ["seed.sql", "seed.content.sql"];
const withSeed = !process.argv.includes("--no-seed");

const MIGRATION_FILE = /^(\d{14})_([\w-]+)\.sql$/;

async function main() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL ?? DEFAULT_URL,
  });
  await client.connect();
  try {
    await client.query(`
      create schema if not exists supabase_migrations;
      create table if not exists supabase_migrations.schema_migrations (
        version text primary key,
        statements text[],
        name text
      );
    `);
    const { rows } = await client.query(
      "select version from supabase_migrations.schema_migrations",
    );
    const applied = new Set(rows.map((r) => r.version));

    const files = (await readdir(migrationsDir))
      .filter((f) => MIGRATION_FILE.test(f))
      .sort();

    for (const file of files) {
      const [, version, name] = MIGRATION_FILE.exec(file);
      if (applied.has(version)) {
        console.log(`skip   ${file} (already applied)`);
        continue;
      }
      const sql = await readFile(path.join(migrationsDir, file), "utf8");
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query(
          "insert into supabase_migrations.schema_migrations (version, statements, name) values ($1, $2, $3)",
          [version, [sql], name],
        );
        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw new Error(`migration ${file} failed: ${error.message}`, {
          cause: error,
        });
      }
      console.log(`apply  ${file}`);
    }

    if (withSeed) {
      for (const file of SEED_FILES) {
        const sql = await readFile(path.join(root, "supabase", file), "utf8");
        await client.query("begin");
        try {
          await client.query(sql);
          await client.query("commit");
        } catch (error) {
          await client.query("rollback");
          throw new Error(`seed ${file} failed: ${error.message}`, { cause: error });
        }
        console.log(`seed   supabase/${file}`);
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
