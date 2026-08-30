import styles from "../site.module.css";

// The contact block — the only place in the tree that carries contact details,
// and /resume is the only page that renders it (CLAUDE.md's rule, now scoped
// rather than absolute). The four values are settled in BUILD_PLAN §8
// (2026-08-29) and are exhaustive: no phone, no street address, no
// personal-site URL. They ship in public HTML and the email is scrapable; the
// owner was told and chose to include them, so nothing here is obfuscated and
// no mailto trick is applied.
//
// Extracted from page.tsx rather than inlined for two reasons: ResumePage is
// async and awaits loadResume(), so it cannot be rendered in a test without
// mocking the loader, and this gives the leak grep one path to exclude
// (see handoff/feat-recruiter-resume-print.md for the retargeted shape).
//
// The link text is the value verbatim, which is what makes the printed sheet
// usable without generated content — contrast the entry-row links, whose URLs
// site.module.css expands with attr(href) under @media print.

/** The four settled values, in the order they render. */
export const CONTACT = {
  location: "New York, NY",
  email: "kerwynjean123@gmail.com",
  linkedin: "https://www.linkedin.com/in/kerwynjean/",
  github: "https://github.com/kjean230",
} as const;

/**
 * The contact line under the resume's `<h1>`.
 * @returns an `<address>` — the element HTML defines for the contact details
 * of the nearest `<article>` or, here, of the document.
 */
export function Contact() {
  return (
    <address className={styles.contact}>
      <ul className={styles.linkList}>
        <li className={styles.linkItem}>{CONTACT.location}</li>
        <li className={styles.linkItem}>
          <a href={`mailto:${CONTACT.email}`} className={styles.chip}>
            {CONTACT.email}
          </a>
        </li>
        <li className={styles.linkItem}>
          <a href={CONTACT.linkedin} rel="noopener" className={styles.chip}>
            {CONTACT.linkedin}
          </a>
        </li>
        <li className={styles.linkItem}>
          <a href={CONTACT.github} rel="noopener" className={styles.chip}>
            {CONTACT.github}
          </a>
        </li>
      </ul>
    </address>
  );
}
