"use client";

/**
 * app/(explorer)/morph.tsx — the card → panel morph (feat/shell-detail-panel;
 * BUILD_PLAN §5: "shape morphing and the click → detail transition").
 *
 * The mechanism is the platform's: React's `<ViewTransition>`, which Next's
 * App Router ships in its own React build, pairs two boundaries that share a
 * name — one leaving as the other arrives — and has the browser move one into
 * the other. Nothing here animates anything. There is no library, no timer and
 * no duration in this file; the timing is the two tokens `app/app.css` puts on
 * the transition's pseudo-elements.
 *
 * What this file owns is *whether*, and the answer defaults to no:
 *
 *  - **The gate** (`morph-gate.ts`). A boundary exists only in Explorer mode,
 *    with motion allowed, in a browser that has every capability the mechanism
 *    uses. Otherwise the wrapper returns its children and the browser's
 *    view-transition API is never called — Recruiter mode, reduced motion, the
 *    server and the tests all get the page exactly as it was. Reduced motion
 *    is followed live, not sampled once.
 *  - **The triggers.** `default="none"` with `share` alone switched on
 *    (`MORPH_TRIGGERS`). A boundary that merely appears, disappears or changes
 *    never animates.
 *  - **The pairing.** Cards and rows are always named. The panel is named only
 *    for a navigation that warrants it (`trail.ts`): as it mounts, when a card
 *    or row on this site has just opened it; and for a history traversal back
 *    onto the entry of that same card. Between the two it is unnamed, so
 *    leaving a detail is instant by default — a pasted link, a reload, the
 *    section link and a fallback to the section cannot morph into a card that
 *    never opened them.
 *  - **The guard.** As a pair is about to animate, its computed timing is
 *    compared with the tokens; anything else is finished on the spot.
 *
 * `useState` reads the gate when the wrapper first renders in the browser, so
 * a page hydrating in an Explorer session renders a boundary where the server
 * rendered none. That is deliberate and safe: a boundary is not an element, so
 * the markup is identical. Deciding in an effect instead would swap the
 * wrapper after hydration and remount every card inside it.
 */

import { ViewTransition, useEffect, useState, type ReactNode } from "react";
import type {} from "react/canary";
import { flushSync } from "react-dom";
import { isExplorer } from "./boot";
import {
  MORPH_TRIGGERS,
  morphAllowed,
  readMorphSupport,
  readTokens,
  tokenized,
  type ProbeWindow,
  type Timing,
} from "./morph-gate";
import { historyKeys, opensWithMorph, readTrail, returnsWithMorph } from "./trail";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/** The name a card and its panel share. A slug is lowercase words and hyphens, so this is always one CSS identifier. */
const morphName = (slug: string) => `entry-${slug}`;

/** The gate, read now. False on the server, where there is no browser to ask. */
function allowed(): boolean {
  if (typeof window === "undefined") return false;
  return morphAllowed(
    isExplorer(document.documentElement),
    window.matchMedia(REDUCED_MOTION).matches,
    readMorphSupport(window as unknown as ProbeWindow),
  );
}

/**
 * Whether this wrapper renders a boundary. Mode cannot change under a mounted
 * wrapper — it is chosen on `/`, which has none — but the visitor's motion
 * setting can, at any moment, so that is listened for.
 */
function useMorphGate(): boolean {
  const [on, setOn] = useState(allowed);
  useEffect(() => {
    const query = window.matchMedia(REDUCED_MOTION);
    const update = () => setOn(allowed());
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return on;
}

/** The computed animation of one of the transition's pseudo-elements. */
function timingOf(pseudo: string): Timing {
  const style = getComputedStyle(document.documentElement, pseudo);
  return { duration: style.animationDuration, easing: style.animationTimingFunction, name: style.animationName };
}

/**
 * Runs as a pair is about to animate. If what the browser is about to play is
 * not the tokens — or the page root is animating — every animation of the
 * transition is finished at once, which leaves an instant route change.
 */
function guard(instance: { name: string }) {
  const tokens = readTokens(getComputedStyle(document.documentElement));
  const pair = ["group", "old", "new"].map((part) => timingOf(`::view-transition-${part}(${instance.name})`));
  const root = ["group", "new"].map((part) => timingOf(`::view-transition-${part}(root)`));
  if (tokens && tokenized(pair, root, tokens)) return;
  for (const animation of document.getAnimations()) {
    const effect = animation.effect;
    if (effect instanceof KeyframeEffect && effect.pseudoElement?.startsWith("::view-transition")) animation.finish();
  }
}

interface MorphProps {
  /** The entry's slug; the card and its panel must be given the same one. */
  readonly slug: string;
  readonly children: ReactNode;
}

/** Around an `/all` card or a section row: the origin of a morph. */
export function Morph({ slug, children }: MorphProps) {
  if (!useMorphGate()) return children;
  return (
    <ViewTransition name={morphName(slug)} {...MORPH_TRIGGERS} onShare={guard}>
      {children}
    </ViewTransition>
  );
}

interface MorphTargetProps extends MorphProps {
  /** The entry's canonical URL, as the trail records it. */
  readonly href: string;
}

/** Around the record on an entry page: where a morph ends, and where its reverse begins. */
export function MorphTarget({ slug, href, children }: MorphTargetProps) {
  const on = useMorphGate();
  // Named for the commit that mounts it only when a card or row has just
  // opened it. The trail is read here, in render, because the pair forms in
  // that commit — before any effect of this page has run.
  const [opening, setOpening] = useState(() => on && opensWithMorph(readTrail(), href, historyKeys(window)));
  const [returning, setReturning] = useState(false);

  // Once that commit is done the panel is unnamed again: leaving is instant
  // unless something below says otherwise.
  useEffect(() => {
    if (!opening) return;
    const frame = requestAnimationFrame(() => setOpening(false));
    return () => cancelAnimationFrame(frame);
  }, [opening]);

  // Preparation must precede Next's popstate restore. Capture phase does
  // not order listeners on Window: by popstate this component may be gone.
  // The Navigation API announces the real traversal destination first. It
  // is already required for validated provenance; never intercept or cancel it.
  useEffect(() => {
    if (!on) return;
    const navigation = (window as unknown as { navigation?: EventTarget }).navigation;
    if (!navigation) return;
    const onNavigate = (event: Event) => {
      const { navigationType, destination } = event as Event & {
        navigationType: string;
        destination: { key: string; sameDocument: boolean };
      };
      // Next replaces the same history entry while committing its restore.
      // Clearing the name for that bookkeeping write would cancel the pair.
      if (navigationType === "replace") return;
      const back = navigationType === "traverse" && destination.sameDocument &&
        returnsWithMorph(readTrail(), destination.key);
      flushSync(() => setReturning(back));
    };
    navigation.addEventListener("navigate", onNavigate);
    return () => navigation.removeEventListener("navigate", onNavigate);
  }, [on]);

  if (!on) return children;
  return (
    <ViewTransition name={opening || returning ? morphName(slug) : undefined} {...MORPH_TRIGGERS} onShare={guard}>
      {children}
    </ViewTransition>
  );
}
