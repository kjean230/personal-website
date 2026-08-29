import { describe, expect, it } from "vitest";
import { SECTIONS } from "../../lib/routes/table";
import { HINT_ICONS, TILE_ICONS, inlineIcon, tileIcon } from "./tiles";

// The icon set lives only in design/assets/icons/. Two things can rot here
// without anyone noticing, and both are pinned below: a section gaining no
// icon, and the inlining forgetting to strip the source files' aria wiring —
// which would give every tile link a doubled accessible name and cost the
// Lighthouse accessibility 1.0 that CI asserts as an error.

describe("inlineIcon", () => {
  const source = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3" role="img" aria-labelledby="icon-demo-title">
  <title id="icon-demo-title">Demo</title>
  <path d="M3.5 9.5h17v11h-17z"/>
</svg>`;
  const out = inlineIcon(source);

  it("drops the XML prolog", () => {
    expect(out.startsWith("<svg")).toBe(true);
  });

  it("marks the glyph decorative", () => {
    expect(out).toContain('aria-hidden="true"');
    expect(out).toContain('focusable="false"');
  });

  // Not tidying: the source ids are hard-coded, so any page showing one glyph
  // twice would carry duplicate ids, and role="img" + <title> would announce a
  // second name over the tile's visible label.
  it("strips the id, role and aria-labelledby wiring", () => {
    expect(out).not.toMatch(/\sid="/);
    expect(out).not.toMatch(/\srole="/);
    expect(out).not.toMatch(/\saria-labelledby="/);
  });

  // Beyond what design/tokens/build.mjs strips: a retained <title> renders as a
  // hover tooltip repeating the label the tile already shows.
  it("removes the title element", () => {
    expect(out).not.toContain("<title");
    expect(out).not.toContain("Demo");
  });

  it("leaves the drawing and its currentColor stroke alone", () => {
    expect(out).toContain('stroke="currentColor"');
    expect(out).toContain('stroke-width="3"');
    expect(out).toContain("M3.5 9.5h17v11h-17z");
  });
});

describe("TILE_ICONS", () => {
  it("covers every section in the route table, and nothing else", () => {
    expect([...TILE_ICONS.keys()].sort()).toEqual(SECTIONS.map((s) => s.segment).sort());
  });

  it("resolves a drawing for each section", () => {
    for (const section of SECTIONS) {
      expect(tileIcon(section.segment), section.segment).toMatch(/^<svg\b/);
    }
  });

  it("gives every section a distinct drawing", () => {
    expect(new Set(TILE_ICONS.values()).size).toBe(SECTIONS.length);
  });

  it("throws for a segment that is not a section", () => {
    expect(() => tileIcon("nope")).toThrow(/no icon/);
  });
});

describe("every inlined icon", () => {
  const all = [...TILE_ICONS.values(), HINT_ICONS.a, HINT_ICONS.b];

  it("is decorative and free of ids", () => {
    for (const svg of all) {
      expect(svg).toContain('aria-hidden="true"');
      expect(svg).not.toMatch(/\sid="/);
      expect(svg).not.toMatch(/\srole="/);
      expect(svg).not.toContain("<title");
    }
  });

  // DESIGN.md: icons take their colour from the tile, so one drawing serves
  // both themes and the resting/active states.
  it("inherits colour rather than declaring its own", () => {
    for (const svg of all) {
      expect(svg).toContain('stroke="currentColor"');
      expect(svg).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });

  it("provides both button hint glyphs", () => {
    expect(HINT_ICONS.a).toMatch(/^<svg\b/);
    expect(HINT_ICONS.b).toMatch(/^<svg\b/);
    expect(HINT_ICONS.a).not.toBe(HINT_ICONS.b);
  });
});
