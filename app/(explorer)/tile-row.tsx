"use client";

/**
 * app/(explorer)/tile-row.tsx — the console tile row (S7, brief §5).
 *
 * The repo's first client island, and deliberately the smallest one that can
 * satisfy the plan row: "one tile row, tile → detail at the same URL ·
 * arrows/Enter/Escape · roving `tabindex` · visible focus ring".
 *
 * It owns focus, not markup. The tiles arrive as server-rendered `children`
 * (`<SectionTiles>`), so no label, href or SVG crosses into the browser
 * bundle, and there is no second markup tree to keep in sync — this *is* the
 * enhanced rendering of the home page's section nav. Mode is not a URL
 * dimension and there is no mode switch.
 *
 * Progressive enhancement falls out of that split. The server HTML ships six
 * ordinary links, so with JavaScript disabled the row is six tab stops that
 * work — a spine acceptance item, not a nicety. On hydration the island
 * demotes all but one to `tabIndex = -1`, which is the roving tabindex: one
 * stop into the row, arrows within it, Tab straight out. Nothing leaves the
 * tab order without the arrows replacing it, so neither state can trap.
 *
 * There is no React state here on purpose. The active index is a ref and the
 * tabindexes are written to the DOM directly: re-rendering would reconcile
 * children this component does not own, to no benefit, and *which* tile is
 * active is already visible through `:focus-visible` in CSS.
 */

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { nextIndex } from "./keys";
import styles from "./explorer.module.css";

export function TileRow({ children }: { children: ReactNode }) {
  const listRef = useRef<HTMLUListElement>(null);
  const activeRef = useRef(0);

  /** The row's tiles, in document order. `[data-tile]` so a nested link can never join the row. */
  const tiles = useCallback(
    (): HTMLAnchorElement[] =>
      Array.from(listRef.current?.querySelectorAll<HTMLAnchorElement>("[data-tile]") ?? []),
    [],
  );

  /** Writes the roving tabindex: exactly one tile is reachable by Tab. */
  const applyRoving = useCallback(() => {
    const items = tiles();
    if (items.length === 0) return;
    if (activeRef.current >= items.length) activeRef.current = 0;
    for (const [index, tile] of items.entries()) {
      tile.tabIndex = index === activeRef.current ? 0 : -1;
    }
  }, [tiles]);

  // No dependency array: this runs after every render, which is what makes it
  // self-healing. A soft navigation back to `/` can hand the island fresh
  // children; if React replaced any anchor node, the tabindexes written to the
  // old ones are gone and all six would silently become tab stops again.
  // Rewriting six attributes is cheap enough that correctness wins.
  useEffect(applyRoving);

  // Clicking or shift-Tabbing into the middle of the row makes that tile the
  // row's entry point, so Tab out and back never lands somewhere stale.
  // React's onFocus bubbles, so one handler on the list covers every tile.
  function handleFocus(event: React.FocusEvent<HTMLUListElement>) {
    // `target` is typed as the list because the handler sits on it; the focus
    // actually landed on a descendant, so compare as the Element it is.
    const focused = event.target as Element;
    const index = tiles().findIndex((tile) => tile === focused);
    if (index < 0) return;
    activeRef.current = index;
    applyRoving();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLUListElement>) {
    const items = tiles();
    const current = items.indexOf(document.activeElement as HTMLAnchorElement);
    const next = nextIndex(event, current >= 0 ? current : activeRef.current, items.length);
    // null covers Tab, Enter, Escape and every modified chord — all the
    // browser's, none of ours.
    if (next === null) return;
    event.preventDefault();
    activeRef.current = next;
    applyRoving();
    items[next]?.focus();
  }

  return (
    <ul ref={listRef} className={styles.tiles} onFocus={handleFocus} onKeyDown={handleKeyDown}>
      {children}
    </ul>
  );
}
