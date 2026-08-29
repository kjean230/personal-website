// @ts-check
// LinkedIn export → entries/relations/links records (S3). Pure: takes the
// text of the five export files and the supplement, returns plain records.
// No I/O, no dates from the clock, so the output is deterministic.
//
// Mapping (BUILD_BRIEF §4):
//   Positions.csv     → kind experience   (facet null unless supplemented)
//   Projects.csv      → kind project
//   Education.csv     → kind education    (title = degree, subtitle = school)
//   Honors.csv        → kind certification, metadata.category = "award"
//                       (brief §5: the trophy case holds certifications and awards)
//   Volunteering.csv  → kind experience, facet volunteer
//   supplement        → kind certification, metadata.category = "certification"
// Anything the export does not say stays null and is listed under `review`.

import { parseCsvRecords } from "./csv.mjs";
import { deterministicId } from "./uuid.mjs";

/** @typedef {import("./supplement.mjs").Supplement} Supplement */
/** @typedef {import("./supplement.mjs").Ref} Ref */
/** @typedef {import("./supplement.mjs").RelationSpec} RelationSpec */

/**
 * @typedef {object} Entry
 * @property {string} id
 * @property {string} kind
 * @property {string | null} facet
 * @property {string} slug
 * @property {string} title
 * @property {string | null} subtitle
 * @property {string | null} summary
 * @property {string | null} body
 * @property {string | null} start_date
 * @property {string | null} end_date
 * @property {boolean} is_current
 * @property {string} status
 * @property {string | null} icon_asset
 * @property {string | null} accent_color
 * @property {boolean} featured
 * @property {number} sort_weight
 * @property {Record<string, unknown>} metadata
 * @property {{ file: string, key: Record<string, string> }} source
 * @property {string[]} review  fields the owner must fill or confirm
 */
/** @typedef {{ from_slug: string, to_slug: string, type: string, note: string }} Relation */
/** @typedef {{ id: string, entry_id: string, label: string, url: string, kind: string }} Link */
/** @typedef {{ entries: Entry[], relations: Relation[], links: Link[], suggested: Relation[] }} Normalized */

export const EXPORT_FILES = [
  "Positions.csv",
  "Projects.csv",
  "Education.csv",
  "Honors.csv",
  "Volunteering.csv",
];

/** Header fields that identify one row of each file; ids derive from these. */
const NATURAL_KEYS = {
  "Positions.csv": ["Company Name", "Title", "Started On"],
  "Projects.csv": ["Title", "Started On"],
  "Education.csv": ["School Name", "Degree Name", "Start Date"],
  "Honors.csv": ["Title"],
  "Volunteering.csv": ["Company Name", "Role", "Started On"],
  credential: ["credential_id"],
};

const FACETS = "corporate | research | volunteer | classroom | coursework";

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/**
 * "May 2026" → 2026-05-01 (month) · "2024" → 2024-01-01 (year) ·
 * "Aug 5, 2026" → 2026-08-05 (day) · "" → null · anything else throws.
 * @param {string} text
 * @returns {{ date: string, precision: "day" | "month" | "year" } | null}
 */
export function parseDate(text) {
  const s = text.trim();
  if (s === "") return null;
  const pad = (/** @type {number} */ n) => String(n).padStart(2, "0");
  let m = /^(\d{4})$/.exec(s);
  if (m) return { date: `${m[1]}-01-01`, precision: "year" };
  m = /^([A-Za-z]{3,9})\s+(\d{4})$/.exec(s);
  if (m) {
    const month = MONTHS[/** @type {keyof typeof MONTHS} */ (m[1].slice(0, 3).toLowerCase())];
    if (month) return { date: `${m[2]}-${pad(month)}-01`, precision: "month" };
  }
  m = /^([A-Za-z]{3,9})\s+(\d{1,2}),\s*(\d{4})$/.exec(s);
  if (m) {
    const month = MONTHS[/** @type {keyof typeof MONTHS} */ (m[1].slice(0, 3).toLowerCase())];
    if (month) return { date: `${m[3]}-${pad(month)}-${pad(Number(m[2]))}`, precision: "day" };
  }
  m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return { date: s, precision: "day" };
  throw new Error(`unrecognised date "${text}"`);
}

/**
 * URL-safe slug matching entries_slug_format (^[a-z0-9]+(-[a-z0-9]+)*$).
 * @param {string} text
 */
export function slugify(text) {
  const slug = text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug === "") throw new Error(`cannot slugify "${text}"`);
  return slug;
}

