import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { breadcrumbJsonLd } from "@/lib/render/json-ld";
import { loadAll } from "@/lib/routes/load";
import { ALL_HREF, ALL_LABEL, HOME_HREF, SEARCH_PARAM, parseSearchParam } from "@/lib/routes/table";
import { SITE_NAME } from "@/lib/site";
import { AllSoftware } from "../(explorer)/all-software";
import { KeyHints } from "../(explorer)/key-hints";
import explorer from "../(explorer)/explorer.module.css";
import { JsonLd } from "../json-ld";
import styles from "../site.module.css";

// `/all` — the "All Software" index (brief §5: "full searchable index of every
// entry"; feat/shell-tile-grid). One page file for the URL, like every other:
// a static route beside `/[section]`, which Next resolves first, so `all` can
// never be read as a section segment. What it lists and how a search narrows
// it is `loadAll` (lib/routes/load.ts); what it looks like in each mode is
// `(explorer)/all-software.tsx` and its stylesheet.
//
// Reading `searchParams` (`?q=`) makes this route render at request time, as
// `?facet=` does for `/[section]`. The query layer's fetch Data Cache still
// bounds the database reads to one per hour per kind, and a search adds none:
// it narrows the cached lists in code.
//
// Canonical: always the bare `/all`. A search is a subset of the index, not a
// page of its own — the same rule a `?facet=` view follows — so it is never in
// the sitemap. A `q` the page will 404 on gets no canonical at all.

export async function generateMetadata({ searchParams }: PageProps<"/all">): Promise<Metadata> {
  const title = `${ALL_LABEL} — ${SITE_NAME}`;
  if (!parseSearchParam((await searchParams)[SEARCH_PARAM]).ok) return { title };
  return { title, alternates: { canonical: ALL_HREF } };
}

export default async function AllPage({ searchParams }: PageProps<"/all">) {
  const search = parseSearchParam((await searchParams)[SEARCH_PARAM]);
  if (!search.ok) notFound();
  const page = await loadAll(search.query);

  return (
    <main id="main" className={`${styles.main} ${explorer.allMain}`}>
      <h1 className={styles.heading}>{ALL_LABEL}</h1>
      <AllSoftware page={page} />
      {/* Escape = B = Back: up one level, to the tile row. Escape in the search
          field stays the field's — `isBackKey` never takes it from an input. */}
      <KeyHints backHref={HOME_HREF} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: SITE_NAME, path: HOME_HREF },
          { name: ALL_LABEL, path: ALL_HREF },
        ])}
      />
    </main>
  );
}
