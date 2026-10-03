/**
 * app/(explorer)/boot.ts — the boot and profile-select rules (feat/shell-boot-profile).
 *
 * Pure: no imports, no DOM, no React — the same split as `keys.ts`, for the
 * same reason. Vitest runs under `node` with no jsdom, so everything the boot
 * decides is decided here, against the two small shapes it reads, and the
 * island (`boot-profile.tsx`) keeps only the wiring.
 *
 * The contract, settled by the owner before any code (handoff
 * `feat-shell-boot-profile.md`):
 *
 *  - **Home page only.** The first load of `/` in a session shows the boot,
 *    then the profile select. No other URL ever does, so a deep link — what an
 *    application link points at — is the plain recruiter page.
 *  - **This session only.** Both facts live in `sessionStorage`: one browser
 *    tab, gone when it closes. No cookie, nothing in the URL, nothing a server
 *    ever sees — which is also what keeps `/` a static route.
 *  - **Recorded here, rendered elsewhere.** A choice is stored and exposed as
 *    `data-mode` on `<html>`, and that is all this file does with it. The rows
 *    that build Explorer-only furniture key on the attribute, starting with
 *    feat/shell-tile-grid.
 *
 * Recruiter is the default (brief §1), so it is what every path that never
 * chooses gets: JavaScript off, a crawler, a deep link, storage blocked, and
 * Escape on the profile select.
 */

/** Brief §1's two renderers, default first: the order is the order the choices are drawn in. */
export const MODES = ["recruiter", "explorer"] as const;
export type Mode = (typeof MODES)[number];
export const DEFAULT_MODE: Mode = "recruiter";

/** `sessionStorage` keys. Set once the boot has been shown; the profile chosen. */
export const BOOT_KEY = "kj.booted";
export const MODE_KEY = "kj.mode";

/** DOM ids the inline script and the markup share. */
export const BOOT_DIALOG_ID = "boot";
export const PROFILE_TITLE_ID = "profile-select-title";

/**
 * Reads a mode from a place this code does not control — a storage value, a
 * dialog's `returnValue`. Anything outside `MODES` is no mode at all, so a
 * stale or hand-edited value can never reach the `data-mode` attribute.
 * @returns the mode, or `null` when the value is not one.
 */
export function parseMode(value: unknown): Mode | null {
  return MODES.find((mode) => mode === value) ?? null;
}

/**
 * Whether the page is in Explorer mode: the one reading of `data-mode` that
 * script makes (feat/shell-tile-grid); the stylesheets read the same attribute.
 * No attribute, or a value outside `MODES`, is Recruiter.
 * @returns true only when the root element carries `data-mode="explorer"`.
 */
export function isExplorer(root: { dataset: DOMStringMap }): boolean {
  return parseMode(root.dataset.mode) === "explorer";
}

/** The part of `Storage` the boot uses. */
export type BootStorage = Pick<Storage, "getItem" | "setItem">;

/**
 * Claims this session's one boot: true exactly once per session, and the claim
 * is written before anything is shown, so a reload mid-boot does not replay it.
 *
 * Storage is taken as a thunk because *reading the `sessionStorage` property*
 * is what throws when a browser blocks site data, not only the calls on it.
 * No storage means no way to remember that the boot ran, and a boot on every
 * visit to `/` would break "once per session" — so it means no boot.
 * @returns true when the caller should show the boot.
 */
export function claimBoot(storage: () => BootStorage): boolean {
  try {
    const session = storage();
    if (session.getItem(BOOT_KEY)) return false;
    session.setItem(BOOT_KEY, "1");
    return true;
  } catch {
    return false;
  }
}

/** Stores the chosen mode for the session and exposes it on the root element. */
export function recordMode(mode: Mode, storage: BootStorage, root: { dataset: DOMStringMap }): void {
  root.dataset.mode = mode;
  storage.setItem(MODE_KEY, mode);
}

const quote = (value: string) => JSON.stringify(value);

/**
 * Inline script for `<head>`, every page: re-applies the session's mode to
 * `<html>` before first paint, so a later row's `[data-mode]` styles never
 * flash. The same allowlist as `parseMode`, spelled out because the script
 * cannot import it.
 *
 * Built from the constants above and nothing else — no request data, no
 * content — which is what makes it safe as raw script text.
 */
export const MODE_SCRIPT = `try{const m=sessionStorage.getItem(${quote(MODE_KEY)});if(${MODES.map(
  (mode) => `m===${quote(mode)}`,
).join("||")})document.documentElement.dataset.mode=m}catch{}`;

/**
 * Inline script placed straight after the boot dialog on `/`: `claimBoot`,
 * then `showModal()`, run by the parser before first paint. Opening it from an
 * effect instead would paint the home page first and put the boot *after* the
 * site it is supposed to precede — on a slow connection, by a second or more.
 *
 * The island repeats the same claim for a soft navigation, where an inline
 * script never runs; `boot.test.ts` holds the two to one behaviour.
 */
export const BOOT_SCRIPT = `try{if(!sessionStorage.getItem(${quote(BOOT_KEY)})){sessionStorage.setItem(${quote(
  BOOT_KEY,
)},"1");document.getElementById(${quote(BOOT_DIALOG_ID)}).showModal()}}catch{}`;
