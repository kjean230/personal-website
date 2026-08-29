/**
 * app/(explorer)/trophy.tsx — `entries.status` as a trophy state (S8).
 *
 * Brief §5 renders certifications and awards as a trophy case, "with locked /
 * in-progress / unlocked states", and the schema's `status` is the closed set
 * `unlocked | in_progress | archived`. The two lists are the same length but
 * not the same words, and this file is where that is settled: **three statuses,
 * three states, three drawings, one to one.** The third state is called
 * *Archived*, not *Locked* — an archived credential is one you earned and that
 * has lapsed, not one you never achieved, and calling it "locked" would tell a
 * visitor something untrue. The hollow cup still draws it (see `TROPHY_ICONS`).
 *
 * A server component. `Status` is imported **type-only**, so nothing new
 * reaches any bundle, and `Readonly<Record<Status, string>>` makes coverage a
 * `tsc` error rather than a runtime throw: adding a fourth status to the schema
 * fails the typecheck here until someone decides what it looks like.
 *
 * Two shape rules, both load-bearing:
 *
 *  1. It renders a `<span>`, never a `<p>`. The call site wraps it in the meta
 *     line's existing `<p>`, and a `<p>` inside a `<p>` is invalid HTML that
 *     browsers silently reparse.
 *  2. The label is a **sibling text node** of the glyph, not a `title` or an
 *     `aria-label` on it. The glyph is `aria-hidden` (`inlineIcon` marks it so),
 *     which means the state is carried by real text — legible with images off,
 *     in both themes, and never by icon or colour alone (WCAG 1.4.1, brief §2.2).
 */

import type { Status } from "../../lib/content/schema";
import { TROPHY_ICONS } from "./tiles";
import styles from "./explorer.module.css";

/**
 * Status → the words shown on the row. Total over `Status` by construction;
 * `trophy.test.tsx` pins it against the schema's `STATUSES` at runtime too, so
 * the two cannot drift silently.
 */
export const TROPHY_LABELS: Readonly<Record<Status, string>> = {
  unlocked: "Unlocked",
  in_progress: "In progress",
  archived: "Archived",
};

/**
 * One trophy state marker: the drawing plus its name. `data-status` carries the
 * raw value for styling and for the smoke tests, and duplicates nothing the
 * text does not already say.
 */
export function TrophyState({ status }: { status: Status }) {
  return (
    <span className={styles.trophy} data-status={status}>
      <span
        className={styles.trophyIcon}
        // Hand-drawn Phase 0 icon, stripped and marked decorative by tiles.ts.
        // Static, repo-owned SVG — never user input.
        dangerouslySetInnerHTML={{ __html: TROPHY_ICONS[status] }}
      />
      {TROPHY_LABELS[status]}
    </span>
  );
}
