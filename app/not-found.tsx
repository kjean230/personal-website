import type { Metadata } from "next";
import Link from "next/link";
// Relative, not the `@/` alias: this file has a test beside it and Vitest
// resolves no tsconfig paths (the same reason app/(explorer)/* import this way).
import { RESUME_HREF, SECTIONS, sectionHref } from "../lib/routes/table";
import { SITE_NAME } from "../lib/site";
import styles from "./site.module.css";

// app/not-found.tsx — the 404 page (BUILD_PLAN §7 box 18's other half).
//
// Three call sites already reach it and until now got Next's built-in page:
// `notFound()` in app/[section]/page.tsx for an unknown segment or an invalid
// `?facet=`, `notFound()` in app/[section]/[slug]/page.tsx for a slug no entry
// owns, and every URL the router matches nothing at all.
//
// A server component, so listing the sections costs no client bytes even
// though lib/routes/table.ts reaches zod through lib/content/schema.ts. The
// list is read from `SECTIONS` rather than written out: adding a section is
// meant to be one entry in that array and no other edit (S5), and a hand-typed
// list here would quietly become the exception.
//
// It reads no content — no counts, no entries — so `/_not-found` stays a
// static route and a Data API outage cannot turn a 404 into a 500.
//
// Like app/error.tsx it mounts no shell island: `<KeyHints>` brings
// `<BackKey>` with it, and a page that exists because a URL resolved to
// nothing has no "up one level" to bind Escape to. The links are the
// affordance, and the layout's header renders around them.

export const metadata: Metadata = { title: `Not found — ${SITE_NAME}` };

export default function NotFound() {
  return (
    <main id="main" className={styles.main}>
      <h1 className={styles.heading}>Page not found</h1>
      <p className={styles.note}>
        That URL does not match anything here. It may have been mistyped, or an entry it pointed
        at may have been renamed.
      </p>
      <nav aria-label="Sections" className={styles.chips}>
        <ul className={styles.chipList}>
          {SECTIONS.map((section) => (
            <li key={section.segment}>
              <Link href={sectionHref(section)} className={styles.chip}>
                {section.label}
              </Link>
            </li>
          ))}
          <li>
            <Link href={RESUME_HREF} className={styles.chip}>
              Resume
            </Link>
          </li>
        </ul>
      </nav>
    </main>
  );
}
