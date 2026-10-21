import Link from "next/link";
import { Fragment } from "react";
// Relative, not the `@/` alias: this file has a test beside it, and Vitest
// resolves no tsconfig paths (entry-dates.tsx states the same rule).
import { TAG_CATEGORIES, type Entry, type Tag, type TagCategory } from "../lib/content/schema";
import { renderMarkdown } from "../lib/render/markdown";
import type { EntryPage, RelatedLink } from "../lib/routes/load";
import { sectionHref } from "../lib/routes/table";
import { TAG_CATEGORY_LABELS } from "./(explorer)/groups";
import { MorphTarget } from "./(explorer)/morph";
import { TileRow } from "./(explorer)/tile-row";
import { HINT_ICONS, tileIcon } from "./(explorer)/tiles";
import explorer from "./(explorer)/explorer.module.css";
import { EntryDates } from "./entry-dates";
import styles from "./site.module.css";

// The record on `/<section>/<slug>` — S6's entry page, moved out of the page
// file by feat/shell-detail-panel so it can be rendered to static markup under
// test, as the index and the chips are. Not a route file.
//
// One markup, two renderings, like every other page. What the server sends is
// the recruiter document, in the order and wording S6 gave it: the section
// link, the title, subtitle, dates, summary, the markdown body, the typed
// metadata, Links, Tags, Related. With validated Explorer opener provenance the stylesheet
// draws the same nodes as the detail panel (brief §5) — a raised sheet, the
// record on the left and a rail on the right. Nothing is rendered twice.
//
// What the panel adds to the markup is inert outside Explorer mode, and the
// owner's rule is that a Recruiter, no-mode or JavaScript-off visitor sees no
// difference at all:
//  - two wrappers with no style of their own, which only the panel lays out;
//  - the section's drawing as the panel's face, and a Back control — both in
//    the HTML for every mode and hidden until a valid panel context exists,
//    as the link to the index is on the home page;
//  - `tabIndex={-1}` on the title, so script can put focus there when a card
//    opens the panel. It is never a tab stop;
//  - `data-origin` on each Related link and `<TileRow explorerOnly>` around
//    Links and Related, which act only in Explorer mode.
//
// Tags stay plain pills and Related stays one list (owner's decision): both
// are shared markup, and a recruiter page does not link to `/all`.
//
// Media is deliberately absent — no Storage bucket exists yet, so there is no
// public URL to build (PROMPTS.md S6 decision 3; BUILD_PLAN §5). `detail.media`
// is never read here, and entry-record.test.tsx holds that.

type FoundEntry = Extract<EntryPage, { kind: "found" }>;

/** Reads the edge as `<from> <type> <to>` from this entry's side. */
function relationLabel(link: RelatedLink): string {
  const outgoing = link.direction === "outgoing";
  switch (link.type) {
    case "part_of":
      return outgoing ? "Part of" : "Includes";
    case "certifies":
      return outgoing ? "Certifies" : "Certified by";
    case "produced_by":
      return outgoing ? "Produced by" : "Produced";
    case "related_to":
      return "Related to";
  }
}

/**
 * What tells one Related row from every other on the page: which way the edge
 * runs, its type, and the entry at its far end. `entry_relations`' primary key
 * is `(from, to, type)`, so no two rows of one record share all three — two
 * rows can lead to the same entry and still be told apart. It is the row's
 * React key and its `data-origin`, which is how focus finds its way back to
 * the exact row that opened another detail.
 */
function relationOrigin(link: RelatedLink): string {
  return `${link.direction}:${link.type}:${link.entry.id}`;
}

/**
 * The typed metadata worth showing, per kind. `location` is not here — it
 * rides the dates line — and `credential_url` is not either: it duplicates the
 * entry's `links` row of kind `profile`, which the Links list already renders.
 * @returns the `<dl>` rows, empty when the entry carries none of them.
 */
function detailRows(entry: Entry): { term: string; value: string }[] {
  const rows: { term: string; value: string }[] = [];
  if (entry.kind === "experience" && entry.metadata.cause) {
    rows.push({ term: "Cause", value: entry.metadata.cause });
  }
  if (entry.kind === "education" && entry.metadata.activities) {
    rows.push({ term: "Activities and societies", value: entry.metadata.activities });
  }
  if (entry.kind === "certification" && entry.metadata.credential_id) {
    rows.push({ term: "Credential ID", value: entry.metadata.credential_id });
  }
  return rows;
}

