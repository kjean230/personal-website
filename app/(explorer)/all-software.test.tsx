import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { EntrySummary, Kind } from "../../lib/content/schema";
import type { AllPage, FacetChip } from "../../lib/routes/load";
import { ALL_HREF, ALL_LABEL, SEARCH_MAX_LENGTH, SEARCH_PARAM, entryHref } from "../../lib/routes/table";
import { AllSoftware, AllSoftwareLink } from "./all-software";

// The "All Software" index as the server sends it (feat/shell-tile-grid) —
// which is the whole page for a visitor without JavaScript, and for one who
// never chose Explorer. Everything the grid adds is CSS keyed on `data-mode`
// and an island that acts only under it, so the markup pinned here is the
// recruiter index: real links, a form that works by itself, no tabindex.

const entry = (overrides: Partial<EntrySummary> & { kind: Kind; slug: string }): EntrySummary =>
  ({
    id: `id-${overrides.slug}`,
    facet: null,
    title: overrides.slug,
    subtitle: null,
    summary: null,
    start_date: null,
    end_date: null,
    is_current: false,
    status: "unlocked",
    icon_asset: null,
    accent_color: null,
    featured: false,
    sort_weight: 0,
    metadata: {},
    created_at: "2026-08-27T00:00:00+00:00",
    updated_at: "2026-08-27T00:00:00+00:00",
    ...overrides,
  }) as EntrySummary;

const entries = [
  entry({
    kind: "experience",
    slug: "break-through-tech",
    title: "AI Fellow",
    subtitle: "Break Through Tech",
    summary: "A year of machine learning coursework.",
    status: "in_progress",
    icon_asset: "tiles/break-through-tech.png",
  }),
  entry({ kind: "project", slug: "superhost-classifier", title: "Superhost classifier" }),
  entry({ kind: "certification", slug: "ml-foundations", title: "Machine Learning Foundations" }),
  entry({ kind: "interest", slug: "a-team", title: "A followed team" }),
];

const facets: FacetChip[] = [
  { facet: null, label: "All", count: entries.length, href: "/all", active: true },
  { facet: "research", label: "Research", count: 1, href: "/all?facet=research", active: false },
];

const render = (page: Partial<AllPage> = {}) =>
  renderToStaticMarkup(
    <AllSoftware page={{ filter: { kind: "none" }, total: entries.length, entries, facets, tags: [], ...page }} />,
  );

/**
 * The markup with the Groups region taken out — the form, the status line and
 * the entry list. Groups has its own tests (groups.test.tsx); the ones here
 * that count rows, glyphs and lists are about the index itself.
 */
const withoutGroups = (markup: string) => markup.replace(/<nav\b[\s\S]*?<\/nav>/, "");

describe("AllSoftware", () => {
  const html = render();
  const rows = withoutGroups(html);

  it("lists each entry once, as a link to its canonical URL", () => {
    expect(rows.match(/<li\b/g)).toHaveLength(entries.length);
    for (const item of entries) {
      expect(html.split(`href="${entryHref(item)}"`), item.slug).toHaveLength(2);
    }
    expect(html).toContain('href="/hobbies/a-team"');
  });

  // The link is the title and nothing else, so its name is the entry's title
  // and the heading stays a heading; the card around it is CSS.
  it("names each link by the entry's title, inside a heading", () => {
    expect(html).toMatch(/<h2[^>]*><a [^>]*href="\/projects\/superhost-classifier"[^>]*>Superhost classifier<\/a><\/h2>/);
  });

  it("shows what a search reads: the title, the subtitle and the summary", () => {
    expect(html).toContain("AI Fellow");
    expect(html).toContain("Break Through Tech");
    expect(html).toContain("A year of machine learning coursework.");
  });

  it("says which section each row belongs to, and its status when not unlocked, as text", () => {
    expect(html).toContain("Experience · in progress");
    expect(html).toMatch(/>Projects<\/p>/);
    expect(html).toMatch(/>Hobbies &amp; Interests<\/p>/);
  });

  it("ships no tabindex, so without the island every entry is an ordinary tab stop", () => {
    expect(html).not.toMatch(/tabindex/i);
  });

  it("marks each link for the island, and nothing else", () => {
    expect(rows.match(/data-tile/g)).toHaveLength(entries.length);
  });

  it("draws one decorative glyph per row and adds no second accessible name", () => {
    expect(rows.match(/aria-hidden="true"/g)).toHaveLength(entries.length);
    expect(html).not.toMatch(/role="img"/);
    expect(html).not.toMatch(/<title/);
  });

  // BUILD_PLAN §5: Storage-backed images — `entries.icon_asset` tile art
  // included — are rendered by feat/shell-album-news and by no earlier row.
  it("renders no image, even for an entry that has an icon_asset", () => {
    expect(html).not.toMatch(/<img\b/);
    expect(html).not.toContain("tiles/break-through-tech.png");
  });
});

