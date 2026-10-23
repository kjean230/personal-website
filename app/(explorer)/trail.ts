/**
 * app/(explorer)/trail.ts — where a detail was opened from (feat/shell-detail-panel).
 *
 * The detail panel is the entry's own page, so "open" and "close" are ordinary
 * navigations. Three things depend on knowing which navigation just happened:
 * where focus goes, whether the card may morph into the panel, and whether the
 * panel may morph back. Guessing is the failure mode — a page that mounts looks
 * the same after a click, a reload and a pasted link — so nothing here is
 * inferred from React's lifecycle. Provenance comes from three recorded events
 * and nothing else: a link was activated, a `popstate` fired (only a
 * same-document history traversal fires one), and, where the browser has the
 * Navigation API, the keys of the history entries involved.
 *
 * One record, one phase at a time. It is deliberately not a stack: it covers
 * the open and the Back that follows it, and is consumed by the arrival it
 * serves. After a detour through a second detail, the first one's opener is no
 * longer known, and then nothing is restored — an opener is never made up
 * because a page happens to list the same entry (owner's rule, handoff
 * feat-shell-detail-panel.md).
 *
 * It lives in this module's one variable: the tab's memory, gone on a reload.
 * No cookie, no storage, no URL parameter, nothing a server sees.
 *
 * Everything but that variable is pure and takes what it reads as arguments,
 * because Vitest runs under `node` with no DOM — the same split as `keys.ts`.
 */

/** The link that opened a detail, as far as it can be told apart from every other link on its page. */
export interface Opener {
  /** The link's path: the detail it leads to. */
  readonly href: string;
  /** Its `data-origin` when it is a Related row — two rows can lead to one entry. `null` elsewhere. */
  readonly origin: string | null;
  /** Whether it sits on a morph surface: an `/all` card or a section row. */
  readonly morph: boolean;
}

export type Trail =
  /** Nothing known. Every page load starts here. */
  | { readonly phase: "none" }
  /** A link toward `to` was just activated on the page whose history entry is `fromKey`. */
  | { readonly phase: "opening"; readonly to: string; readonly fromKey: string | null; readonly opener: Opener }
  /** The detail at `detail` is showing, and was opened from the entry `fromKey` by `opener`. */
  | {
      readonly phase: "opened";
      readonly detail: string;
      readonly fromKey: string;
      readonly detailKey: string;
      readonly opener: Opener;
      /** A history traversal is in flight: the only way back to `fromKey`. */
      readonly traversing: boolean;
    }
  /** A history traversal is in flight and nothing else is known. */
  | { readonly phase: "traversing" };

export const NONE: Trail = { phase: "none" };

let trail: Trail = NONE;

/** The record as it stands. */
export function readTrail(): Trail {
  return trail;
}

/** Replaces the record. There is only ever one. */
export function writeTrail(next: Trail): void {
  trail = next;
}

// History entries ------------------------------------------------------------

/** The part of a Navigation API history entry these rules read. */
export interface HistoryEntryLike {
  readonly key: string;
  readonly index: number;
  readonly url: string | null;
}

/** The part of `window` that carries the Navigation API, where a browser has it. */
export interface HistoryWindow {
  readonly navigation?: {
    readonly currentEntry: HistoryEntryLike | null;
    entries(): readonly HistoryEntryLike[];
  };
}

export interface HistoryKeys {
  /** The current entry's key, or `null` without the Navigation API. */
  readonly current: string | null;
  /** The key of the entry one step back, or `null` when there is none to see. */
  readonly previous: string | null;
  /** That entry's URL — `null` or absent when the browser does not give one. */
  readonly previousUrl: string | null | undefined;
}

/**
 * Reads the two history entries the rules care about. `entries()` lists only
 * this site's contiguous entries, so a previous entry on another origin is
 * simply not there.
 * @param win `window`, or anything shaped like the part of it `HistoryWindow` names — TypeScript's own `Window` does not declare `navigation` yet
 * @returns keys of `null` in a browser without the Navigation API.
 */
export function historyKeys(win: object): HistoryKeys {
  const { navigation } = win as HistoryWindow;
  const entry = navigation?.currentEntry;
  if (!navigation || !entry) return { current: null, previous: null, previousUrl: undefined };
  const previous = entry.index > 0 ? navigation.entries()[entry.index - 1] : undefined;
  return {
    current: entry.key || null,
    previous: previous?.key || null,
    previousUrl: previous?.url,
  };
}

// Events ---------------------------------------------------------------------

/** A link toward `to` was activated. Whatever was known before is replaced. */
export function activated(to: string, fromKey: string | null, opener: Opener): Trail {
  return { phase: "opening", to, fromKey, opener };
}

/**
 * A `popstate` fired. An open detail keeps what it knows, because a traversal
 * is how its opener is returned to; a link that was activated and then
 * abandoned for Back or Forward is a stale intent, and is dropped.
 */
