import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { STATUSES } from "../../lib/content/schema";
import { TROPHY_LABELS, TrophyState } from "./trophy";

// Brief §5 names three trophy states and the schema names three statuses, but
// not with the same words. This file is where that reconciliation is pinned:
// the mapping's coverage, the wording chosen for `archived`, and the two
// accessibility properties the marker exists to hold — the state is text, and
// eight of these on one page do not collide.

describe("TROPHY_LABELS", () => {
  it("covers every schema status, and nothing else", () => {
    expect(Object.keys(TROPHY_LABELS).sort()).toEqual([...STATUSES].sort());
  });

  // The owner's call, recorded as a test so a future edit has to face it rather
  // than drift into it: supabase/seed.sql's fixture comment says `archived`
  // renders as "locked", and it does not. An archived credential is one that
  // lapsed — earned, then expired — so calling it locked would tell a visitor
  // it was never achieved.
  it("names the third state Archived, not Locked", () => {
    expect(TROPHY_LABELS.archived).toBe("Archived");
    expect(Object.values(TROPHY_LABELS)).not.toContain("Locked");
  });

  it("gives every state distinct wording", () => {
    expect(new Set(Object.values(TROPHY_LABELS)).size).toBe(STATUSES.length);
  });
});

describe("TrophyState", () => {
  const rendered = STATUSES.map((status) => ({
    status,
    html: renderToStaticMarkup(<TrophyState status={status} />),
  }));

  // WCAG 1.4.1 and brief §2.2: the state must never be carried by the drawing
  // or by colour alone. It survives images-off, forced colours and both themes
  // because it is a text node.
  it("says the state in text, not only in the drawing", () => {
    for (const { status, html } of rendered) {
      expect(html, status).toContain(TROPHY_LABELS[status]);
    }
  });

  it("carries the raw status for styling and smoke tests", () => {
    for (const { status, html } of rendered) {
      expect(html, status).toContain(`data-status="${status}"`);
    }
  });

  // The glyph is decorative: the visible label is the accessible name, and a
  // retained role/title would announce a second one over it.
  it("marks the glyph decorative and gives it no name of its own", () => {
    for (const { status, html } of rendered) {
      expect(html, status).toContain('aria-hidden="true"');
      expect(html, status).not.toMatch(/role="img"/);
      expect(html, status).not.toMatch(/<title/);
    }
  });

  // The reason tiles.ts strips ids rather than tidying them: the trophy case
  // shows one of these per row — eight rows against the local seeds — and the
  // source files all carry a hard-coded id="icon-<name>-title".
  it("emits no ids, so a page full of trophies has no duplicates", () => {
    const page = rendered.map((r) => r.html).join("");
    expect(page).not.toMatch(/\sid="/);
  });

  it("renders a different drawing for each state", () => {
    expect(new Set(rendered.map((r) => r.html)).size).toBe(STATUSES.length);
  });

  // It goes inside the meta line's <p>, and a <p> inside a <p> is invalid HTML
  // that browsers silently reparse into two siblings.
  it("is a span, so it nests inside the meta paragraph", () => {
    expect(rendered[0].html.startsWith("<span")).toBe(true);
    expect(rendered[0].html).not.toMatch(/<p\b/);
  });
});
