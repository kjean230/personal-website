import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FACETS, TAG_CATEGORIES } from "../../lib/content/schema";
import type { AllPage, FacetChip, TagRow } from "../../lib/routes/load";
import { FacetChips, Groups, TAG_CATEGORY_LABELS } from "./groups";

// Groups as the server sends it (feat/shell-facets) — which is the whole of it
// for Recruiter mode and for a visitor without JavaScript. Everything Explorer
// mode adds is a stylesheet keyed on `data-mode` and an island that acts only
// under it, so the markup pinned here is rows of ordinary links: real URLs,
// counts as text, no tabindex, and a glyph that is decorative and hidden.

const facets: FacetChip[] = [
  { facet: null, label: "All", count: 6, href: "/all", active: false },
  { facet: "corporate", label: "Corporate", count: 1, href: "/all?facet=corporate", active: false },
  { facet: "research", label: "Research", count: 2, href: "/all?facet=research", active: true },
];

const tags: TagRow[] = [
  {
    category: "skill",
    chips: [
      { slug: "data-modeling", label: "data modeling", count: 1, href: "/all?tag=data-modeling", active: false },
      { slug: "sql", label: "SQL", count: 3, href: "/all?tag=sql", active: false },
    ],
  },
  { category: "tool", chips: [{ slug: "python", label: "Python", count: 2, href: "/all?tag=python", active: false }] },
  { category: "team", chips: [{ slug: "home-team", label: "Home team", count: 1, href: "/all?tag=home-team", active: false }] },
];

const render = (page: Pick<AllPage, "facets" | "tags">) => renderToStaticMarkup(<Groups {...page} />);
const html = render({ facets, tags });

/** Every `<tag …>` opening tag in the markup, in order. */
const tagsOf = (markup: string, name: string) => markup.match(new RegExp(`<${name}\\b[^>]*>`, "g")) ?? [];
/** The text React renders for `Label (n)`, with its text-node separators removed. */
const text = (markup: string) => markup.replace(/<!-- -->/g, "");
/** What is inside the link to `href`. An inlined glyph spans lines, so `.` alone would not cross it. */
const linkBody = (markup: string, href: string) =>
  markup.match(new RegExp(`<a [^>]*href="${href.replace("?", "\\?")}"[^>]*>([\\s\\S]*?)</a>`))?.[1];

