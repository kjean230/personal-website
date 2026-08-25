// @ts-check
// One-shot LinkedIn export importer (S3, BUILD_PLAN §4).
//
//   npm run linkedin:import -- <export-dir> [--force]
//   LINKEDIN_EXPORT_DIR=<export-dir> npm run linkedin:import
//
// Reads exactly the five profile files named in normalize.mjs from the
// owner's export directory (which also holds connections, messages, and
// contact details — nothing else is ever opened), normalizes them with the
// hand-entered supplement, and writes supabase/seed.content.sql. The export
// is never committed; only this output is. The output is then owner-edited,
// so the script refuses to overwrite an existing file without --force.

import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EXPORT_FILES, normalize } from "./normalize.mjs";
import { renderSeed } from "./sql.mjs";
import { supplement } from "./supplement.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const OUTPUT = path.join(root, "supabase", "seed.content.sql");

// Brief §2.1: the prohibited term appears nowhere, including seed content.
const PROHIBITED = /nintendo/i;

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const dir = args.find((a) => !a.startsWith("--")) ?? process.env.LINKEDIN_EXPORT_DIR;
  if (!dir) {
    throw new Error("usage: npm run linkedin:import -- <export-dir> [--force]");
  }
  if (existsSync(OUTPUT) && !force) {
    throw new Error(
      `${path.relative(root, OUTPUT)} exists and may carry owner edits; pass --force to overwrite it`,
    );
  }

  /** @type {Record<string, string>} */
  const files = {};
  for (const name of EXPORT_FILES) {
    files[name] = await readFile(path.join(dir, name), "utf8");
  }

  const data = normalize(files, supplement);
  const sql = renderSeed(data);
  if (PROHIBITED.test(sql)) {
    throw new Error("output contains a prohibited term (brief §2.1); not written");
  }
  await writeFile(OUTPUT, sql, "utf8");

  const byKind = new Map();
  for (const e of data.entries) byKind.set(e.kind, (byKind.get(e.kind) ?? 0) + 1);
  console.log(`wrote ${path.relative(root, OUTPUT)}`);
  console.log(
    `entries: ${data.entries.length} (${[...byKind].map(([k, n]) => `${k} ${n}`).join(", ")})`,
  );
  console.log(`relations: ${data.relations.length} live, ${data.suggested.length} suggested`);
  console.log(`links: ${data.links.length}`);
  console.log("\nREVIEW before S6:");
  for (const e of data.entries) {
    if (e.review.length) console.log(`  ${e.slug}: ${e.review.join("; ")}`);
  }
  for (const r of data.relations) console.log(`  ${r.from_slug} ${r.type} ${r.to_slug}: ${r.note}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