export function traversed(current: Trail): Trail {
  return current.phase === "opened" ? { ...current, traversing: true } : { phase: "traversing" };
}

/**
 * Whether an activation on the entry `fromKey` accounts for arriving here.
 * With the Navigation API the page left must be the one step back, or — while
 * the destination is still rendering and history has not moved yet — the one
 * still current. Without it there are no keys and panel enhancement fails closed.
 */
function follows(fromKey: string | null, keys: Pick<HistoryKeys, "current" | "previous">): boolean {
  if (fromKey === null) return false;
  return keys.previous === fromKey || keys.current === fromKey;
}

/** Where a page has just arrived, and how. */
export interface Arrival {
  /** The detail's canonical path, or `null` on any other page. */
  readonly detail: string | null;
  readonly explorer: boolean;
  readonly keys: Pick<HistoryKeys, "current" | "previous">;
  /**
   * Whether this commit is happening inside a `popstate` event. Measured, not
   * assumed: React commits a traversal to a cached page synchronously, in the
   * microtask after Next's own `popstate` listener — and a browser calls
   * `popstate` listeners in the order they were registered, capture flag or
   * not, so a listener an island adds later runs only after the page it
   * belonged to is gone. The event is therefore read at the commit itself.
   */
  readonly traversal: boolean;
}

/** Where focus should go after an arrival. `null` leaves it where it is. */
export type FocusTarget =
  | { readonly kind: "title" }
  /** The exact opener; `orTitle` says what to do when it cannot be found. */
  | { readonly kind: "opener"; readonly opener: Opener; readonly orTitle: boolean }
  | null;

export interface Arrived {
  readonly next: Trail;
  readonly focus: FocusTarget;
}

/**
 * Classifies an arrival and consumes the record.
 *
 * On a detail: an activation toward it is a known open, and focus goes to its
 * title; a traversal back onto the entry that opened another detail is a known
 * return, and focus goes to the exact opener (or the title, if it is gone);
 * any other traversal is still an in-site navigation into a detail, and gets
 * the title. Everything else — a load, a reload, anything unexplained — moves
 * nothing.
 *
 * On any other page only a known return moves focus. Going *up* to a section
 * is not a return, and its row is not an opener.
 * @returns the record to keep, and where to put focus.
 */
export function arrived(current: Trail, arrival: Arrival): Arrived {
  if (!arrival.explorer) return { next: NONE, focus: null };
  // A traversal is known either at the commit or, when the destination had to
  // be fetched and the commit came later, from the listener that saw it start.
  const traversing =
    arrival.traversal || current.phase === "traversing" || (current.phase === "opened" && current.traversing);
  const returned =
    current.phase === "opened" &&
    traversing &&
    arrival.keys.current !== null &&
    arrival.keys.current === current.fromKey;

  if (arrival.detail === null) {
    return { next: NONE, focus: returned ? { kind: "opener", opener: current.opener, orTitle: false } : null };
  }
  if (current.phase === "opening" && current.to === arrival.detail && current.fromKey !== null && arrival.keys.current !== null &&
      arrival.keys.current !== current.fromKey && arrival.keys.previous === current.fromKey) {
    return {
      next:
        current.fromKey === null
          ? NONE
          : { phase: "opened", detail: arrival.detail, fromKey: current.fromKey, detailKey: arrival.keys.current, opener: current.opener, traversing: false },
      focus: { kind: "title" },
    };
  }
  if (returned) return { next: NONE, focus: { kind: "opener", opener: current.opener, orTitle: true } };
  if (traversing) return { next: NONE, focus: { kind: "title" } };
  // The same detail arriving twice is one arrival: keep what the first learned.
  if (hasPanelContext(current, arrival.detail, arrival.keys)) return { next: current, focus: null };
  return { next: NONE, focus: null };
}

// The morph -------------------------------------------------------------------

/**
 * Whether the record being mounted may pair with the card that opened it: a
 * known open, from a morph surface. Related rows and the résumé may open a panel without morph. A pasted link
 * and a reload remain ordinary canonical detail pages.
 */
export function opensWithMorph(current: Trail, detail: string, keys: Pick<HistoryKeys, "current" | "previous">): boolean {
  return (
    current.phase === "opening" &&
    current.to === detail &&
    current.opener.morph &&
    follows(current.fromKey, keys)
  );
}

/**
 * Whether a traversal that has just landed on `currentKey` is the panel going
 * back to the card it came from — the one case where closing reverses the morph.
 */
export function returnsWithMorph(current: Trail, currentKey: string | null): boolean {
  return (
    current.phase === "opened" &&
    current.opener.morph &&
    currentKey !== null &&
    currentKey === current.fromKey
  );
}

/** A panel belongs to this exact detail history entry and its recorded opener. */
export function hasPanelContext(current: Trail, detail: string, keys: Pick<HistoryKeys, "current" | "previous">): boolean {
  return current.phase === "opened" && current.detail === detail &&
    keys.current === current.detailKey && keys.previous === current.fromKey && !current.traversing;
}
