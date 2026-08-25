import { readFileSync } from "node:fs";
import { join } from "node:path";
import styles from "./page.module.css";

// The KJ badge is read from the Phase 0 assets at build time so the mark keeps
// exactly one source (design/assets/mark/). This placeholder exists to prove
// the scaffold, the token stylesheet, and the fonts load; the real routes
// arrive with the shared route table (S5) and the renderers (S6, S7).
const badge = readFileSync(
  join(process.cwd(), "design/assets/mark/kj-badge.svg"),
  "utf8",
);

export default function Home() {
  return (
    <main className={styles.main}>
      <div
        className={styles.badge}
        // Static, repo-owned SVG (linted by design/tokens/build.mjs), not user input.
        dangerouslySetInnerHTML={{ __html: badge }}
      />
      <h1 className={styles.title}>Kerwyn Jean</h1>
      <p className={styles.note}>Under construction.</p>
    </main>
  );
}
