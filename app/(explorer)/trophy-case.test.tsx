import Link from "next/link";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CERTIFICATION_CATEGORIES, STATUSES, entrySummarySchema } from "../../lib/content/schema";
import type { SectionPage } from "../../lib/routes/load";
import { entryHref } from "../../lib/routes/table";
import { TileRow } from "./tile-row";
import { TrophyCase } from "./trophy-case";

// Disposable component fixtures, never portfolio content. Distinct IDs and
// slugs let the render prove that every source record keeps its own link.
const entries = STATUSES.flatMap((status, statusIndex) =>
  CERTIFICATION_CATEGORIES.map((category, categoryIndex) => entrySummarySchema.parse({
    id: `00000000-0000-4000-8000-00000000000${statusIndex * 2 + categoryIndex + 1}`,
    kind: "certification",
    facet: null,
    slug: `fixture-${category}-${status}`.replaceAll("_", "-"),
    title: `Fixture ${category} ${status}`,
    subtitle: "Fixture issuer",
    summary: "Fixture summary.",
    start_date: "2026-05-01",
    end_date: null,
    is_current: false,
    status,
    icon_asset: "must-not-render.png",
    accent_color: null,
    featured: false,
    sort_weight: 0,
    metadata: { category, date_precision: "month" },
    created_at: "2026-10-22T00:00:00Z",
    updated_at: "2026-10-22T00:00:00Z",
  })),
);

const render = (rows: SectionPage["entries"] = entries, facet: SectionPage["facet"] = undefined) =>
  renderToStaticMarkup(<TrophyCase entries={rows} facet={facet} />);
const rowsOf = (html: string) => html.match(/<li\b[\s\S]*?<\/li>/g) ?? [];

describe("TrophyCase server content", () => {
  const html = render();
  const rows = rowsOf(html);

  it("renders one semantic, named list rather than a grid widget", () => {
    expect(html.match(/<ul\b/g)).toHaveLength(1);
    expect(html).toMatch(/<ul\b[^>]*role="list"/);
    expect(html).toContain('aria-label="Certifications and awards"');
    expect(html).not.toContain('role="grid"');
  });

  it("renders each source record once at its canonical URL", () => {
    expect(rows).toHaveLength(entries.length);
    for (const entry of entries) {
      expect(html.split(`href="${entryHref(entry)}"`)).toHaveLength(2);
    }
  });

  it("preserves supplied order rather than grouping categories or statuses", () => {
    const reversed = [...entries].reverse();
    const hrefs = rowsOf(render(reversed)).map((row) => row.match(/href="([^"]+)"/)?.[1]);
    expect(hrefs).toEqual(reversed.map(entryHref));
  });

  it.each(entries)("keeps the status and category of $slug", (entry) => {
    const row = render([entry]);
    const labels = { unlocked: "Unlocked", in_progress: "In progress", archived: "Archived" };
    expect(row).toContain(`data-status="${entry.status}"`);
    expect(row).toContain(`</span>${labels[entry.status]}</span> · ${entry.metadata.category}`);
    expect(row).not.toContain("Locked");
  });

  it("keeps title-only heading links and the accepted opener markers", () => {
    for (const [index, row] of rows.entries()) {
      expect(row).toMatch(/<li\b[^>]*data-morph="true"/);
      expect(row).toMatch(/<h2\b[^>]*><a\b[^>]*data-tile="true"[^>]*data-detail-opener="morph"/);
      expect(row).toContain(`>${entries[index].title}</a></h2>`);
      expect(row.match(/<a\b/g)).toHaveLength(1);
    }
  });

  it("preserves issuer, precision-aware dates and summary in recruiter reading order", () => {
    const row = rows[0] ?? "";
    expect(row).toContain('dateTime="2026-05"');
    const positions = [entries[0].title, "Fixture issuer", "May 2026", "Unlocked", "Fixture summary."]
      .map((text) => row.indexOf(text));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("ships ordinary native links without tabindex or client-only content", () => {
    expect(html).not.toMatch(/tabindex|<script\b|aria-selected|aria-disabled/i);
    expect(html).not.toMatch(/<(img|video|audio|picture)\b/);
    expect(html).not.toContain("must-not-render");
    expect(html).not.toContain("data-panel");
  });

  it("keeps each glyph decorative with no duplicated IDs or extra accessible name", () => {
    expect(html.match(/<svg\b/g)).toHaveLength(entries.length);
    expect(html.match(/aria-hidden="true"/g)).toHaveLength(entries.length);
    expect(html.match(/focusable="false"/g)).toHaveLength(entries.length);
    expect(html).not.toMatch(/\sid=|<title\b|role="img"/);
  });

  it("omits absent optional content without inventing metadata", () => {
    const entry = { ...entries[0], subtitle: null, summary: null, start_date: null, end_date: null };
    const row = render([entry]);
    expect(row).toContain(entry.title);
    expect(row).toContain("Unlocked");
    expect(row).not.toMatch(/<time\b|Fixture issuer|Fixture summary|Credential ID|Unknown|Present/);
  });

  it("keeps the schema's default certification category for older records", () => {
    const entry = entrySummarySchema.parse({ ...entries[0], metadata: {} });
    expect(render([entry])).toContain(" · certification</p>");
  });

  it("renders only the supplied facet subset", () => {
    const subset = [entries[3]];
    const filtered = render(subset, "coursework");
    expect(rowsOf(filtered)).toHaveLength(1);
    expect(filtered).toContain(`href="${entryHref(subset[0])}"`);
    expect(filtered).not.toContain(`href="${entryHref(entries[0])}"`);
  });

  it("preserves the empty-state wording without an empty list", () => {
    for (const facet of [undefined, "research"] as const) {
      const empty = render([], facet);
      expect(empty).toMatch(/^<p\b[^>]*>Nothing here yet\.<\/p>$/);
      expect(empty).not.toMatch(/<ul\b|<li\b/);
    }
  });
});

describe("optional TileRow list semantics", () => {
  it("leaves callers without the option unchanged", () => {
    const html = renderToStaticMarkup(<TileRow><li><Link href="/">Home</Link></li></TileRow>);
    expect(html).not.toMatch(/\srole=|tabindex/i);
    expect(html).toContain('<li><a href="/">Home</a></li>');
  });
});
