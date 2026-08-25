// @ts-check
// Normalized records → the owner-editable content seed (S3).
//
// The output is meant to be read and edited by hand, so: one row per entry
// with a comment naming its source row and its REVIEW items, bodies in
// dollar quotes so markdown needs no escaping, relations written by slug.
// Upserts keyed on the fixed ids keep it idempotent; the `where … is
// distinct from` clause keeps a no-op apply from touching updated_at.

/** @typedef {import("./normalize.mjs").Normalized} Normalized */
/** @typedef {import("./normalize.mjs").Entry} Entry */
/** @typedef {import("./normalize.mjs").Relation} Relation */

const ENTRY_COLUMNS = [
  "id", "kind", "facet", "slug", "title", "subtitle", "summary", "body",
  "start_date", "end_date", "is_current", "status", "icon_asset", "accent_color",
  "featured", "sort_weight", "metadata",
];
const UPDATABLE = ENTRY_COLUMNS.filter((c) => c !== "id");

/** @param {string | null} value */
export function literal(value) {
  return value === null ? "null" : `'${value.replace(/'/g, "''")}'`;
}

/**
 * Dollar-quotes `value` with a tag that does not occur inside it.
 * @param {string | null} value
 */
export function dollar(value) {
  if (value === null) return "null";
  let tag = "$md$";
  for (let n = 1; value.includes(tag); n += 1) tag = `$md${n}$`;
  return `${tag}${value}${tag}`;
}

/** @param {unknown} value */
const json = (value) => `${literal(JSON.stringify(value))}::jsonb`;

/** @param {string} text */
const comment = (text) => text.split("\n").map((line) => `  -- ${line}`).join("\n");

/** @param {Entry} e */
function entryTuple(e) {
  const values = [
    literal(e.id), literal(e.kind), literal(e.facet), literal(e.slug), literal(e.title),
    literal(e.subtitle), literal(e.summary), dollar(e.body),
    literal(e.start_date), literal(e.end_date), String(e.is_current), literal(e.status),
    literal(e.icon_asset), literal(e.accent_color),
    String(e.featured), String(e.sort_weight), json(e.metadata),
  ];
  const source = `${e.source.file}: ${Object.values(e.source.key).filter(Boolean).join(" · ")}`;
  const lines = [comment(source)];
  if (e.review.length) lines.push(comment(`REVIEW: ${e.review.join("; ")}`));
  lines.push(`  (${values.join(",\n   ")})`);
  return lines.join("\n");
}

/** @param {Relation} r @param {string} prefix */
function relationTuple(r, prefix) {
  return [
    `${prefix}  -- ${prefix ? "SUGGESTED" : "REVIEW"}: ${r.from_slug} ${r.type} ${r.to_slug} — ${r.note}`,
    `${prefix}  ((select id from public.entries where slug = ${literal(r.from_slug)}),`,
    `${prefix}   (select id from public.entries where slug = ${literal(r.to_slug)}),`,
    `${prefix}   ${literal(r.type)})`,
  ].join("\n");
}

/**
 * @param {Normalized} data
 * @returns {string}
 */
export function renderSeed(data) {
  const out = [];
  out.push(`-- supabase/seed.content.sql — REAL CONTENT, owner-editable.
--
-- Generated once by \`npm run linkedin:import\` (S3, scripts/linkedin/) from the
-- owner's LinkedIn data export, then edited by hand. The export itself is
-- never committed. Re-running the importer OVERWRITES this file and every
-- edit made since (it refuses unless --force), so edit here, not upstream.
--
-- Loads after supabase/seed.sql (fixture data) through \`npm run db:apply\`
-- locally and in CI; never runs on the hosted project.
--
-- Idempotent: every row upserts on a fixed id. Ids are stable handles —
-- change anything else, never an id. Relations are written by slug, so a
-- renamed slug must be renamed here too; a relation naming a slug that does
-- not exist fails the seed loudly (null id → not-null violation). After
-- removing or moving a row or relation, \`npm run db:reset\`.
--
-- REVIEW marks a field the export could not supply or a judgment to confirm
-- (BUILD_PLAN §8: "edit the normalized BTT record for accuracy" before S6).
-- Dates carry metadata.date_precision (month = day is a placeholder 01).
`);

  out.push("-- entries ------------------------------------------------------------------\n");
  out.push(`insert into public.entries as e\n  (${ENTRY_COLUMNS.join(", ")})\nvalues`);
  out.push(data.entries.map(entryTuple).join(",\n\n"));
  out.push(`on conflict (id) do update set
  ${UPDATABLE.map((c) => `${c} = excluded.${c}`).join(",\n  ")}
where (${UPDATABLE.map((c) => `e.${c}`).join(", ")})
   is distinct from
      (${UPDATABLE.map((c) => `excluded.${c}`).join(", ")});
`);

  out.push("-- relations: \"<from> <relation_type> <to>\" ---------------------------------\n");
  if (data.relations.length) {
    out.push("insert into public.entry_relations (from_entry_id, to_entry_id, relation_type) values");
    out.push(data.relations.map((r) => relationTuple(r, "")).join(",\n"));
    out.push("on conflict do nothing;\n");
  }
  if (data.suggested.length) {
    out.push("-- Suggested by date overlap, not asserted (owner's call, BUILD_PLAN §8). Uncomment to enable.");
    out.push("-- insert into public.entry_relations (from_entry_id, to_entry_id, relation_type) values");
    out.push(data.suggested.map((r) => relationTuple(r, "--")).join(",\n"));
    out.push("-- on conflict do nothing;\n");
  }

  out.push("-- links ---------------------------------------------------------------------\n");
  if (data.links.length) {
    out.push("insert into public.links as l (id, entry_id, label, url, kind) values");
    out.push(
      data.links
        .map((l) => `  (${[l.id, l.entry_id, l.label, l.url, l.kind].map(literal).join(", ")})`)
        .join(",\n"),
    );
    out.push(`on conflict (id) do update set
  entry_id = excluded.entry_id, label = excluded.label, url = excluded.url, kind = excluded.kind
where (l.entry_id, l.label, l.url, l.kind) is distinct from (excluded.entry_id, excluded.label, excluded.url, excluded.kind);
`);
  }

  return out.join("\n");
}
