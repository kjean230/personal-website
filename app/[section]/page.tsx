import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadSection } from "@/lib/routes/load";
import { entryHref, parseFacetParam, sectionFromSegment } from "@/lib/routes/table";
import { SITE_NAME } from "@/lib/site";
import { EntryDates } from "../entry-dates";
import styles from "../site.module.css";

// `/<section>` — one page file for every brief §4.3 section, resolved through
// the route table (lib/routes/table.ts): an unknown segment or facet is a
// 404, and the rows and chip counts come from lib/routes/load.ts, i.e. from
// the S4 queries. Reading `searchParams` (the `?facet=` chip) makes this
// route render at request time; the query layer's fetch Data Cache still
// bounds the database reads to one per hour per query.
//
// S6 renders the index proper on the S5 skeleton: each row is a heading link
// to the entry's canonical URL with its subtitle, dates and summary. The row
// keeps `data-status` and the trophy case keeps `category · status` as text —
// S8 turns those into the locked / in_progress / unlocked states, and S7
// renders the same rows as the tile row at the same URL.

export async function generateMetadata({ params }: PageProps<"/[section]">): Promise<Metadata> {
  const section = sectionFromSegment((await params).section);
  return { title: section ? `${section.label} — ${SITE_NAME}` : "Not found" };
}

function statusText(status: string): string {
  return status.replace("_", " ");
}

export default async function SectionPage({ params, searchParams }: PageProps<"/[section]">) {
  const section = sectionFromSegment((await params).section);
  if (!section) notFound();
  const facet = parseFacetParam((await searchParams).facet);
  if (!facet.ok) notFound();
  const page = await loadSection(section, facet.facet);

  return (
    <main id="main" className={styles.main}>
      <h1 className={styles.heading}>{section.label}</h1>
      <nav aria-label="Facets" className={styles.chips}>
        <ul className={styles.chipList}>
          {page.chips.map((chip) => (
            <li key={chip.facet ?? "all"}>
              <Link
                href={chip.href}
                className={styles.chip}
                aria-current={chip.active ? "page" : undefined}
              >
                {chip.label} ({chip.count})
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {page.entries.length === 0 ? (
        <p className={styles.note}>Nothing here yet.</p>
      ) : (
        <ul className={styles.entryList}>
          {page.entries.map((entry) => (
            <li key={entry.id} className={styles.indexEntry} data-status={entry.status}>
              <h2 className={styles.indexTitle}>
                <Link href={entryHref(entry)} className={styles.entryLink}>
                  {entry.title}
                </Link>
              </h2>
              {entry.subtitle && <p className={styles.subtitle}>{entry.subtitle}</p>}
              <EntryDates entry={entry} />
              {/* The trophy case names the category; elsewhere the status is
                  only worth saying when it is not the plain `unlocked`. */}
              {entry.kind === "certification" ? (
                <p className={styles.meta}>
                  {entry.metadata.category} · {statusText(entry.status)}
                </p>
              ) : (
                entry.status !== "unlocked" && <p className={styles.meta}>{statusText(entry.status)}</p>
              )}
              {entry.summary && <p className={styles.indexSummary}>{entry.summary}</p>}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
