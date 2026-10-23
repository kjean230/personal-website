/**
 * app/(explorer)/morph-gate.ts — whether the card → panel morph may run at all
 * (feat/shell-detail-panel).
 *
 * Pure: no imports, no DOM. Everything is decided against small shapes the
 * caller reads, so it can be tested under Vitest's `node` environment — the
 * same split as `keys.ts`.
 *
 * The contract is the owner's: the morph runs on `--duration-slow` with
 * `--ease-glide`, or it does not run. There is no third outcome. A browser
 * that has part of the View Transitions API would animate on its own default
 * timing, so the gate is a conjunction over every capability the mechanism
 * uses, and one false value closes it: no boundary is rendered, the browser's
 * API is never called, and the route changes instantly, as it always has.
 */

/**
 * The only triggers a boundary may have. `default="none"` turns `enter`,
 * `exit` and `update` off, and `share` — a named pair, one leaving as the
 * other arrives — is the single one switched back on. Adding a trigger here is
 * adding motion nobody approved; `morph-gate.test.ts` pins this object.
 */
export const MORPH_TRIGGERS = { default: "none", share: "morph" } as const;

/** One capability per line of the gate. All must hold. */
export interface MorphSupport {
  /** `document.startViewTransition` exists. */
  readonly api: boolean;
  /** `view-transition-name`: a named, shared element. */
  readonly names: boolean;
  /** `view-transition-class`, which React assigns to every boundary. */
  readonly classes: boolean;
  /** Transition types, which React passes on every call. */
  readonly types: boolean;
  /** The three pseudo-elements `app/app.css` puts the tokens on. */
  readonly group: boolean;
  readonly old: boolean;
  readonly new: boolean;
  /** The two tokens resolve on the root element. */
  readonly tokens: boolean;
}

/** The parts of `window` the probes read. */
export interface ProbeWindow {
  readonly document: { readonly startViewTransition?: unknown; readonly documentElement: unknown };
  readonly CSS?: { supports(condition: string, value?: string): boolean };
  getComputedStyle(element: never): { getPropertyValue(name: string): string };
}

/** The motion contract, read from the stylesheet rather than restated here. */
export interface Tokens {
  /** `--duration-slow`, in milliseconds. */
  readonly ms: number;
  /** `--ease-glide`. */
  readonly easing: string;
}

/**
 * Reads a CSS time. A production build minifies `320ms` to `.32s`, so both
 * units and a bare leading dot are expected.
 * @returns milliseconds, or `null` for anything that is not one time.
 */
export function parseTime(value: string): number | null {
  const match = /^\s*(\d*\.?\d+)(ms|s)\s*$/.exec(value);
  if (!match) return null;
  const amount = Number(match[1]);
  return match[2] === "s" ? Math.round(amount * 1000) : amount;
}

/** A timing function reduced to its name and numbers, so `.16` and `0.16` agree. */
function easingShape(value: string): string {
  const [name, args = ""] = value.trim().toLowerCase().split("(");
  const numbers = args.replace(")", "").split(",").map((part) => Number(part));
  return `${name.trim()}(${numbers.join(",")})`;
}

/** @returns true when two timing functions are the same curve, however each was written. */
export function sameEasing(a: string, b: string): boolean {
  return a.trim() !== "" && easingShape(a) === easingShape(b);
}

/**
 * @returns the two tokens, or `null` when either is missing or reduced motion has zeroed the duration.
 */
export function readTokens(style: { getPropertyValue(name: string): string }): Tokens | null {
  const ms = parseTime(style.getPropertyValue("--duration-slow"));
  const easing = style.getPropertyValue("--ease-glide").trim();
  return ms !== null && ms > 0 && easing !== "" ? { ms, easing } : null;
}

/** Probes one browser. Each answer is the browser's own; nothing is inferred from a version. */
export function readMorphSupport(win: ProbeWindow): MorphSupport {
  const supports = (condition: string, value?: string): boolean => {
    const css = win.CSS;
    if (!css) return false;
    return value === undefined ? css.supports(condition) : css.supports(condition, value);
  };
  const root = win.document.documentElement as never;
  return {
    api: typeof win.document.startViewTransition === "function",
    names: supports("view-transition-name", "none"),
    classes: supports("view-transition-class", "none"),
    types: supports("selector(:active-view-transition-type(x))"),
    group: supports("selector(::view-transition-group(*))"),
    old: supports("selector(::view-transition-old(*))"),
    new: supports("selector(::view-transition-new(*))"),
    tokens: readTokens(win.getComputedStyle(root)) !== null,
  };
}

/**
 * The gate. Explorer mode, motion allowed, and every capability present.
 * @returns true only when a tokenized morph can be guaranteed; false means none at all.
 */
export function morphAllowed(explorer: boolean, reducedMotion: boolean, support: MorphSupport): boolean {
  return explorer && !reducedMotion && Object.values(support).every(Boolean);
}

/** The computed animation of one view-transition pseudo-element. Lists are comma-separated, as CSS computes them. */
export interface Timing {
  readonly duration: string;
  readonly easing: string;
  readonly name: string;
}

const items = (list: string): string[] =>
  // A timing function carries commas of its own; split only outside parentheses.
  list.split(/,(?![^(]*\))/).map((item) => item.trim());

/**
 * The check made as a pair is about to animate: every animation on the pair
 * runs for exactly the token on exactly the curve, and the page root runs
 * none. Anything else — a browser default, another stylesheet's rule — is not
 * the approved motion, and the caller finishes the transition at once.
 * @param pair the pair's group, old and new pseudo-elements
 * @param root the root's group and new pseudo-elements
 */
export function tokenized(pair: readonly Timing[], root: readonly Timing[], tokens: Tokens): boolean {
  const onToken = (timing: Timing) =>
    timing.name !== "none" &&
    items(timing.duration).every((value) => parseTime(value) === tokens.ms) &&
    items(timing.easing).every((value) => sameEasing(value, tokens.easing));
  return pair.length > 0 && pair.every(onToken) && root.every((timing) => timing.name === "none");
}
