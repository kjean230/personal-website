import type { Metadata } from "next";
import styles from "../site.module.css";

// `/resume` — brief §2.2: plain HTML, reachable in one action from anywhere
// (the site header links it). The route exists from S5 so that link is real;
// S6 (`feat/spine-recruiter`) renders the resume itself. No content is read
// here, so the page is static.

export const metadata: Metadata = { title: "Resume — Kerwyn Jean" };

export default function ResumePage() {
  return (
    <main id="main" className={styles.main}>
      <h1 className={styles.heading}>Resume</h1>
      <p className={styles.note}>Under construction.</p>
    </main>
  );
}
