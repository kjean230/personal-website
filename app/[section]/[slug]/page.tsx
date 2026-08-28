import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Fragment, cache } from "react";
import { TAG_CATEGORIES, type Entry, type Tag, type TagCategory } from "@/lib/content/schema";
import { renderMarkdown } from "@/lib/render/markdown";
import { loadEntry, type RelatedLink } from "@/lib/routes/load";
import { sectionFromSegment, sectionHref } from "@/lib/routes/table";
import { SITE_NAME } from "@/lib/site";
import { EntryDates } from "../../entry-dates";
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
// tags (on-demand ISR); without it Next would render every request.
//
// S6 renders the record: dates at their recorded precision, the markdown body
// through the lib/render/markdown.ts boundary (nothing else may inject HTML
// here), the typed metadata as a <dl>, the external links and the tags. Media
// is deliberately absent — no Storage bucket exists yet, so there is no public
// URL to build (PROMPTS.md S6 decision 3); it lands with feat/admin-media.

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
      resolved?.result.kind === "found"
        ? `${resolved.result.detail.entry.title} — ${SITE_NAME}`
        : "Not found",
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

const TAG_HEADINGS: Record<TagCategory, string> = {
  skill: "Skills",
  tool: "Tools",
  domain: "Domains",
  team: "Teams",
};

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

export default async function EntryPage({ params }: PageProps<"/[section]/[slug]">) {
  const { section: segment, slug } = await params;
  const resolved = await resolve(segment, slug);
  if (!resolved) notFound();
  const { section, result } = resolved;
  if (result.kind === "not-found") notFound();
  if (result.kind === "redirect") permanentRedirect(result.href);
  const { entry, links, tags } = result.detail;
  const rows = detailRows(entry);
  const tagGroups = tagsByCategory(tags);

  return (
    <main id="main" className={styles.main}>
      <article className={styles.article}>
        <p className={styles.crumb}>
          <Link href={sectionHref(section)}>{section.label}</Link>
        </p>
        <h1 className={styles.heading}>{entry.title}</h1>
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
            <h2 className={styles.subheading}>Links</h2>
            <ul className={styles.linkList}>
              {links.map((link) => (
                <li key={link.id} className={styles.linkItem}>
                  {/* http(s) only, by the links_url_http CHECK. No target: a
                      new tab is the visitor's choice, not the page's. */}
                  <a href={link.url} rel="noopener" className={styles.chip}>
                    {link.label}
                  </a>
                  <span className={styles.meta}>{link.kind}</span>
                </li>
              ))}
            </ul>
          </>
        )}
        {tagGroups.length > 0 && (
          <>
            <h2 className={styles.subheading}>Tags</h2>
            {tagGroups.map(([category, group]) => (
              <div key={category} className={styles.tagGroup}>
                <h3 className={styles.tagHeading}>{TAG_HEADINGS[category]}</h3>
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
