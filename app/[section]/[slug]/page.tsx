import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import { breadcrumbJsonLd } from "@/lib/render/json-ld";
import { loadEntry } from "@/lib/routes/load";
import { HOME_HREF, sectionFromSegment, sectionHref } from "@/lib/routes/table";
import { SITE_NAME } from "@/lib/site";
import { KeyHints } from "../../(explorer)/key-hints";
import { EntryRecord } from "../../entry-record";
import { JsonLd } from "../../json-ld";
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
// The record itself is `<EntryRecord>` (app/entry-record.tsx): S6's document,
// which feat/shell-detail-panel also draws as the detail panel in Explorer
// mode — the same markup at the same URL, so there is no panel route and no
// overlay. This file keeps what only a page file may do: resolve the URL, and
// call `notFound()` / `permanentRedirect()`.
//
// `<KeyHints detail>` is what makes this page a detail to the shell: Escape
// and the Back control follow the detail's rule ((explorer)/detail-keys.tsx),
// and the trail knows which page it has arrived at.
//
// Canonical (feat/recruiter-seo): the loader's own `href` — the URL a
// wrong-section request 308s to — and only when the entry was found, so a 404
// never names one.

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
  if (resolved?.result.kind !== "found") return { title: "Not found" };
  const { detail, href } = resolved.result;
  return {
    title: `${detail.entry.title} — ${SITE_NAME}`,
    alternates: { canonical: href },
  };
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
      <EntryRecord page={result} />
      {/* Escape = B = Back. In Recruiter mode: up one level, to this entry's
          section — the destination the crumb link points at. In Explorer mode:
          back to whatever opened the panel, when that is on this site. */}
      <KeyHints backHref={sectionHref(section)} detail={result.href} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: SITE_NAME, path: HOME_HREF },
          { name: section.label, path: sectionHref(section) },
          { name: entry.title, path: result.href },
        ])}
      />
    </main>
  );
}