describe("the search form", () => {
  const html = render();

  it("is a GET form to the index that needs no script", () => {
    const form = html.match(/<form\b[^>]*>/)?.[0] ?? "";
    expect(form).toContain('role="search"');
    expect(form).toContain('method="get"');
    expect(form).toContain(`action="${ALL_HREF}"`);
    expect(html).toMatch(/<button[^>]*type="submit"/);
    expect(html).not.toMatch(/<script/);
  });

  it("names its field with a visible label", () => {
    const id = html.match(/<input[^>]*id="([^"]+)"/)?.[1];
    expect(id).toBeTruthy();
    expect(html).toContain(`<label for="${id}"`);
  });

  it("sends the route table's parameter, capped at its length", () => {
    const input = html.match(/<input\b[^>]*>/)?.[0] ?? "";
    expect(input).toContain(`name="${SEARCH_PARAM}"`);
    expect(input.toLowerCase()).toContain(`maxlength="${SEARCH_MAX_LENGTH}"`);
  });

  it("counts the entries when nothing is searched, and offers no way back to all", () => {
    expect(html).toContain(`${entries.length} entries`);
    expect(html).not.toContain("Show all");
  });

  it("says one entry, not one entries", () => {
    expect(render({ total: 1, entries: entries.slice(0, 1) })).toContain(">1 entry<");
  });
});

describe("a search", () => {
  const found = render({ filter: { kind: "search", query: "machine" }, entries: [entries[0], entries[2]] });
  const none = render({ filter: { kind: "search", query: "zzz" }, entries: [] });

  it("keeps the search in the field", () => {
    expect(found).toMatch(/<input[^>]*value="machine"/);
  });

  it("says how many of the entries match, and lists only those", () => {
    expect(found).toContain(`2 of ${entries.length} entries match “machine”`);
    expect(withoutGroups(found).match(/<li\b/g)).toHaveLength(2);
  });

  it("links back to the whole index", () => {
    expect(found).toMatch(new RegExp(`<a [^>]*href="${ALL_HREF}"[^>]*>Show all</a>`));
    expect(none).toMatch(new RegExp(`<a [^>]*href="${ALL_HREF}"[^>]*>Show all</a>`));
  });

  it("says so when nothing matches, and renders no list", () => {
    expect(none).toContain("Nothing matches “zzz”.");
    expect(withoutGroups(none)).not.toMatch(/<ul\b/);
    expect(withoutGroups(none)).not.toMatch(/<li\b/);
  });

  // The search is the one piece of visitor input on the site. It is only ever
  // a React text child and an input's value, so it arrives escaped.
  it("renders the search as text, never as markup", () => {
    const hostile = render({ filter: { kind: "search", query: '"><img src=x onerror=alert(1)>' }, entries: [] });
    expect(hostile).not.toMatch(/<img\b/);
    expect(hostile).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("says the site is empty rather than that nothing matches, when there is nothing to search", () => {
    const empty = render({ total: 0, entries: [] });
    expect(empty).toContain("Nothing here yet.");
    expect(withoutGroups(empty)).not.toMatch(/<ul\b/);
  });
});

// Groups on the index (feat/shell-facets). One thing narrows the index at a
// time, so the form and the chips never carry each other.
describe("Groups on the index", () => {
  const html = render();
  const research = render({ filter: { kind: "facet", facet: "research" }, entries: [entries[0]] });
  const emptyTag = render({ filter: { kind: "tag", slug: "insurance" }, entries: [] });

  it("sits between the search form and the status line", () => {
    const form = html.indexOf("</form>");
    const nav = html.indexOf("<nav");
    const status = html.indexOf(`${entries.length} entries`);
    expect(form).toBeGreaterThan(-1);
    expect(nav).toBeGreaterThan(form);
    expect(status).toBeGreaterThan(html.indexOf("</nav>"));
  });

  it("offers the chips whatever is narrowing the index, a search included", () => {
    for (const markup of [html, research, emptyTag, render({ filter: { kind: "search", query: "machine" } })]) {
      expect(markup).toContain('aria-label="Groups"');
      expect(markup).toContain('href="/all?facet=research"');
    }
  });

  it("says how many of the entries a group holds", () => {
    expect(research).toContain(`>1 of ${entries.length} entries<`);
    expect(withoutGroups(research).match(/<li\b/g)).toHaveLength(1);
  });

  // A tag that exists and has no entries: the words an empty section uses.
  it("says what an empty section says for a group with nothing in it, and renders no list", () => {
    expect(emptyTag).toContain("Nothing here yet.");
    expect(emptyTag).not.toContain("Nothing matches");
    expect(withoutGroups(emptyTag)).not.toMatch(/<ul\b/);
  });

  it("keeps the form to the search alone, so a search drops the group", () => {
    const fields = research.match(/<input\b[^>]*>/g) ?? [];
    expect(fields).toHaveLength(1);
    expect(fields[0]).toContain(`name="${SEARCH_PARAM}"`);
    expect(fields[0]).toContain('value=""');
    expect(research).not.toMatch(/type="hidden"/);
  });

  it("offers Show all for a search only: a group is left through the All chip", () => {
    expect(research).not.toContain("Show all");
    expect(emptyTag).not.toContain("Show all");
  });
});

describe("AllSoftwareLink", () => {
  const html = renderToStaticMarkup(<AllSoftwareLink />);

  it("is one real link to the index, named by its label", () => {
    expect(html.match(/<a\b/g)).toHaveLength(1);
    expect(html).toContain(`href="${ALL_HREF}"`);
    expect(html).toMatch(new RegExp(`</span>${ALL_LABEL}</a>`));
  });

  it("keeps its glyph decorative, with the label beside it rather than inside it", () => {
    expect(html.match(/aria-hidden="true"/g)).toHaveLength(1);
    expect(html).not.toMatch(/<title/);
  });

  // It is hidden by a stylesheet until the session is in Explorer mode; it
  // must not also be a tile, or the home row's arrows would land on a link
  // that is not on screen.
  it("is not one of the row's tiles", () => {
    expect(html).not.toContain("data-tile");
    expect(html).not.toMatch(/tabindex/i);
  });
});
