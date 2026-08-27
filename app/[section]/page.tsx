import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadSection } from "@/lib/routes/load";
import { entryHref, parseFacetParam, sectionFromSegment } from "@/lib/routes/table";
import styles from "../site.module.css";

// `/<section>` — one page file for every brief §4.3 section, resolved through
// the route table (lib/routes/table.ts): an unknown segment or facet is a
// 404, and the rows and chip counts come from lib/routes/load.ts, i.e. from
// the S4 queries. Reading `searchParams` (the `?facet=` chip) makes this
// route render at request time; the query layer's fetch Data Cache still
// bounds the database reads to one per hour per query. This is the skeleton
// both renderers bind to — S6 renders the section index on it, S7 the tile
// row at the same URL; nothing here is presentation beyond semantic HTML.

const SITE = "Kerwyn Jean";

export async function generateMetadata({ params }: PageProps<"/[section]">): Promise<Metadata> {
  const section = sectionFromSegment((await params).section);
  return { title: section ? `${section.label} — ${SITE}` : "Not found" };
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
            <li key={entry.id} className={styles.entry} data-status={entry.status}>
              <Link href={entryHref(entry)} className={styles.entryLink}>
                {entry.title}
              </Link>
              {entry.subtitle && <span className={styles.subtitle}>{entry.subtitle}</span>}
              {entry.kind === "certification" && (
                <span className={styles.meta}>
                  {entry.metadata.category} · {statusText(entry.status)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
