/**
 * app/(explorer)/profile-select.tsx — what the boot dialog shows
 * (feat/shell-boot-profile, brief §5).
 *
 * A server component, and the same split as `section-tiles.tsx` /
 * `tile-row.tsx`: the mark, the title and the two choices are rendered here
 * and handed to `<BootProfile>` as children, so the island stays behaviour
 * only and no label or SVG reaches the browser bundle.
 *
 * Brief §1: the two audiences are "chosen at entry via a profile-select
 * screen", and DESIGN.md lists that screen among the borrowed grammar. Only
 * the grammar: the mark is this project's KJ badge, the glyphs are Phase 0's,
 * and the two profiles are named in the brief's own words and nothing more —
 * a one-line description of each would be invented copy.
 *
 * The choices are submit buttons in a `<form method="dialog">`, so pressing
 * one closes the dialog with its `value` as the `returnValue` and no script
 * involved. They reuse the tile face (`.tiles` / `.tileLink`), which is the
 * identity's one selectable shape: raised surface, strong border, saffron
 * inside the accent outline when focused.
 *
 * The dialog ships closed. Without JavaScript nothing opens it, so the
 * recruiter page is all there is — `profile-select.test.tsx` pins that there
 * is no `open` attribute in the server's markup.
 *
 * The mark is read here rather than in `tiles.ts` on purpose. `tiles.ts` is
 * also loaded by the per-request routes, whose file reads have to be traced
 * into their functions (`next.config.ts` names `design/assets/icons/**` and
 * nothing else). This module is imported only by `/`, which is prerendered,
 * so the read happens at build. Import it from a per-request route and
 * `design/assets/mark/` needs the same tracing entry first.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_MODE, MODES, PROFILE_TITLE_ID, type Mode } from "./boot";
import { BootProfile } from "./boot-profile";
import { HINT_ICONS, PROFILE_ICON, inlineIcon } from "./tiles";
import styles from "./explorer.module.css";

// Stripped like every other inlined glyph: the home page already shows this
// badge with its own `id` and `<title>`, and a second copy of either would be
// a duplicate id and a second accessible name inside a dialog that has one.
const mark = inlineIcon(
  readFileSync(join(process.cwd(), "design/assets/mark/kj-badge.svg"), "utf8"),
);

/** Brief §1's names. A `Record` over `Mode`, so a third mode fails `typecheck` here. */
const LABELS: Readonly<Record<Mode, string>> = {
  recruiter: "Recruiter mode",
  explorer: "Explorer mode",
};

export function ProfileSelect() {
  return (
    <BootProfile>
      <div
        className={styles.bootMark}
        // Static, repo-owned SVG (linted by design/tokens/build.mjs), not user input.
        dangerouslySetInnerHTML={{ __html: mark }}
      />
      <div className={styles.bootSelect}>
        <h2 id={PROFILE_TITLE_ID} className={styles.bootTitle}>
          Select a profile
        </h2>
        <form method="dialog" className={styles.tiles}>
          {MODES.map((mode) => (
            <button key={mode} value={mode} className={`${styles.tileLink} ${styles.choice}`}>
              <span
                className={styles.tileIcon}
                dangerouslySetInnerHTML={{ __html: PROFILE_ICON }}
              />
              <span className={styles.tileLabel}>{LABELS[mode]}</span>
            </button>
          ))}
        </form>
        {/* Escape is the dialog's own cancel, and cancel is the default
            profile — said here, because a shortcut with no visible cue is the
            problem the hint row exists to solve. */}
        <p className={styles.hints}>
          <span className={styles.hint}>
            <span className={styles.hintIcon} dangerouslySetInnerHTML={{ __html: HINT_ICONS.a }} />
            <kbd className={styles.key}>Enter</kbd> Select
          </span>
          <span className={styles.hint}>
            <span className={styles.hintIcon} dangerouslySetInnerHTML={{ __html: HINT_ICONS.b }} />
            <kbd className={styles.key}>Esc</kbd> {LABELS[DEFAULT_MODE]}
          </span>
        </p>
      </div>
    </BootProfile>
  );
}