/** @returns the entry's tags bucketed by category, in `TAG_CATEGORIES` order, skipping empty buckets. */
function tagsByCategory(tags: readonly Tag[]): [TagCategory, Tag[]][] {
  return TAG_CATEGORIES.map(
    (category) => [category, tags.filter((tag) => tag.category === category)] as [TagCategory, Tag[]],
  ).filter(([, group]) => group.length > 0);
}

/** The id of the Links heading; the list under it takes its name from it. */
const LINKS_HEADING_ID = "detail-links";

export function EntryRecord({ page }: { page: FoundEntry }) {
  const { section, related } = page;
  const { entry, links, tags } = page.detail;
  const rows = detailRows(entry);
  const tagGroups = tagsByCategory(tags);

  return (
    <MorphTarget slug={entry.slug} href={page.href}>
      <article className={`${styles.article} ${explorer.panel}`} data-detail>
        <div className={explorer.record}>
          <span
            className={explorer.gridIcon}
            // The section's own drawing, as on the entry's card in the index.
            // Static, repo-owned SVG, stripped and marked decorative by tiles.ts.
            dangerouslySetInnerHTML={{ __html: tileIcon(section.segment) }}
          />
          <p className={styles.crumb}>
            <Link href={sectionHref(section)}>{section.label}</Link>
          </p>
          <h1 className={styles.heading} tabIndex={-1} data-detail-title>
            {entry.title}
          </h1>
          {/* After the title on purpose: focus lands on the title when a card
              opens the panel, and this is then the first thing Tab reaches. A
              real link to the section, so it works with no script at all;
              detail-keys.tsx only ever turns a plain click into a step back. */}
          <Link href={sectionHref(section)} data-back aria-keyshortcuts="Escape" className={explorer.back}>
            <span className={explorer.hintIcon} dangerouslySetInnerHTML={{ __html: HINT_ICONS.b }} />
            Back
          </Link>
          {entry.subtitle && <p className={styles.subtitle}>{entry.subtitle}</p>}
          <EntryDates entry={entry} location={entry.metadata.location} />
          {entry.summary && <p className={styles.summary}>{entry.summary}</p>}
          {entry.body && (
            <div
              className={styles.body}
              // Escaped and href-allowlisted by lib/render/markdown.ts — the one
              // place raw HTML is produced, and the only thing allowed to.
              dangerouslySetInnerHTML={{ __html: renderMarkdown(entry.body) }}
            />
          )}
        </div>
        <div className={explorer.detailRail}>
          {rows.length > 0 && (
            // Only dt/dd children: axe's definition-list rule fails anything else.
            <dl className={styles.detailList}>
              {rows.map((row) => (
                <Fragment key={row.term}>
                  <dt className={styles.detailTerm}>{row.term}</dt>
                  <dd className={styles.detailValue}>{row.value}</dd>
                </Fragment>
              ))}
            </dl>
          )}
          {links.length > 0 && (
            <>
              <h2 id={LINKS_HEADING_ID} className={styles.subheading}>
                Links
              </h2>
              <TileRow explorerOnly panelOnly className={styles.linkList} labelledBy={LINKS_HEADING_ID}>
                {links.map((link) => (
                  <li key={link.id} className={styles.linkItem}>
                    {/* http(s) only, by the links_url_http CHECK. No target: a
                        new tab is the visitor's choice, not the page's. */}
                    <a href={link.url} rel="noopener" data-tile className={styles.chip}>
                      {link.label}
                    </a>
                    <span className={styles.meta}>{link.kind}</span>
                  </li>
                ))}
              </TileRow>
            </>
          )}
          {tagGroups.length > 0 && (
            <>
              <h2 className={styles.subheading}>Tags</h2>
              {tagGroups.map(([category, group]) => (
                <div key={category} className={styles.tagGroup}>
                  <h3 className={styles.tagHeading}>{TAG_CATEGORY_LABELS[category]}</h3>
                  <ul className={styles.tagList}>
                    {group.map((tag) => (
                      <li key={tag.id} className={styles.tag}>
                        {tag.label}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </>
          )}
          {related.length > 0 && (
            <nav aria-label="Related" className={styles.related}>
              <h2 className={styles.subheading}>Related</h2>
              <TileRow explorerOnly panelOnly className={styles.entryList}>
                {related.map((link) => (
                  <li key={relationOrigin(link)} className={styles.entry}>
                    <span className={styles.meta}>{relationLabel(link)}</span>
                    <Link href={link.href} data-tile data-detail-opener="related" data-origin={relationOrigin(link)} className={styles.entryLink}>
                      {link.entry.title}
                    </Link>
                  </li>
                ))}
              </TileRow>
            </nav>
          )}
        </div>
      </article>
    </MorphTarget>
  );
}
