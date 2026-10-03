/**
 * app/(explorer)/all-software.tsx — the "All Software" index and the link to it
 * (feat/shell-tile-grid, brief §5: "full searchable index of every entry").
 *
 * Server components. `app/all/page.tsx` is the route; this is what it renders,
 * kept here so it can be rendered to static markup under test, as
 * `section-tiles.tsx` is.
 *
 * One markup, two renderings. What the server sends is the recruiter index:
 * the same rows a section page lists — a heading link to the entry's canonical
 * URL, its subtitle, dates and summary — with a search form above them. Under
 * `data-mode="explorer"` the stylesheet turns that list into a grid of tiles
 * and `<TileRow grid>` gives it the arrow keys. Nothing is rendered twice, and
 * with JavaScript disabled there is no mode, so it is the plain list.
 *
 * Search is a GET form and nothing else (owner's decision, handoff
 * feat-shell-tile-grid.md): `/all?q=<words>` is a real URL, the server narrows
 * the list (`loadAll`), and no script is involved. The summary is always on
 * the row, never revealed on hover — it is one of the three fields a search
 * reads, so a match has to be something the visitor can see.
 *
 * Groups (feat/shell-facets) sits between the form and the list: the facet
 * and tag chips of `groups.tsx`. One thing narrows the index at a time, so the
 * form sends only `q` — a search drops the group — and no chip carries `q`.
 */

import Link from "next/link";
import type { AllPage } from "../../lib/routes/load";
import {
  ALL_HREF,
  ALL_LABEL,
  SEARCH_MAX_LENGTH,
  SEARCH_PARAM,
  entryHref,
  sectionForKind,
} from "../../lib/routes/table";
import { EntryDates } from "../entry-dates";
import site from "../site.module.css";
import { Groups } from "./groups";
import { TileRow } from "./tile-row";
import { ALL_ICON, tileIcon } from "./tiles";
import styles from "./explorer.module.css";

/**
 * The way into the index from the home page. Explorer mode only (owner's
 * decision): the stylesheet shows it under `data-mode="explorer"` and nowhere
 * else, so the recruiter home page is unchanged and a session that never chose
 * Explorer never meets it. The URL it points at works in either mode.
 *
 * The label is a sibling of the glyph, never inside it — the glyph is
 * `aria-hidden`, and the text is the link's only name.
 */
export function AllSoftwareLink() {
  return (
    <p className={styles.rail}>
      <Link href={ALL_HREF} className={styles.railLink}>
        <span
          className={styles.railIcon}
          // Hand-drawn Phase 0 icon, stripped and marked decorative by tiles.ts.
          // Static, repo-owned SVG — never user input.
          dangerouslySetInnerHTML={{ __html: ALL_ICON }}
        />
        {ALL_LABEL}
      </Link>
    </p>
  );
}

const plural = (count: number) => (count === 1 ? "entry" : "entries");

/**
 * The line above the list. A search keeps the wording it has had; a group
 * says how many of the entries it holds; and a group with nothing in it — a
 * tag no entry carries yet — says what an empty section page says.
 */
function statusLine(page: AllPage, query: string): string {
  const found = page.entries.length;
  const entries = `${page.total} ${plural(page.total)}`;
  if (page.filter.kind === "search") {
    return found === 0 ? `Nothing matches “${query}”.` : `${found} of ${entries} match “${query}”`;
  }
  if (found === 0) return "Nothing here yet.";
  return page.filter.kind === "none" ? entries : `${found} of ${entries}`;
}

export function AllSoftware({ page }: { page: AllPage }) {
  const { filter } = page;
  const searching = filter.kind === "search";
  const query = searching ? filter.query : "";
  const found = page.entries.length;
  // One grid per view. A chip is a soft navigation, which would otherwise keep
  // the island mounted with its tab stop on whichever card the last view left
  // it; a new key gives each narrowed list a grid that starts on its first.
  const view = filter.kind === "facet" ? filter.facet : filter.kind === "tag" ? filter.slug : query;

  return (
    <>
      <form role="search" method="get" action={ALL_HREF} className={styles.search}>
        <label htmlFor="search" className={styles.searchLabel}>
          Search
        </label>
        <input
          id="search"
          name={SEARCH_PARAM}
          type="search"
          defaultValue={query}
          maxLength={SEARCH_MAX_LENGTH}
          className={styles.searchInput}
        />
        <button type="submit" className={site.chipButton}>
          Search
        </button>
        {searching && (
          <Link href={ALL_HREF} className={site.chip}>
            Show all
          </Link>
        )}
      </form>
      <Groups facets={page.facets} tags={page.tags} />
      <p className={site.note}>{statusLine(page, query)}</p>
      {found > 0 && (
        <TileRow grid key={`${filter.kind}:${view}`} className={`${site.entryList} ${styles.grid}`}>
          {page.entries.map((entry) => {
            const section = sectionForKind(entry.kind);
            return (
              <li
                key={entry.id}
                className={`${site.indexEntry} ${styles.gridTile}`}
                data-status={entry.status}
              >
                {/* The section's own drawing: the index mixes kinds, and no
                    Storage-backed tile art renders before feat/shell-album-news. */}
                <span
                  className={styles.gridIcon}
                  dangerouslySetInnerHTML={{ __html: tileIcon(section.segment) }}
                />
                <h2 className={site.indexTitle}>
                  <Link
                    href={entryHref(entry)}
                    data-tile
                    className={`${site.entryLink} ${styles.gridLink}`}
                  >
                    {entry.title}
                  </Link>
                </h2>
                {entry.subtitle && <p className={site.subtitle}>{entry.subtitle}</p>}
                <EntryDates entry={entry} />
                {/* Which section the row belongs to — a section page never has
                    to say — and its status when that is not the plain
                    `unlocked`, as a section page does. Always text. */}
                <p className={site.meta}>
                  {section.label}
                  {entry.status !== "unlocked" && ` · ${entry.status.replace("_", " ")}`}
                </p>
                {entry.summary && <p className={site.indexSummary}>{entry.summary}</p>}
              </li>
            );
          })}
        </TileRow>
      )}
    </>
  );
}
