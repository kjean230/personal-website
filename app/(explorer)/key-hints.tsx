/**
 * app/(explorer)/key-hints.tsx — the `A Select · B Back` hint row (S7).
 *
 * Brief §2.1 lists "corner button hints (`A Select` / `B Back` style)" among
 * the interaction grammar this project borrows, and only the grammar: the
 * glyphs are the Phase 0 hand-drawn `hint-a.svg` / `hint-b.svg`, lettered A
 * and B, on this project's own palette. No manufacturer mark, no controller
 * silhouette, no rendered hardware (brief §2.1).
 *
 * A server component. It also mounts `<BackKey>` when a `backHref` is given,
 * so the binding ships with its own affordance and neither can be added
 * without the other. The home page passes no `backHref` — there is nothing
 * above `/` — so it gets the Select hint alone and no Escape binding.
 *
 * A `<p>` of `<span>`s, not a `<ul>`: two items announced as "list, 2 items"
 * is noise, and `/` already has two labelled landmarks ("Site", "Sections").
 * The glyphs are decorative; the `<kbd>` text is the accessible content, so a
 * screen reader hears "Enter Select" and "Esc Back" — the useful form, and the
 * session block's "key names in `<kbd>` for keyboard users".
 */

import { BackKey } from "./back-key";
import { HINT_ICONS } from "./tiles";
import styles from "./explorer.module.css";

export function KeyHints({ backHref }: { backHref?: string }) {
  return (
    <>
      {backHref && <BackKey href={backHref} />}
      <p className={styles.hints}>
        <span className={styles.hint}>
          <span
            className={styles.hintIcon}
            // Static, repo-owned SVG, stripped and marked decorative by tiles.ts.
            dangerouslySetInnerHTML={{ __html: HINT_ICONS.a }}
          />
          <kbd className={styles.key}>Enter</kbd> Select
        </span>
        {backHref && (
          <span className={styles.hint}>
            <span
              className={styles.hintIcon}
              dangerouslySetInnerHTML={{ __html: HINT_ICONS.b }}
            />
            <kbd className={styles.key}>Esc</kbd> Back
          </span>
        )}
      </p>
    </>
  );
}
