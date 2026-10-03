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
 *
 * `grid` (feat/shell-tile-grid) is the same island around the "All Software"
 * index, with two differences. A grid is Explorer furniture: its keys and its
 * roving tabindex apply only under `data-mode="explorer"`, and in Recruiter
 * mode the index stays what the server sent — a plain list, one tab stop per
 * entry, like every section page. And Up/Down move a whole row, by the column
 * count the grid has as laid out. The home row keeps S7's behaviour in every
 * mode.
 *
 * `explorerOnly` (feat/shell-facets) is a row of chips — the facet and tag
 * chips of Groups, brief §4.2's "arrow-key traversable". It is Explorer
 * furniture like the grid, but a row like the home row: one tab stop, arrows
 * step and wrap. Outside Explorer mode the chips stay what the server sent,
 * ordinary links with a tab stop each.
 *
 * Which item holds the tab stop is `tabStop` in keys.ts: the row's current
 * item (`aria-current="page"`) when it has one, otherwise its first. Only a
 * chip row ever has a current item, so the home row and the grid still start
 * on their first tile.
 */

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { isExplorer } from "./boot";
import { nextIndex, tabStop } from "./keys";
import styles from "./explorer.module.css";

/** The tile a link belongs to: its list item, which is the card on a grid. */
const tileOf = (link: HTMLElement): HTMLElement => link.closest("li") ?? link;

/**
 * How many tiles sit on the first row. Read from `offsetTop`, which a
 * transform does not move — the focused tile is scaled, so its bounding box is
 * not where its row is.
 */
function columnsOf(items: readonly HTMLElement[]): number {
  const top = tileOf(items[0]).offsetTop;
  return items.filter((item) => tileOf(item).offsetTop === top).length;
}

interface TileRowProps {
  readonly children: ReactNode;
  /** The list's class; the home row's by default. */
  readonly className?: string;
  /** True for the index grid. */
  readonly grid?: boolean;
  /** True for a row of chips: a row, not a grid, and Explorer furniture all the same. */
  readonly explorerOnly?: boolean;
  /** The list's accessible name, where nothing around it already gives it one. */
  readonly label?: string;
  /** The id of a visible label that names the list; used instead of `label` when there is one. */
  readonly labelledBy?: string;
}

export function TileRow({
  children,
  className = styles.tiles,
  grid = false,
  explorerOnly = false,
  label,
  labelledBy,
}: TileRowProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const activeRef = useRef(0);
  /** The row's current item as `applyRoving` last saw it; `null` until it has run. */
  const seenRef = useRef<number | null>(null);

  /** Whether this list is under the island's control right now. Read on use: the mode is the document's, not React's. */
  const enabled = useCallback(
    () => !(grid || explorerOnly) || isExplorer(document.documentElement),
    [grid, explorerOnly],
  );

  /** The row's tiles, in document order. `[data-tile]` so a nested link can never join the row. */
  const tiles = useCallback(
    (): HTMLAnchorElement[] =>
      Array.from(listRef.current?.querySelectorAll<HTMLAnchorElement>("[data-tile]") ?? []),
    [],
  );

  /** Writes the roving tabindex: exactly one tile is reachable by Tab. */
  const applyRoving = useCallback(() => {
    const items = tiles();
    if (items.length === 0 || !enabled()) return;
    const current = items.findIndex((item) => item.getAttribute("aria-current") === "page");
    activeRef.current = tabStop(current, seenRef.current, activeRef.current);
    seenRef.current = current;
    if (activeRef.current >= items.length) activeRef.current = 0;
    for (const [index, tile] of items.entries()) {
      tile.tabIndex = index === activeRef.current ? 0 : -1;
    }
  }, [tiles, enabled]);

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
    if (items.length === 0 || !enabled()) return;
    const current = items.indexOf(document.activeElement as HTMLAnchorElement);
    const next = nextIndex(
      event,
      current >= 0 ? current : activeRef.current,
      items.length,
      grid ? columnsOf(items) : undefined,
    );
    // null covers Tab, Enter, Escape and every modified chord — all the
    // browser's, none of ours.
    if (next === null) return;
    event.preventDefault();
    activeRef.current = next;
    applyRoving();
    if (!grid) {
      items[next]?.focus();
      return;
    }
    // On a grid the link is only the card's title, so bring the whole card into
    // view rather than letting focus scroll to the title alone. Whether the
    // page glides there or jumps is CSS's to say (app.css): no behaviour is
    // passed, so the mode and prefers-reduced-motion decide, not this file.
    items[next].focus({ preventScroll: true });
    tileOf(items[next]).scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  return (
    <ul
      ref={listRef}
      className={className}
      aria-label={label}
      aria-labelledby={labelledBy}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
    >
      {children}
    </ul>
  );
}
