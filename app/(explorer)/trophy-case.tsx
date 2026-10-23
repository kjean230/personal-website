import Link from "next/link";
import type { SectionPage } from "../../lib/routes/load";
import { entryHref } from "../../lib/routes/table";
import { EntryDates } from "../entry-dates";
import site from "../site.module.css";
import { Morph } from "./morph";
import { TileRow } from "./tile-row";
import { TrophyState } from "./trophy";
import styles from "./explorer.module.css";

// The existing certification index, rendered once on the server. Explorer
// adds the established card grid and keys; Recruiter and JS-off keep the
// original rows, wording and order. Detail records and their navigation are
// unchanged: these remain the section's actual marked morph openers.
export function TrophyCase({ entries, facet }: Pick<SectionPage, "entries" | "facet">) {
  if (entries.length === 0) return <p className={site.note}>Nothing here yet.</p>;

  return (
    <TileRow
      grid
      role="list"
      label="Certifications and awards"
      view={facet ?? "all"}
      className={`${site.entryList} ${styles.grid} ${styles.trophyCase}`}
    >
      {entries.map((entry) => (
        <Morph key={entry.id} slug={entry.slug}>
          <li className={`${site.indexEntry} ${styles.gridTile}`} data-status={entry.status} data-morph>
            <h2 className={site.indexTitle}>
              <Link
                href={entryHref(entry)}
                data-tile
                data-detail-opener="morph"
                className={`${site.entryLink} ${styles.gridLink}`}
              >
                {entry.title}
              </Link>
            </h2>
            {entry.subtitle && <p className={site.subtitle}>{entry.subtitle}</p>}
            <EntryDates entry={entry} />
            <p className={site.meta}>
              <TrophyState status={entry.status} />
              {entry.kind === "certification" && <> · {entry.metadata.category}</>}
            </p>
            {entry.summary && <p className={site.indexSummary}>{entry.summary}</p>}
          </li>
        </Morph>
      ))}
    </TileRow>
  );
}
