/**
 * app/(explorer)/section-tiles.tsx — the six tiles themselves (S7).
 *
 * A server component, and the reason the client island can stay as small as it
 * is: the tiles are rendered here — hrefs from the route table, labels from
 * `SECTIONS`, icons inlined from the Phase 0 assets — and handed to `<TileRow>`
 * as children. No label, href or SVG ever crosses into the browser bundle, and
 * the row is byte-identical in both renderings because there is only one.
 *
 * These are the same `<a>`s the recruiter render has shipped since S5. With
 * JavaScript disabled they are six ordinary links, which is a spine acceptance
 * item; `section-tiles.test.tsx` pins that by rendering this component to
 * static markup, with no `tabindex` anywhere in the output.
 *
 * The label is a **sibling** of the icon, never a descendant of it: the icon
 * span is `aria-hidden`, so a label inside it would leave the link with no
 * accessible name at all.
 */

import Link from "next/link";
import { SECTIONS, sectionHref } from "../../lib/routes/table";
import { tileIcon } from "./tiles";
import styles from "./explorer.module.css";

export function SectionTiles() {
  return (
    <>
      {SECTIONS.map((section) => (
        <li key={section.segment} className={styles.tile}>
          <Link href={sectionHref(section)} data-tile className={styles.tileLink}>
            <span
              className={styles.tileIcon}
              // Hand-drawn Phase 0 icon, stripped and marked decorative by
              // tiles.ts. Static, repo-owned SVG — never user input.
              dangerouslySetInnerHTML={{ __html: tileIcon(section.segment) }}
            />
            <span className={styles.tileLabel}>{section.label}</span>
          </Link>
        </li>
      ))}
    </>
  );
}
