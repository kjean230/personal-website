import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import { loadEntry, type RelatedLink } from "@/lib/routes/load";
import { sectionFromSegment, sectionHref } from "@/lib/routes/table";
import styles from "../../site.module.css";

// `/<section>/<slug>` — the canonical URL of one entry (brief §2.2:
// /experience/guardian). The slug alone identifies the entry
// (`getEntryBySlug`); the route table decides whether this section is its
// canonical one: no entry → 404, another section → 308 to the canonical URL,
// otherwise the record with its relations as links to *their* canonical
// URLs — brief §4.1's multi-placement is a set of links, never a copy.
//
// `generateStaticParams` returns nothing, which makes this route render on
// first request and then cache under the query layer's 3600 s window and
// tags (on-demand ISR); without it Next would render every request. S6
// renders the detail page (body, dates, links, media, tags) on this skeleton.

const SITE = "Kerwyn Jean";

export function generateStaticParams(): { section: string; slug: string }[] {
  return [];
}

/** One lookup shared by `generateMetadata` and the page within a render. */
const resolve = cache(async (segment: string, slug: string) => {
  const section = sectionFromSegment(segment);
  return section ? { section, result: await loadEntry(section, slug) } : null;
});

export async function generateMetadata({ params }: PageProps<"/[section]/[slug]">): Promise<Metadata> {
  const { section, slug } = await params;
  const resolved = await resolve(section, slug);
  return {
    title:
      resolved?.result.kind === "found" ? `${resolved.result.detail.entry.title} — ${SITE}` : "Not found",
  };
}

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

export default async function EntryPage({ params }: PageProps<"/[section]/[slug]">) {
  const { section: segment, slug } = await params;
  const resolved = await resolve(segment, slug);
  if (!resolved) notFound();
  const { section, result } = resolved;
  if (result.kind === "not-found") notFound();
  if (result.kind === "redirect") permanentRedirect(result.href);
  const { entry } = result.detail;

  return (
    <main id="main" className={styles.main}>
      <article className={styles.article}>
        <p className={styles.crumb}>
          <Link href={sectionHref(section)}>{section.label}</Link>
        </p>
        <h1 className={styles.heading}>{entry.title}</h1>
        {entry.subtitle && <p className={styles.subtitle}>{entry.subtitle}</p>}
        {entry.summary && <p className={styles.summary}>{entry.summary}</p>}
        {result.related.length > 0 && (
          <nav aria-label="Related" className={styles.related}>
            <h2 className={styles.subheading}>Related</h2>
            <ul className={styles.entryList}>
              {result.related.map((link) => (
                <li key={`${link.direction}:${link.type}:${link.entry.id}`} className={styles.entry}>
                  <span className={styles.meta}>{relationLabel(link)}</span>
                  <Link href={link.href} className={styles.entryLink}>
                    {link.entry.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </article>
    </main>
  );
}
