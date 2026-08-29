import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SECTIONS, sectionHref } from "../../lib/routes/table";
import { SectionTiles } from "./section-tiles";

// The JS-disabled promise, pinned as a unit test rather than left to the
// headless smoke alone: this is the markup the server sends, before any island
// hydrates. It must be six ordinary links with no tabindex — the roving
// tabindex is applied by tile-row.tsx *after* hydration, precisely so that a
// visitor without JavaScript keeps six working tab stops (a spine acceptance
// item, BUILD_PLAN §4).

const html = renderToStaticMarkup(<SectionTiles />);

describe("SectionTiles", () => {
  it("renders one list item per brief §4.3 section", () => {
    expect(html.match(/<li\b/g)).toHaveLength(SECTIONS.length);
    expect(html.match(/<a\b/g)).toHaveLength(SECTIONS.length);
  });

  // Every tile resolves to a real, shareable URL from the route table — brief
  // §2.2's rule that nothing navigates by state alone.
  it("links each tile to its section href", () => {
    for (const section of SECTIONS) {
      expect(html, section.segment).toContain(`href="${sectionHref(section)}"`);
    }
  });

  it("shows each section's label as text", () => {
    for (const section of SECTIONS) {
      // The route table's labels contain an ampersand ("Hobbies & Interests").
      expect(html, section.segment).toContain(section.label.replace(/&/g, "&amp;"));
    }
  });

  it("ships no tabindex, so JS-off leaves six ordinary tab stops", () => {
    expect(html).not.toMatch(/tabindex/i);
  });

  it("carries one decorative glyph per tile and no second accessible name", () => {
    expect(html.match(/aria-hidden="true"/g)).toHaveLength(SECTIONS.length);
    expect(html).not.toMatch(/role="img"/);
    expect(html).not.toMatch(/<title/);
  });

  it("marks each tile for the island to find", () => {
    expect(html.match(/data-tile/g)).toHaveLength(SECTIONS.length);
  });
});
