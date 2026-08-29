import type { Metadata } from "next";
import Link from "next/link";
import { loadResume } from "@/lib/routes/load";
import { entryHref } from "@/lib/routes/table";
import { SITE_NAME } from "@/lib/site";
import { EntryDates } from "../entry-dates";
import styles from "../site.module.css";

// `/resume` — brief §2.2: plain HTML, reachable in one action from anywhere
// (the site header links it). Entries only: the name comes from the layout's
// one constant, and there is deliberately no contact block, headline or
// profile link. A contact line needs owner-supplied values and belongs to
// feat/recruiter-resume-print.
//
// Rendering mode: this route reads content but takes no dynamic input, so it
// prerenders at build and revalidates on the query layer's inherited 3600 s
// window and `content` tags (the build glyph stays ○; ISR shows only in the
// revalidate column). That makes NEXT_PUBLIC_SUPABASE_URL and
// NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY build-time inputs, not just runtime
// ones — CI's build and lighthouse jobs and Vercel already carry them.

export const metadata: Metadata = { title: `Resume — ${SITE_NAME}` };

export default async function ResumePage() {
  const { sections } = await loadResume();

  return (
    <main id="main" className={styles.main}>
      <h1 className={styles.heading}>{SITE_NAME}</h1>
      {sections.map((section) => (
        <section key={section.id} aria-labelledby={`resume-${section.id}`} className={styles.resumeSection}>
          <h2 id={`resume-${section.id}`} className={styles.subheading}>
            {section.label}
          </h2>
          {section.entries.length === 0 ? (
            <p className={styles.note}>Nothing here yet.</p>
          ) : (
            <ul className={styles.entryList}>
              {section.entries.map(({ entry, links }) => (
                <li key={entry.id}>
                  <article className={styles.resumeRow} data-status={entry.status}>
                    <h3 className={styles.resumeTitle}>
                      <Link href={entryHref(entry)} className={styles.entryLink}>
                        {entry.title}
                      </Link>
                    </h3>
                    {entry.subtitle && <p className={styles.subtitle}>{entry.subtitle}</p>}
                    <EntryDates entry={entry} />
                    {entry.summary && <p className={styles.indexSummary}>{entry.summary}</p>}
                    {links.length > 0 && (
                      <ul className={styles.linkList}>
                        {links.map((link) => (
                          <li key={link.id} className={styles.linkItem}>
                            <a href={link.url} rel="noopener" className={styles.chip}>
                              {link.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </main>
  );
}