/** @param {string} text */
export function decodeEntities(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/**
 * A LinkedIn description is one line of "• item • item" runs; render it as a
 * markdown list. Text without bullets is returned as a paragraph.
 * @param {string} text
 * @returns {string | null}
 */
export function bulletsToMarkdown(text) {
  const clean = decodeEntities(text).replace(/\s+/g, " ").trim();
  if (clean === "") return null;
  if (!clean.includes("•")) return clean;
  const items = clean
    .split("•")
    .map((item) => item.trim())
    .filter((item) => item !== "");
  return items.map((item) => `- ${item}`).join("\n");
}

/** @param {string} text */
const orNull = (text) => {
  const clean = decodeEntities(text).replace(/\s+/g, " ").trim();
  return clean === "" ? null : clean;
};

/**
 * @param {string} file
 * @param {Record<string, string>} row
 */
function keyOf(file, row) {
  const fields = NATURAL_KEYS[/** @type {keyof typeof NATURAL_KEYS} */ (file)];
  if (!fields) throw new Error(`no natural key for ${file}`);
  /** @type {Record<string, string>} */
  const key = {};
  for (const field of fields) key[field] = row[field] ?? "";
  return key;
}

/**
 * @param {string} file
 * @param {Record<string, string>} key
 */
function idOf(file, key) {
  return deterministicId(`linkedin|${file}|${Object.values(key).join("|")}`);
}

/**
 * @param {object} args
 * @param {string} args.file
 * @param {Record<string, string>} args.row
 * @param {string} args.kind
 * @param {string} args.title
 * @param {string | null} [args.subtitle]
 * @param {string | null} [args.body]
 * @param {string} [args.start]
 * @param {string} [args.end]
 * @param {boolean} [args.currentWhenOpen]  empty end date means "present"
 * @param {Record<string, unknown>} [args.metadata]
 * @param {string | null} [args.facet]
 * @returns {Omit<Entry, "slug">}
 */
function entry({
  file, row, kind, title, subtitle = null, body = null, start = "", end = "",
  currentWhenOpen = false, metadata = {}, facet = null,
}) {
  const key = keyOf(file, row);
  const from = parseDate(start);
  const to = parseDate(end);
  const precision = from?.precision ?? to?.precision;
  return {
    id: idOf(file, key),
    kind,
    facet,
    title,
    subtitle,
    summary: null,
    body,
    start_date: from?.date ?? null,
    end_date: to?.date ?? null,
    is_current: currentWhenOpen && to === null,
    status: "unlocked",
    icon_asset: null,
    accent_color: null,
    featured: false,
    sort_weight: 0,
    metadata: {
      source: { export: "linkedin", file },
      ...(precision ? { date_precision: precision } : {}),
      ...metadata,
    },
    source: { file, key },
    review: [],
  };
}

/**
 * @param {Entry[]} entries
 * @param {Ref} ref
 * @returns {Entry}
 */
function resolve(entries, ref) {
  const { file, ...fields } = ref;
  const hits = entries.filter(
    (e) =>
      e.source.file === file &&
      Object.entries(fields).every(([k, v]) => e.source.key[k] === v),
  );
  if (hits.length !== 1) {
    throw new Error(
      `supplement ref ${JSON.stringify(ref)} matched ${hits.length} rows (expected exactly 1)`,
    );
  }
  return hits[0];
}

/**
 * @param {Record<string, string>} files  file name → CSV text
 * @param {Supplement} supplement
 * @returns {Normalized}
 */
export function normalize(files, supplement) {
  for (const name of EXPORT_FILES) {
    if (typeof files[name] !== "string") throw new Error(`missing ${name}`);
  }
  /** @type {Array<Omit<Entry, "slug"> & { slugBase: string }>} */
  const drafts = [];
  /** @type {Link[]} */
  const links = [];

  // Positions.csv → experience. Slug is the company alone when it has one
  // position (brief §2.2 example: /experience/guardian), else company + title.
  const positions = parseCsvRecords(files["Positions.csv"]);
  const perCompany = new Map();
  for (const row of positions) {
    perCompany.set(row["Company Name"], (perCompany.get(row["Company Name"]) ?? 0) + 1);
  }
  for (const row of positions) {
    const company = row["Company Name"];
    const location = orNull(row["Location"] ?? "");
    drafts.push({
      ...entry({
        file: "Positions.csv", row, kind: "experience",
        title: decodeEntities(row["Title"]).trim(),
        subtitle: orNull(company),
        body: bulletsToMarkdown(row["Description"] ?? ""),
        start: row["Started On"], end: row["Finished On"], currentWhenOpen: true,
        metadata: location ? { location } : {},
      }),
      slugBase: perCompany.get(company) === 1 ? slugify(company) : slugify(`${company} ${row["Title"]}`),
    });
  }

  // Projects.csv → project. A non-empty Url becomes a `demo` link.
  for (const row of parseCsvRecords(files["Projects.csv"])) {
    const draft = {
      ...entry({
        file: "Projects.csv", row, kind: "project",
        title: decodeEntities(row["Title"]).trim(),
        body: bulletsToMarkdown(row["Description"] ?? ""),
        start: row["Started On"], end: row["Finished On"],
      }),
      slugBase: slugify(row["Title"]),
    };
    drafts.push(draft);
    const url = (row["Url"] ?? "").trim();
    if (/^https?:\/\//.test(url)) {
      links.push({
        id: deterministicId(`linkedin|Projects.csv|link|${url}`),
        entry_id: draft.id, label: "Project link", url, kind: "demo",
      });
    }
  }

  // Education.csv → education. Title = degree, subtitle = school.
  for (const row of parseCsvRecords(files["Education.csv"])) {
    const degree = orNull(row["Degree Name"] ?? "");
    const school = decodeEntities(row["School Name"]).trim();
    const notes = orNull(row["Notes"] ?? "");
    const activities = orNull(row["Activities"] ?? "");
    const body = [notes, activities ? `Activities: ${activities}` : null].filter(Boolean).join("\n\n");
    drafts.push({
      ...entry({
        file: "Education.csv", row, kind: "education",
        title: degree ?? school,
        subtitle: school,
        body: body === "" ? null : body,
        start: row["Start Date"], end: row["End Date"], currentWhenOpen: true,
        metadata: activities ? { activities } : {},
      }),
      slugBase: slugify(degree ? `${school} ${degree}` : school),
    });
  }

  // Honors.csv → certification with metadata.category = "award" (trophy case).
  for (const row of parseCsvRecords(files["Honors.csv"])) {
    drafts.push({
      ...entry({
        file: "Honors.csv", row, kind: "certification",
        title: decodeEntities(row["Title"]).trim(),
        body: bulletsToMarkdown(row["Description"] ?? ""),
        start: row["Issued On"],
        metadata: { category: "award" },
      }),
      slugBase: slugify(row["Title"]),
    });
  }

  // Volunteering.csv → experience, facet volunteer.
  for (const row of parseCsvRecords(files["Volunteering.csv"])) {
    const cause = orNull(row["Cause"] ?? "");
    drafts.push({
      ...entry({
        file: "Volunteering.csv", row, kind: "experience", facet: "volunteer",
        title: decodeEntities(row["Role"]).trim(),
        subtitle: orNull(row["Company Name"]),
        body: bulletsToMarkdown(row["Description"] ?? ""),
        start: row["Started On"], end: row["Finished On"], currentWhenOpen: true,
        metadata: cause ? { cause } : {},
      }),
      slugBase: slugify(`${row["Company Name"]} ${row["Role"]}`),
    });
  }

  // Supplement credentials → certification (category "certification").
  for (const c of supplement.credentials) {
    const row = { credential_id: c.credential_id };
    const draft = {
      ...entry({
        file: "credential", row, kind: "certification",
        title: c.title, subtitle: c.issuer, start: c.issued_on,
        metadata: {
          source: { export: "credential-page", url: c.credential_url },
          category: "certification",
          credential_id: c.credential_id,
          credential_url: c.credential_url,
        },
      }),
      slugBase: slugify(c.title),
    };
    draft.review.push(`title, issuer, and date were read from the credential page (${c.source}) — confirm`);
    drafts.push(draft);
    links.push({
      id: deterministicId(`credential|link|${c.credential_url}`),
      entry_id: draft.id, label: "View credential", url: c.credential_url, kind: "profile",
    });
  }

  // Slugs: collisions get the start year appended; a second collision throws.
  const used = new Set();
  /** @type {Entry[]} */
  const entries = drafts.map(({ slugBase, ...rest }) => {
    let slug = slugBase;
    if (used.has(slug)) {
      const year = rest.start_date?.slice(0, 4);
      slug = year ? `${slugBase}-${year}` : slugBase;
      if (used.has(slug)) throw new Error(`slug collision: ${slug}`);
    }
    used.add(slug);
    return { ...rest, slug };
  });

  // Supplement facets.
  for (const f of supplement.facets) {
    const target = resolve(entries, f.ref);
    target.facet = f.facet;
    target.review.push(`facet = ${f.facet} per ${f.source} — confirm`);
  }

  // Review notes for fields the export cannot supply.
  for (const e of entries) {
    if (e.facet === null && ["experience", "project", "education"].includes(e.kind)) {
      e.review.push(`facet (not in the export): ${FACETS}, or leave null`);
    }
    if (e.summary === null) e.review.push("summary (one line for the tile)");
    if (e.subtitle === null) e.review.push("subtitle (organisation / issuer — not in the export)");
    if (e.start_date === null) e.review.push("start_date (not in the export)");
  }

  /** @param {RelationSpec} spec @returns {Relation} */
  const relation = (spec) => ({
    from_slug: resolve(entries, spec.from).slug,
    to_slug: resolve(entries, spec.to).slug,
    type: spec.type,
    note: spec.note,
  });
  const relations = supplement.relations.map(relation);
  for (const c of supplement.credentials) {
    relations.push({
      from_slug: resolve(entries, { file: "credential", credential_id: c.credential_id }).slug,
      to_slug: resolve(entries, c.certifies).slug,
      type: "certifies",
      note: c.source,
    });
  }

  return { entries, relations, links, suggested: supplement.suggested.map(relation) };
}
