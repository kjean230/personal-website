"use client";

/**
 * app/(explorer)/detail-keys.tsx — leaving a detail: Escape and the Back
 * control (feat/shell-detail-panel).
 *
 * Renders nothing, like `back-key.tsx`, and is mounted by `<KeyHints>` in its
 * place on the entry page. Everywhere else `back-key.tsx` is untouched: on
 * `/all` and the section pages Escape still goes up one level, as S7 built it.
 *
 * On a detail, in Explorer mode, Escape and the Back control do what the
 * browser's own Back does — return to the page that opened the panel, with its
 * filter and scroll — but only with a validated trail tying this exact detail
 * history entry to its actual opener. The previous URL must also be on this site. Otherwise, and always in Recruiter mode, they go
 * up to the entry's section: S7's rule, and the fixed destination that makes
 * "Back" safe on a page reached from a search result.
 *
 * Going up is not a return. The trail is cleared before the push, so the
 * section's row for this entry is not treated as the thing that opened it.
 *
 * No letter key is bound (owner's decision). Brief §2.2's "Escape = B" names
 * the console button Escape stands in for — the glyph on the hint row and on
 * the control — not a second key; a bare `B` live across a page fails WCAG
 * 2.1.4 without a way to turn it off, and the physical button belongs to
 * feat/shell-gamepad.
 *
 * The Back control is a real link to the section (`[data-back]`, rendered by
 * the server). Only a plain primary click is ever intercepted, and only to go
 * back instead of up: a modified click, a middle click and a visitor whose
 * script never loaded all get the link.
 */

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { isExplorer } from "./boot";
import { EDITABLE_SELECTOR, contextualBack, isBackKey, isPlainClick } from "./keys";
import { NONE, hasPanelContext, historyKeys, readTrail, writeTrail } from "./trail";

export function DetailKeys({ href, detail }: { href: string; detail: string }) {
  const router = useRouter();

  useEffect(() => {
    /** Read on use: both the mode and the history are the document's, not React's. */
    const goesBack = () => {
      const keys = historyKeys(window);
      return isExplorer(document.documentElement) &&
        hasPanelContext(readTrail(), detail, keys) && contextualBack(keys.previousUrl, location.origin);
    };

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as Element | null;
      if (!isBackKey(event, Boolean(target?.closest?.(EDITABLE_SELECTOR)))) return;
      event.preventDefault();
      if (goesBack()) {
        router.back();
        return;
      }
      writeTrail(NONE);
      router.push(href);
    }

    // Capture phase: `<Link>` navigates in its own click handler, and yields
    // only to a click that is already prevented when that handler runs.
    function onClick(event: MouseEvent) {
      const control = (event.target as Element | null)?.closest?.("[data-back]");
      if (!control || !isPlainClick(event)) return;
      if (goesBack()) {
        event.preventDefault();
        router.back();
        return;
      }
      writeTrail(NONE);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("click", onClick, true);
    };
  }, [href, detail, router]);

  return null;
}
