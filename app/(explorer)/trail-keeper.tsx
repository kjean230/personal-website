"use client";

/**
 * app/(explorer)/trail-keeper.tsx — keeps the trail, and moves focus by it
 * (feat/shell-detail-panel).
 *
 * Renders nothing. It is the wiring around `trail.ts`: it records which link
 * was activated, notes a history traversal, and on each arrival asks the pure
 * rule what kind of arrival it was and where focus belongs.
 *
 * Mounted wherever a detail can be opened from or returned to: by `<KeyHints>`
 * on `/`, `/all`, the section pages and the entry page, and by `/resume`
 * directly. Outside Explorer mode it records nothing and moves nothing, so the
 * recruiter pages behave exactly as they did.
 *
 * Focus moves in the microtask after the commit, never in an effect that waits
 * for the morph: the destination exists, so that is when focus belongs there.
 * `preventScroll` on every call, and an opener that is off screen is brought
 * in with an explicitly instant scroll — Explorer mode scrolls smoothly, and a
 * glide here would be a second animation nobody asked for.
 */

import { useEffect, useLayoutEffect } from "react";
import { isExplorer } from "./boot";
import { isPlainClick } from "./keys";
import {
  NONE,
  activated,
  hasPanelContext,
  arrived,
  historyKeys,
  readTrail,
  traversed,
  writeTrail,
  type FocusTarget,
  type Opener,
} from "./trail";

/** The same authorization boundary for recording an opener and finding it again. */
function readOpener(link: HTMLAnchorElement): Opener | null {
  if (!link.closest("#main") || link.origin !== location.origin || link.search || link.hash ||
      link.hasAttribute("download") || (link.target !== "" && link.target !== "_self")) return null;
  const surface = link.dataset.detailOpener;
  const origin = link.dataset.origin ?? null;
  if (surface === "morph" && origin === null && link.closest("[data-morph]")) {
    return { href: link.pathname, origin, morph: true };
  }
  if (surface === "related" && origin && link.closest("nav[aria-label='Related']")) {
    return { href: link.pathname, origin, morph: false };
  }
  if (surface === "resume" && origin === null && location.pathname === "/resume") {
    return { href: link.pathname, origin, morph: false };
  }
  return null;
}

/**
 * Only a uniquely matching authorized opener may receive focus. A destination
 * alone is not identity: preserve the morph surface or exact Related identity,
 * and recheck the marker and container even when the original link is gone.
 */
function resolveOpener(opener: Opener): HTMLAnchorElement | null {
  const main = document.getElementById("main");
  if (!main) return null;
  const links = Array.from(main.querySelectorAll<HTMLAnchorElement>("a[href]")).filter(
    (link) => {
      const candidate = readOpener(link);
      return candidate !== null && candidate.href === opener.href &&
        candidate.origin === opener.origin && candidate.morph === opener.morph;
    },
  );
  return links.length === 1 ? links[0] : null;
}

function applyFocus(focus: NonNullable<FocusTarget>) {
  if (focus.kind === "opener") {
    const link = resolveOpener(focus.opener);
    if (link) {
      link.focus({ preventScroll: true });
      (link.closest("li") ?? link).scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
      return;
    }
    if (!focus.orTitle) return;
  }
  document.querySelector<HTMLElement>("[data-detail-title]")?.focus({ preventScroll: true });
}

export function TrailKeeper({ detail }: { detail?: string }) {
  // An arrival: this page has just been committed. Layout, not passive — a
  // passive effect waits for a running view transition to finish.
  useLayoutEffect(() => {
    const { next, focus } = arrived(readTrail(), {
      detail: detail ?? null,
      explorer: isExplorer(document.documentElement),
      keys: historyKeys(window),
      traversal: window.event?.type === "popstate",
    });
    writeTrail(next);
    // Presentation only: this is still the server's single canonical article.
    const article = document.querySelector("[data-detail]");
    article?.toggleAttribute("data-panel", Boolean(detail && hasPanelContext(next, detail, historyKeys(window))));
    if (focus) queueMicrotask(() => applyFocus(focus));
  }, [detail]);

  useEffect(() => {
    // Capture phase: the record has to exist before the navigation starts.
    function onClick(event: MouseEvent) {
      if (!isPlainClick(event) || !isExplorer(document.documentElement)) return;
      const link = (event.target as Element | null)?.closest?.<HTMLAnchorElement>("a[href]");
      if (!link || link.origin !== location.origin || link.hasAttribute("download")) return;
      if (link.target !== "" && link.target !== "_self") return;
      // The Back control is a close, not an open: detail-keys.tsx owns it.
      if (link.hasAttribute("data-back")) return;
      // A fragment on this page goes nowhere, and must not cost the page its opener.
      if (link.pathname === location.pathname && link.search === location.search) return;
      // Only the recovered entry surfaces may establish a trail. Header,
      // markdown and other document links stay ordinary navigation.
      const opener = readOpener(link);
      const fromKey = historyKeys(window).current;
      if (!opener || !fromKey) {
        writeTrail(NONE);
        return;
      }
      writeTrail(
        activated(link.pathname, fromKey, opener),
      );
    }
    // Capture phase here too, and for a measured reason: React commits a
    // history traversal synchronously, inside Next's own `popstate` listener.
    // A listener that runs after Next's finds the destination already
    // mounted — its arrival already classified, without this.
    function onPopState() {
      writeTrail(traversed(readTrail()));
    }

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState, true);
    };
  }, []);

  return null;
}
