/**
 * app/(explorer)/keys.ts — the console shell's key rules (S7).
 *
 * Pure: no imports, no DOM, no React. Everything the islands decide about a
 * key press is decided here, because this is the part that can be tested — the
 * Vitest environment is `node`, there is no jsdom in this repo, and a
 * `"use client"` module that imports `next/navigation` cannot be loaded under
 * it at all. What is left in the islands is wiring.
 *
 * Brief §2.2: "arrows navigate, Enter = A, Escape = B, roving `tabindex`".
 * Enter is deliberately absent from this file and from the islands — the tiles
 * are real `<a>` elements, which already activate on Enter. Adding a listener
 * could only duplicate the browser or diverge from it.
 */

/** The parts of a key event these rules read. `React.KeyboardEvent` and the DOM's both satisfy it. */
export interface KeyLike {
  readonly key: string;
  readonly altKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
  readonly shiftKey?: boolean;
}

/** @returns true when any modifier is held, i.e. the chord belongs to the browser or the OS. */
function modified(event: KeyLike): boolean {
  return Boolean(event.altKey || event.ctrlKey || event.metaKey || event.shiftKey);
}

/**
 * Where a key press moves focus within a row of `count` items.
 *
 * Left/Right and Up/Down both step, because the same row is horizontal on a
 * wide viewport and a vertical stack on a narrow one (brief §5.2) — the axis
 * the visitor sees is the axis they will reach for. Stepping wraps: a six-tile
 * row is short enough that wrapping beats a dead end, and Tab still leaves the
 * row either way, so no wrap can trap.
 *
 * A modified arrow is never ours. `Alt+ArrowLeft`, and `Cmd+ArrowLeft` on
 * macOS, is *browser back* — swallowing it would break history navigation for
 * exactly the keyboard visitors this row exists for.
 * @returns the index to focus, or `null` when the key is not one the row handles (do not `preventDefault`).
 */
export function nextIndex(event: KeyLike, current: number, count: number): number | null {
  if (count <= 0 || modified(event)) return null;
  // A row that has never held focus reports -1; treat it as "at the first".
  const from = current >= 0 && current < count ? current : 0;
  switch (event.key) {
    case "ArrowRight":
    case "ArrowDown":
      return (from + 1) % count;
    case "ArrowLeft":
    case "ArrowUp":
      return (from - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}

/** The extra fields the Back rule reads beyond a plain key chord. */
export interface BackKeyLike extends KeyLike {
  /** True mid-IME-composition, when Escape cancels the composition instead. */
  readonly isComposing?: boolean;
  readonly defaultPrevented?: boolean;
}

/**
 * Whether this event is "B = Back": a bare Escape that nothing else is using.
 *
 * `editableTarget` is the caller's answer to "is focus in a field, a dialog or
 * anything else that owns Escape first" — no such element exists on the site
 * today, but `/[section]` gains a search box in `lane/console-shell`, and a
 * global shortcut that steals Escape from a field is the classic way this
 * pattern goes wrong.
 * @returns true when the shell should navigate up one level.
 */
export function isBackKey(event: BackKeyLike, editableTarget: boolean): boolean {
  if (event.key !== "Escape") return false;
  if (event.defaultPrevented || event.isComposing) return false;
  if (modified(event)) return false;
  return !editableTarget;
}

/** Elements that own Escape before the shell does. Exported so the rule and the island cannot drift. */
export const EDITABLE_SELECTOR =
  "input, textarea, select, [contenteditable], dialog[open], [role='dialog'], [aria-modal='true']";
