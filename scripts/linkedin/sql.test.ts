import { describe, expect, it } from "vitest";
import type { Normalized } from "./normalize.mjs";
import { dollar, literal, renderSeed } from "./sql.mjs";

const entry = (over: Partial<Normalized["entries"][number]> = {}): Normalized["entries"][number] => ({
  id: "11111111-1111-5111-8111-111111111111",
  kind: "experience",
  facet: null,
  slug: "acme",
  title: "Data Intern",
  subtitle: "Acme",
  summary: null,
  body: "- Did work.",
  start_date: "2026-05-01",
  end_date: "2026-08-01",
  is_current: false,
  status: "unlocked",
  icon_asset: null,
  accent_color: null,
  featured: false,
  sort_weight: 0,
  metadata: { source: { export: "linkedin", file: "Positions.csv" }, date_precision: "month" },
  source: { file: "Positions.csv", key: { "Company Name": "Acme", Title: "Data Intern", "Started On": "May 2026" } },
  review: ["facet (not in the export)", "summary"],
  ...over,
});

const data: Normalized = {
  entries: [
    entry(),
    entry({
      id: "22222222-2222-5222-8222-222222222222",
      slug: "program",
      title: "O'Brien's Program",
      body: "Body with 'quotes', a back\\slash and a $md$ tag.",
      metadata: { source: { export: "linkedin", file: "Positions.csv" }, note: "it's \"quoted\"" },
    }),
  ],
  relations: [{ from_slug: "acme", to_slug: "program", type: "part_of", note: "test" }],
  links: [
    {
      id: "33333333-3333-5333-8333-333333333333",
      entry_id: "11111111-1111-5111-8111-111111111111",
      label: "View credential",
      url: "https://example.com/c",
      kind: "profile",
    },
  ],
  suggested: [{ from_slug: "program", to_slug: "acme", type: "related_to", note: "maybe" }],
};

describe("literal / dollar", () => {
  it("doubles single quotes and renders null", () => {
    expect(literal("O'Brien")).toBe("'O''Brien'");
    expect(literal(null)).toBe("null");
  });

  it("dollar-quotes with a tag absent from the value", () => {
    expect(dollar("plain")).toBe("$md$plain$md$");
    expect(dollar("has $md$ inside")).toBe("$md1$has $md$ inside$md1$");
    expect(dollar("has $md$ and $md1$")).toBe("$md2$has $md$ and $md1$$md2$");
    expect(dollar(null)).toBe("null");
  });
});

describe("renderSeed", () => {
  const sql = renderSeed(data);

  it("is deterministic", () => {
    expect(renderSeed(data)).toBe(sql);
  });

  it("upserts entries on id without touching timestamps, and only when something changed", () => {
    expect(sql).toMatch(/insert into public\.entries as e/);
    expect(sql).toMatch(/on conflict \(id\) do update set/);
    expect(sql).toMatch(/is distinct from/);
    expect(sql).not.toMatch(/created_at|updated_at = excluded/);
  });

  it("escapes quotes, keeps backslashes literal, and picks a safe dollar tag", () => {
    expect(sql).toContain("'O''Brien''s Program'");
    expect(sql).toContain("$md1$Body with 'quotes', a back\\slash and a $md$ tag.$md1$");
    expect(sql).toContain(`'{"source":{"export":"linkedin","file":"Positions.csv"},"note":"it''s \\"quoted\\""}'::jsonb`);
  });

  it("writes relations by slug so a missing slug fails loudly, and suggestions commented out", () => {
    expect(sql).toContain("(select id from public.entries where slug = 'acme')");
    expect(sql).toMatch(/-- REVIEW: acme part_of program — test/);
    expect(sql).toMatch(/^--\s+-- SUGGESTED: program related_to acme — maybe$/m);
    expect(sql).toMatch(/^--\s+\(\(select id from public\.entries where slug = 'program'\),$/m);
    expect(sql).toMatch(/^-- on conflict do nothing;$/m);
  });

  it("annotates every entry with its source row and REVIEW items", () => {
    expect(sql).toContain("-- Positions.csv: Acme · Data Intern · May 2026");
    expect(sql).toContain("-- REVIEW: facet (not in the export); summary");
  });

  it("carries no fixture flag and no prohibited term", () => {
    expect(sql).not.toMatch(/"fixture"/);
    expect(sql).not.toMatch(/nintendo/i);
  });

  it("omits empty sections cleanly", () => {
    const bare = renderSeed({ entries: [entry()], relations: [], links: [], suggested: [] });
    expect(bare).not.toMatch(/entry_relations/);
    expect(bare).not.toMatch(/public\.links/);
  });
});