describe("Groups", () => {
  it("is one navigation landmark named Groups, with no visible title", () => {
    expect(tagsOf(html, "nav")).toHaveLength(1);
    expect(tagsOf(html, "nav")[0]).toContain('aria-label="Groups"');
    // The name is the landmark's only: nothing in the page's text says it.
    expect(text(html).replace(/<[^>]*>/g, " ")).not.toMatch(/\bGroups\b/);
    expect(html).not.toMatch(/<h[1-6]\b/);
  });

  // Owner's correction at plan approval: every chip list has a name of its
  // own — the facet list "Facets", each tag list its visible category label.
  it("names every list: Facets by label, each tag list by its visible category", () => {
    const lists = tagsOf(html, "ul");
    expect(lists).toHaveLength(1 + tags.length);
    expect(lists[0]).toContain('aria-label="Facets"');
    for (const [index, row] of tags.entries()) {
      const id = lists[index + 1].match(/aria-labelledby="([^"]+)"/)?.[1];
      expect(id, row.category).toBeTruthy();
      // The id resolves, once, to the element showing that category's label.
      expect(html.split(`id="${id}"`), row.category).toHaveLength(2);
      expect(html).toMatch(new RegExp(`<p[^>]*id="${id}"[^>]*>${TAG_CATEGORY_LABELS[row.category]}</p>`));
    }
  });

  it("uses the entry page's four headings for the categories", () => {
    expect(TAG_CATEGORY_LABELS).toEqual({ skill: "Skills", tool: "Tools", domain: "Domains", team: "Teams" });
    expect(Object.keys(TAG_CATEGORY_LABELS).sort()).toEqual([...TAG_CATEGORIES].sort());
  });

  it("shows only the categories it was given, in the order given", () => {
    const labels = [...html.matchAll(/<p[^>]*id="group-[a-z]+"[^>]*>([^<]+)<\/p>/g)].map((match) => match[1]);
    expect(labels).toEqual(["Skills", "Tools", "Teams"]);
    expect(html).not.toContain("Domains");
  });

  it("makes every chip a real link reading Label (n)", () => {
    const chips = [...facets, ...tags.flatMap((row) => row.chips)];
    expect(tagsOf(html, "a")).toHaveLength(chips.length);
    for (const chip of chips) {
      const link = linkBody(html, chip.href);
      expect(link, chip.label).toBeDefined();
      expect(text(link ?? "").replace(/<span[\s\S]*<\/span>/, ""), chip.label).toBe(`${chip.label} (${chip.count})`);
    }
  });

  it("marks the current chip, and only it", () => {
    const current = tagsOf(html, "a").filter((link) => link.includes('aria-current="page"'));
    expect(current).toHaveLength(1);
    expect(current[0]).toContain('href="/all?facet=research"');
  });

  it("ships no tabindex, so without the island every chip is an ordinary tab stop", () => {
    expect(html).not.toMatch(/tabindex/i);
  });

  it("marks each chip for the island, and nothing else", () => {
    expect(html.match(/data-tile/g)).toHaveLength(tagsOf(html, "a").length);
  });

  // Owner's decision: facet chips carry the Phase 0 glyphs; tag chips have
  // none. The glyph is decorative, so the text stays the link's only name.
  it("gives each facet chip one decorative glyph, and tag chips none", () => {
    expect(html.match(/aria-hidden="true"/g)).toHaveLength(facets.length);
    expect(html).not.toMatch(/role="img"/);
    expect(html).not.toMatch(/<title/);
    for (const chip of facets) expect(linkBody(html, chip.href), chip.label).toContain("<svg");
    for (const chip of tags.flatMap((row) => row.chips)) {
      expect(linkBody(html, chip.href), chip.label).not.toContain("<svg");
    }
  });

  it("renders no image", () => {
    expect(html).not.toMatch(/<img\b/);
  });

  // The hosted site today: no tag exists, so Groups is the facet row alone.
  it("is the facet row alone when no entry is tagged", () => {
    const bare = render({ facets, tags: [] });
    expect(tagsOf(bare, "ul")).toHaveLength(1);
    expect(tagsOf(bare, "a")).toHaveLength(facets.length);
    expect(bare).not.toMatch(/group-/);
    for (const label of Object.values(TAG_CATEGORY_LABELS)) expect(bare).not.toContain(label);
  });

  it("renders a tag's label as text, never as markup", () => {
    const hostile = render({
      facets,
      tags: [{ category: "skill", chips: [{ slug: "x", label: "<img src=x onerror=alert(1)>", count: 1, href: "/all?tag=x", active: false }] }],
    });
    expect(hostile).not.toMatch(/<img\b/);
    expect(hostile).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });
});

// The same row on a section page, inside the `<nav aria-label="Facets">` that
// has named it since S5 — so the list takes no second name there, and the
// recruiter page keeps its chips exactly.
describe("FacetChips on a section page", () => {
  const section: FacetChip[] = [
    { facet: null, label: "All", count: 10, href: "/experience", active: true },
    ...FACETS.map((facet) => ({
      facet,
      label: facet.charAt(0).toUpperCase() + facet.slice(1),
      count: 2,
      href: `/experience?facet=${facet}`,
      active: false,
    })),
  ];
  const row = renderToStaticMarkup(<FacetChips chips={section} />);

  it("is one unnamed list of links with the section's own hrefs and text", () => {
    expect(tagsOf(row, "ul")).toHaveLength(1);
    expect(tagsOf(row, "ul")[0]).not.toMatch(/aria-label/);
    expect(tagsOf(row, "a")).toHaveLength(section.length);
    expect(row).toContain('href="/experience?facet=research"');
    expect(text(row)).toContain("Research (2)");
    expect(row).not.toMatch(/tabindex/i);
  });

  it("gives every facet, and All, its own glyph", () => {
    const glyphs = [...row.matchAll(/<svg[\s\S]*?<\/svg>/g)].map((match) => match[0]);
    expect(glyphs).toHaveLength(FACETS.length + 1);
    expect(new Set(glyphs).size).toBe(glyphs.length);
  });

  it("marks All current on the bare section", () => {
    const current = tagsOf(row, "a").filter((link) => link.includes('aria-current="page"'));
    expect(current).toHaveLength(1);
    expect(current[0]).toContain('href="/experience"');
  });
});
