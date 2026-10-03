import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BOOT_DIALOG_ID, BOOT_SCRIPT, MODES, PROFILE_TITLE_ID } from "./boot";
import { ProfileSelect } from "./profile-select";

// The markup the server sends for the boot and the profile select, before any
// script runs. Two promises live here rather than in the browser walk-through:
// with JavaScript disabled the dialog is never shown, and with the bundle
// missing it can still be dismissed — because both are properties of this
// markup, not of the island.

const html = renderToStaticMarkup(<ProfileSelect />);
const dialog = html.slice(html.indexOf("<dialog"), html.indexOf("</dialog>"));

describe("ProfileSelect", () => {
  // The JS-off promise. A <dialog> without `open` is display:none in every
  // browser's own stylesheet, and only a script can open it.
  it("ships the dialog closed", () => {
    expect(html.match(/<dialog\b/g)).toHaveLength(1);
    expect(html).toMatch(new RegExp(`<dialog[^>]*\\bid="${BOOT_DIALOG_ID}"`));
    expect(html).not.toMatch(/<dialog[^>]*\sopen\b/);
  });

  it("is named by its title", () => {
    expect(html).toMatch(new RegExp(`<dialog[^>]*aria-labelledby="${PROFILE_TITLE_ID}"`));
    expect(dialog).toMatch(new RegExp(`<h2[^>]*id="${PROFILE_TITLE_ID}"[^>]*>Select a profile</h2>`));
  });

  // The page keeps its one <h1>; the dialog's title is a level below it.
  it("adds no second h1", () => {
    expect(html).not.toMatch(/<h1\b/);
  });

  // Submit buttons in a method="dialog" form close the dialog natively, with
  // the pressed button's value as the returnValue — no script involved, so the
  // modal cannot become a trap if the bundle never loads.
  it("offers the brief's two profiles as native dialog submits, default first", () => {
    expect(dialog.match(/<form\b/g)).toHaveLength(1);
    expect(dialog).toMatch(/<form[^>]*method="dialog"/);
    const values = [...dialog.matchAll(/<button[^>]*\bvalue="([^"]*)"/g)].map((m) => m[1]);
    expect(values).toEqual([...MODES]);
    expect(dialog.match(/<button\b/g)).toHaveLength(MODES.length);
    expect(dialog).not.toMatch(/<button[^>]*\btype="button"/);
  });

  it("labels each choice as text", () => {
    expect(dialog).toMatch(/<button[^>]*value="recruiter"[\s\S]*?Recruiter mode[\s\S]*?<\/button>/);
    expect(dialog).toMatch(/<button[^>]*value="explorer"[\s\S]*?Explorer mode[\s\S]*?<\/button>/);
  });

  // Choosing a profile is not a navigation: no choice is a link, so no URL
  // changes and mode stays out of the route table.
  it("contains no link", () => {
    expect(html).not.toMatch(/<a\b/);
    expect(html).not.toMatch(/\bhref=/);
  });

  it("ships no tabindex and no autofocus", () => {
    expect(html).not.toMatch(/tabindex/i);
    expect(html).not.toMatch(/autofocus/i);
  });

  // Mark + one glyph per choice + the two hint glyphs. All decorative: the
  // home page already carries the badge with its own id and <title>, so a
  // second copy of either here would be a duplicate id and a second name.
  it("carries only decorative drawings, with no ids of their own", () => {
    expect(dialog.match(/<svg[^>]*aria-hidden="true"/g)).toHaveLength(1 + MODES.length + 2);
    expect(dialog).not.toMatch(/role="img"/);
    expect(dialog).not.toMatch(/<title/);
    expect([...dialog.matchAll(/\sid="([^"]*)"/g)].map((m) => m[1])).toEqual([
      BOOT_DIALOG_ID,
      PROFILE_TITLE_ID,
    ]);
  });

  it("says what Escape does", () => {
    expect(dialog).toMatch(/<kbd[^>]*>Esc<\/kbd> Recruiter mode/);
  });

  // The script that opens the dialog before first paint. It must come after
  // the dialog it looks up, and in the server's markup it must be executable.
  it("is followed by the boot script, executable on the server", () => {
    const after = html.slice(html.indexOf("</dialog>"));
    expect(after).toContain(`<script type="text/javascript">${BOOT_SCRIPT}</script>`);
    expect(html.match(/<script\b/g)).toHaveLength(1);
  });
});
