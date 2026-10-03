import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { websiteJsonLd } from "@/lib/render/json-ld";
import { HOME_HREF, RESUME_HREF } from "@/lib/routes/table";
import { JsonLd } from "./json-ld";
import { KeyHints } from "./(explorer)/key-hints";
import { ProfileSelect } from "./(explorer)/profile-select";
import { SectionTiles } from "./(explorer)/section-tiles";
import { TileRow } from "./(explorer)/tile-row";
import explorer from "./(explorer)/explorer.module.css";
import styles from "./page.module.css";

// The KJ badge is read from the Phase 0 assets at build time so the mark keeps
// exactly one source (design/assets/mark/). The home page is the route
// table's top level: the six brief §4.3 sections and the resume.
//
// S7 makes those links the console tile row (brief §5). It is the same <ul> of
// <a>s, in SECTIONS order, with each section's icon inlined on the server and
// <TileRow> wrapped around it for the keyboard grammar — there is no mode
// switch and no second markup tree, because mode is not a URL dimension. With
// JavaScript disabled the tile row is six links, which is the point.
//
// The page still reads no content, so it stays static: tiles carry no counts,
// and a section with no entries shows its own empty state on /<section>
// rather than being hidden here, which would make a real URL unreachable.
const badge = readFileSync(
  join(process.cwd(), "design/assets/mark/kj-badge.svg"),
  "utf8",
);

// The title and description are the layout's; this page adds its canonical.
export const metadata: Metadata = { alternates: { canonical: HOME_HREF } };

export default function Home() {
  return (
    <>
      <main id="main" className={styles.main}>
        <div
          className={styles.badge}
          // Static, repo-owned SVG (linted by design/tokens/build.mjs), not user input.
          dangerouslySetInnerHTML={{ __html: badge }}
        />
        <h1 className={styles.title}>Kerwyn Jean</h1>
        <nav aria-label="Sections" className={styles.sections}>
          <TileRow>
            <SectionTiles />
          </TileRow>
          {/* Resume sits beside the row, not in it: it is a real route-table
              destination but not one of the brief §4.3 sections the arrows walk,
              and a seventh <li> would put the row's count and its DOM at odds.
              Brief §2.2's "one action from anywhere" is already carried by the
              site header on every page; DOM order keeps this the next Tab stop
              after the row. */}
          <p className={explorer.aside}>
            <Link href={RESUME_HREF} className={explorer.asideLink}>
              Resume
            </Link>
          </p>
        </nav>
        <KeyHints />
        <JsonLd data={websiteJsonLd()} />
      </main>
      {/* The boot and the profile select (brief §5), on this page and no other:
          a deep link is the plain recruiter page. A closed <dialog> — nothing
          here renders until a script opens it, so with JavaScript disabled the
          page above is the whole page. After <main>, so the document's one
          <h1> still comes before the dialog's <h2>. */}
      <ProfileSelect />
    </>
  );
}
