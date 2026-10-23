import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Entry } from "../lib/content/schema";
import type { EntryPage } from "../lib/routes/load";
import { sectionFromSegment } from "../lib/routes/table";
import { EntryRecord } from "./entry-record";

type Found = Extract<EntryPage, { kind: "found" }>;
const entry = { id: "entry", kind: "experience", slug: "sample", title: "Entry title", subtitle: "Organization", summary: "Complete summary", body: "# Body heading\n\nFull body text.", start_date: "2024-05-01", end_date: null, is_current: true, metadata: { date_precision: "month", cause: "Education" } } as Entry;
const page = { kind: "found", section: sectionFromSegment("experience")!, href: "/experience/sample", detail: { entry, links: [{ id: "link", label: "Repository", url: "https://example.com/repo", kind: "repo" }], tags: [{ id: "tag", slug: "typescript", label: "TypeScript", category: "tool" }], media: [{ storage_path: "must-not-render", alt: "must-not-render" }] }, related: [{ direction: "outgoing", type: "related_to", href: "/projects/related", entry: { id: "related", title: "Related project" } }] } as unknown as Found;
const html = renderToStaticMarkup(<EntryRecord page={page} />);

describe("one complete canonical record", () => {
  it("renders one semantic article and one h1 without requiring a browser", () => {
    expect(html.match(/<article\b/g)).toHaveLength(1); expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).not.toContain("data-panel");
  });
  it("preserves title, organization, dates, summary, body and metadata", () => {
    for (const text of ["Entry title", "Organization", 'dateTime="2024-05"', "May 2024", "Present", "Complete summary", "Full body text.", "Education"]) expect(html).toContain(text);
    expect(html).toMatch(/<h2>Body heading<\/h2>/);
  });
  it("preserves links, categorized stack tags and related canonical links", () => {
    for (const text of ['href="https://example.com/repo"', "Repository", "Tags", "Tools", "TypeScript", 'aria-label="Related"', 'href="/projects/related"', "Related project"]) expect(html).toContain(text);
  });
  it("keeps a semantic Back fallback and exact Related opener identity", () => {
    expect(html).toMatch(/<a(?=[^>]*data-back)(?=[^>]*href="\/experience")[^>]*>/);
    expect(html).toContain('data-origin="outgoing:related_to:related"');
    expect(html).toContain('data-detail-opener="related"');
  });
  it("never renders media even when the existing data result includes it", () => {
    expect(html).not.toMatch(/<(img|video|audio|picture)\b/); expect(html).not.toContain("must-not-render");
  });
  it.each([
    ["education", { activities: "Research society" }, "Activities and societies", "Research society"],
    ["certification", { credential_id: "ID-123" }, "Credential ID", "ID-123"],
  ] as const)("preserves %s metadata", (kind, metadata, term, value) => {
    const record = renderToStaticMarkup(<EntryRecord page={{ ...page, detail: { ...page.detail, entry: { ...entry, kind, metadata } as Entry } }} />);
    expect(record).toContain(term); expect(record).toContain(value);
  });
});
