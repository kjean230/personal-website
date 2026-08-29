"use client";

/**
 * app/(explorer)/back-key.tsx — Escape = B = Back (S7, brief §2.2).
 *
 * Renders nothing; it is a key binding, not a control. It is mounted by
 * `<KeyHints>` rather than by the pages directly, so the shortcut and the
 * visible hint that announces it cannot drift apart — a shortcut with no cue
 * is the accessibility problem the hint row exists to solve.
 *
 * It navigates *up* to `href` rather than calling `router.back()`:
 *
 *  - B is a hierarchical move in the borrowed grammar — leave this screen for
 *    the one that contains it. That destination is fixed; history is not.
 *  - `router.back()` can leave the site altogether. Someone arriving at
 *    `/experience/guardian` from a search result would be sent back to the
 *    search results, which is the one thing "Back" must not do here.
 *  - `href` is always a real route-table URL, which is brief §2.2's rule that
 *    navigation resolves to real, shareable URLs rather than to state.
 *
 * The trade-off, recorded rather than hidden: Escape pushes onto the history
 * stack, so the browser's own Back afterwards returns to the page Escape left.
 * Escape and Back are different verbs, and this is the honest reading of both.
 */

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { EDITABLE_SELECTOR, isBackKey } from "./keys";

export function BackKey({ href }: { href: string }) {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as Element | null;
      const editable = Boolean(target?.closest?.(EDITABLE_SELECTOR));
      if (!isBackKey(event, editable)) return;
      event.preventDefault();
      router.push(href);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [href, router]);

  return null;
}
