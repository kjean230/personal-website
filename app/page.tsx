import { readFileSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import { RESUME_HREF, SECTIONS, sectionHref } from "@/lib/routes/table";
import styles from "./page.module.css";

// The KJ badge is read from the Phase 0 assets at build time so the mark keeps
// exactly one source (design/assets/mark/). The home page is the route
// table's top level: the six brief §4.3 sections and the resume, as plain
// links. It reads no content, so it stays static (and is the Lighthouse
// target). Recruiter mode renders it as is; the console shell (S7) turns the
// same links into the tile row at the same URLs.
const badge = readFileSync(
  join(process.cwd(), "design/assets/mark/kj-badge.svg"),
  "utf8",
);

export default function Home() {
  return (
    <main id="main" className={styles.main}>
      <div
        className={styles.badge}
        // Static, repo-owned SVG (linted by design/tokens/build.mjs), not user input.
        dangerouslySetInnerHTML={{ __html: badge }}
      />
      <h1 className={styles.title}>Kerwyn Jean</h1>
      <nav aria-label="Sections" className={styles.sections}>
        <ul className={styles.sectionList}>
          {SECTIONS.map((section) => (
            <li key={section.segment}>
              <Link href={sectionHref(section)} className={styles.sectionLink}>
                {section.label}
              </Link>
            </li>
          ))}
          <li>
            <Link href={RESUME_HREF} className={styles.sectionLink}>
              Resume
            </Link>
          </li>
        </ul>
      </nav>
    </main>
  );
}
