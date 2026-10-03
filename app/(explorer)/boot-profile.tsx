"use client";

/**
 * app/(explorer)/boot-profile.tsx — the boot, then the profile select
 * (feat/shell-boot-profile, brief §5).
 *
 * One native modal `<dialog>`, and the island owns behaviour, not markup: the
 * mark, the title and the two choices arrive as server-rendered `children`
 * (`<ProfileSelect>`), so no label or SVG crosses into the browser bundle.
 *
 * What is deliberately *not* done here, because the platform already does it:
 *
 *  - **The sequence is CSS.** The mark lands and the choices are revealed by
 *    keyframes on the duration tokens (`explorer.module.css`), so there is no
 *    timer and no duration in this file, and `prefers-reduced-motion` — which
 *    zeroes those tokens — collapses the boot to the profile select with
 *    nothing here knowing about it.
 *  - **Choosing closes the dialog natively.** The choices are submit buttons
 *    in a `<form method="dialog">`, and Escape is the dialog's own cancel. If
 *    this bundle never arrives, the boot still runs out and both ways through
 *    still work; only the record of the choice is lost, and no record means
 *    Recruiter. A modal that needed its JavaScript to be dismissed would be
 *    the trap brief §2.2 forbids.
 *  - **The page beneath is inert** for as long as the modal is open, and gets
 *    focus back when it closes. Nothing is hidden with `aria-hidden` by hand.
 *
 * What is left: opening it, skipping, the arrow keys, handing focus to the
 * default choice, and recording the result. There is no React state — which
 * part of the sequence is on screen is read off the running animations.
 */

import { useLayoutEffect, useRef, type ReactNode } from "react";
import {
  BOOT_DIALOG_ID,
  BOOT_SCRIPT,
  DEFAULT_MODE,
  PROFILE_TITLE_ID,
  claimBoot,
  parseMode,
  recordMode,
} from "./boot";
import { isSkipKey, nextIndex } from "./keys";
import styles from "./explorer.module.css";

/** The two profile choices, in document order — Recruiter, the default, first. */
function choices(dialog: HTMLDialogElement): HTMLButtonElement[] {
  return Array.from(dialog.querySelectorAll("button"));
}

/**
 * The boot's keyframe animations that have not finished. Empty means the
 * profile select is on screen. `CSSAnimation` only: a hovered choice runs a
 * `CSSTransition`, and that is not the boot.
 */
function bootAnimations(dialog: HTMLDialogElement): Animation[] {
  return dialog
    .getAnimations({ subtree: true })
    .filter((animation) => animation instanceof CSSAnimation && animation.playState !== "finished");
}

/**
 * Puts focus on the default choice once the profile select is showing. While
 * the choices are hidden the dialog itself holds focus, so that is the only
 * state this moves it from — it never pulls focus off a choice.
 */
function focusDefault(dialog: HTMLDialogElement) {
  if (document.activeElement === dialog) choices(dialog)[0]?.focus();
}

export function BootProfile({ children }: { children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // A full page load is handled before this runs: the inline script below
  // opens the dialog while the HTML is still being parsed, so the boot is the
  // first thing painted. Two cases remain. A soft navigation to `/` inserts
  // that script without running it, so the claim is made here — in a layout
  // effect, which is still before the home page paints. And on a slow
  // connection the boot can run out before hydration; nothing was listening
  // when it ended, so the focus hand-over is done now.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) {
      if (claimBoot(() => sessionStorage)) dialog.showModal();
    } else if (bootAnimations(dialog).length === 0) {
      focusDefault(dialog);
    }
  }, []);

  /** Ends the boot now. @returns false when there was nothing left to skip. */
  function skip(): boolean {
    const dialog = dialogRef.current;
    if (!dialog) return false;
    const running = bootAnimations(dialog);
    // finish() jumps each keyframe animation to its end state and still fires
    // `animationend`, so a skipped boot hands focus over on the same path as
    // one that played through.
    for (const animation of running) animation.finish();
    return running.length > 0;
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDialogElement>) {
    if (isSkipKey(event) && skip()) {
      // Consumed: an Escape that skipped must not also cancel the dialog, and
      // an Enter that skipped must not also activate a choice.
      event.preventDefault();
      return;
    }
    const dialog = dialogRef.current;
    if (!dialog) return;
    const items = choices(dialog);
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = nextIndex(event, current, items.length);
    // null covers Tab, Enter, Escape and every modified chord — the browser's
    // and the dialog's, none of ours. Both choices stay ordinary tab stops:
    // with two of them a roving tabindex would only take one away.
    if (next === null) return;
    event.preventDefault();
    items[next]?.focus();
  }

  // The mark's animations end first and bubble here too; focus moves only
  // when the last one — the reveal of the choices — is done.
  function handleAnimationEnd() {
    const dialog = dialogRef.current;
    if (dialog && bootAnimations(dialog).length === 0) focusDefault(dialog);
  }

  // `returnValue` is the pressed button's `value`, or "" after Escape — and
  // Escape is Recruiter, the default.
  function handleClose() {
    const mode = parseMode(dialogRef.current?.returnValue) ?? DEFAULT_MODE;
    recordMode(mode, sessionStorage, document.documentElement);
  }

  return (
    <>
      <dialog
        ref={dialogRef}
        id={BOOT_DIALOG_ID}
        className={styles.boot}
        aria-labelledby={PROFILE_TITLE_ID}
        // The inline script adds `open` before React hydrates; the DOM wins.
        suppressHydrationWarning
        onKeyDown={handleKeyDown}
        // `click`, not `pointerdown`: a press that revealed the choices would
        // be finished by a click landing on whichever one appeared under the
        // pointer, and a tap meant to skip would pick a profile. By the time
        // a click is dispatched the gesture is over. Once the boot is done
        // this is a no-op, and a click on a choice submits as usual.
        onClick={skip}
        onAnimationEnd={handleAnimationEnd}
        onClose={handleClose}
      >
        {children}
      </dialog>
      {/* Executable only in the server's HTML. Rendered on the client — a soft
          navigation — it is inert text, which is what React would make of it
          anyway, minus the development warning for a script it cannot run.
          Static, repo-owned source (boot.ts), never user input. */}
      <script
        type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }}
      />
    </>
  );
}
