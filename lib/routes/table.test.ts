import { describe, expect, it } from "vitest";
import { FACETS, KINDS } from "../content/schema";
import {
  ADMIN_HREF,
  ALL_HREF,
  ALL_LABEL,
  FACET_ORDER,
  HOME_HREF,
  PRIVACY_HREF,
  RESUME_HREF,
  SEARCH_MAX_LENGTH,
  SEARCH_PARAM,
  SECTIONS,
  TAG_PARAM,
  allHref,
  entryHref,
  parseAllParams,
  parseFacetParam,
  parseSearchParam,
  parseTagParam,
  sectionForKind,
  sectionFromSegment,
  sectionHref,
} from "./table";

// The route table is the contract both renderers bind to (BUILD_PLAN §4, S5;
// brief §8). These tests pin the parts a renderer relies on: every kind has
// exactly one canonical section, every section segment is a URL segment that
// no static route shadows, and the href / query-parameter shapes are the ones
// brief §2.2 and §4.2 show.

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const STATIC_SEGMENTS = [ALL_HREF, RESUME_HREF, PRIVACY_HREF, ADMIN_HREF].map((href) => href.slice(1));

describe("sections", () => {
  it("lists the brief §4.3 tiles in order", () => {
    expect(SECTIONS.map((section) => section.segment)).toEqual([
      "experience",
      "projects",
      "certifications",
      "education",
      "hobbies",
      "now",
    ]);
  });

  it("maps every kind to exactly one section, so every entry has one canonical URL", () => {
    const listed = SECTIONS.flatMap((section) => section.kinds);
    expect(new Set(listed).size).toBe(listed.length);
    expect(new Set(listed)).toEqual(new Set(KINDS));
    for (const kind of KINDS) expect(sectionForKind(kind).kinds).toContain(kind);
  });

  it("uses unique, slug-shaped segments that no static route shadows", () => {
    const segments = SECTIONS.map((section) => section.segment);
    expect(new Set(segments).size).toBe(segments.length);
    for (const segment of segments) {
      expect(segment).toMatch(SLUG);
      expect(STATIC_SEGMENTS).not.toContain(segment);
    }
  });

  it("makes the Certifications section the trophy case, and only it", () => {
    expect(SECTIONS.filter((section) => section.trophyCase).map((section) => section.segment)).toEqual([
      "certifications",
    ]);
    expect(sectionForKind("certification").trophyCase).toBe(true);
  });

  it("puts hobbies and interests on one tile", () => {
    expect(sectionFromSegment("hobbies")?.kinds).toEqual(["hobby", "interest"]);
    expect(sectionForKind("interest").segment).toBe("hobbies");
  });

  it("resolves a segment, and treats static routes and unknown segments as not-a-section", () => {
    expect(sectionFromSegment("experience")?.label).toBe("Experience");
    for (const segment of [...STATIC_SEGMENTS, "", "Experience", "experience/", "nope"]) {
      expect(sectionFromSegment(segment)).toBeNull();
    }
  });
});

describe("hrefs", () => {
  it("names the static routes brief §2.2, §2.3 and §7 require", () => {
    expect(HOME_HREF).toBe("/");
    expect(RESUME_HREF).toBe("/resume");
    expect(PRIVACY_HREF).toBe("/privacy");
    expect(ADMIN_HREF).toBe("/admin");
  });

  // Brief §5's "All Software" grid. The URL and the name are the owner's
  // (handoff/feat-shell-tile-grid.md); the section tests above already hold
  // that no section segment shadows it.
  it("names the index of every entry", () => {
    expect(ALL_HREF).toBe("/all");
    expect(ALL_LABEL).toBe("All Software");
  });

  it("builds section URLs, with the facet as a query parameter", () => {
    const experience = sectionForKind("experience");
    expect(sectionHref(experience)).toBe("/experience");
    expect(sectionHref(experience, "research")).toBe("/experience?facet=research");
  });

  it("builds the canonical entry URL from the entry's kind (brief §2.2: /experience/guardian)", () => {
    expect(entryHref({ kind: "experience", slug: "guardian" })).toBe("/experience/guardian");
    expect(entryHref({ kind: "project", slug: "airbnb-superhost-classifier" })).toBe(
      "/projects/airbnb-superhost-classifier",
    );
    expect(entryHref({ kind: "certification", slug: "machine-learning-foundations" })).toBe(
      "/certifications/machine-learning-foundations",
    );
    expect(entryHref({ kind: "education", slug: "fordham" })).toBe("/education/fordham");
    expect(entryHref({ kind: "hobby", slug: "basketball" })).toBe("/hobbies/basketball");
    expect(entryHref({ kind: "interest", slug: "knicks" })).toBe("/hobbies/knicks");
    expect(entryHref({ kind: "post", slug: "hello" })).toBe("/now/hello");
  });
});

describe("?facet=", () => {
  it("reads absent or empty as All", () => {
    expect(parseFacetParam(undefined)).toEqual({ ok: true, facet: undefined });
    expect(parseFacetParam("")).toEqual({ ok: true, facet: undefined });
  });

  it("accepts every facet the schema owns, in chip order", () => {
    expect(FACET_ORDER).toEqual(FACETS);
    for (const facet of FACETS) expect(parseFacetParam(facet)).toEqual({ ok: true, facet });
  });

  it("rejects a value outside the set, a repeated parameter, and a case mismatch", () => {
    expect(parseFacetParam("bogus")).toEqual({ ok: false });
    expect(parseFacetParam("Research")).toEqual({ ok: false });
    expect(parseFacetParam(["research", "corporate"])).toEqual({ ok: false });
    expect(parseFacetParam(["research"])).toEqual({ ok: false });
  });
});

describe("?q=", () => {
  it("is the parameter the index's form sends", () => {
    expect(SEARCH_PARAM).toBe("q");
  });

  it("reads absent, empty or blank as no search", () => {
    for (const value of [undefined, "", "   ", "\t\n"]) {
      expect(parseSearchParam(value), JSON.stringify(value)).toEqual({ ok: true, query: "" });
    }
  });

  // Any text is a search. It is narrowed in code and rendered as text, so
  // nothing in it needs rejecting — only trimming.
  it("accepts any text, trimmed, and leaves the rest of it alone", () => {
    expect(parseSearchParam("guardian")).toEqual({ ok: true, query: "guardian" });
    expect(parseSearchParam("  Break Through  Tech ")).toEqual({ ok: true, query: "Break Through  Tech" });
    expect(parseSearchParam('<b>"&%_,()')).toEqual({ ok: true, query: '<b>"&%_,()' });
  });

  it("accepts a search of exactly the length the form allows, and rejects one past it", () => {
    expect(parseSearchParam("a".repeat(SEARCH_MAX_LENGTH))).toEqual({
      ok: true,
      query: "a".repeat(SEARCH_MAX_LENGTH),
    });
    expect(parseSearchParam("a".repeat(SEARCH_MAX_LENGTH + 1))).toEqual({ ok: false });
  });

  it("rejects a repeated parameter, which a form cannot send", () => {
    expect(parseSearchParam(["a", "b"])).toEqual({ ok: false });
    expect(parseSearchParam(["a"])).toEqual({ ok: false });
  });
});

// Groups on the index (feat/shell-facets). The URL contract is the owner's:
// `/all?facet=<facet>` and `/all?tag=<slug>`, and one thing at a time.
describe("?tag=", () => {
  it("is the parameter the tag chips send", () => {
    expect(TAG_PARAM).toBe("tag");
  });

  it("reads absent or empty as no tag", () => {
    expect(parseTagParam(undefined)).toEqual({ ok: true, slug: undefined });
    expect(parseTagParam("")).toEqual({ ok: true, slug: undefined });
  });

  it("accepts anything slug-shaped, whether or not a tag has it", () => {
    for (const slug of ["python", "data-modeling", "a", "k8s", "c-2"]) {
      expect(parseTagParam(slug), slug).toEqual({ ok: true, slug });
    }
  });

  // The shape `tags_slug_format` holds every tag to. Nothing else can be a
  // tag's slug, so nothing else is let through to be looked up.
  it("rejects a value no slug can be, and a repeated parameter", () => {
    for (const value of ["Python", "data modeling", "-python", "python-", "a--b", "a_b", "a/b", "%", "a,b", "*", " "]) {
      expect(parseTagParam(value), JSON.stringify(value)).toEqual({ ok: false });
    }
    expect(parseTagParam(["python", "sql"])).toEqual({ ok: false });
    expect(parseTagParam(["python"])).toEqual({ ok: false });
  });
});

describe("/all's parameters, together", () => {
  it("reads none of them as the whole index", () => {
    expect(parseAllParams({})).toEqual({ ok: true, filter: { kind: "none" } });
  });

  it("reads each one alone as that filter", () => {
    expect(parseAllParams({ q: " machine learning " })).toEqual({
      ok: true,
      filter: { kind: "search", query: "machine learning" },
    });
    expect(parseAllParams({ facet: "research" })).toEqual({ ok: true, filter: { kind: "facet", facet: "research" } });
    expect(parseAllParams({ tag: "python" })).toEqual({ ok: true, filter: { kind: "tag", slug: "python" } });
  });

  // A blank value is an absent one, as ?q= and ?facet= have always read it —
  // which is what lets an empty search box be submitted beside nothing else.
  it("treats a blank parameter as absent, alone or beside another", () => {
    expect(parseAllParams({ q: "", facet: "", tag: "" })).toEqual({ ok: true, filter: { kind: "none" } });
    expect(parseAllParams({ q: "   ", facet: "research" })).toEqual({
      ok: true,
      filter: { kind: "facet", facet: "research" },
    });
    expect(parseAllParams({ q: "sql", tag: "" })).toEqual({ ok: true, filter: { kind: "search", query: "sql" } });
  });

  // One at a time: a URL carrying two is a 404, whichever two.
  it("rejects every pair, and all three", () => {
    expect(parseAllParams({ q: "sql", facet: "research" })).toEqual({ ok: false });
    expect(parseAllParams({ q: "sql", tag: "python" })).toEqual({ ok: false });
    expect(parseAllParams({ facet: "research", tag: "python" })).toEqual({ ok: false });
    expect(parseAllParams({ q: "sql", facet: "research", tag: "python" })).toEqual({ ok: false });
  });

  it("rejects an invalid or repeated value, even beside a valid one", () => {
    expect(parseAllParams({ facet: "bogus" })).toEqual({ ok: false });
    expect(parseAllParams({ tag: "Not A Slug" })).toEqual({ ok: false });
    expect(parseAllParams({ q: "a".repeat(SEARCH_MAX_LENGTH + 1) })).toEqual({ ok: false });
    expect(parseAllParams({ facet: ["research", "corporate"] })).toEqual({ ok: false });
    expect(parseAllParams({ tag: ["python"] })).toEqual({ ok: false });
    expect(parseAllParams({ q: ["a", "b"] })).toEqual({ ok: false });
    // An invalid value is not excused by being blank-adjacent.
    expect(parseAllParams({ q: "", facet: "bogus" })).toEqual({ ok: false });
  });

  it("builds the URLs it reads", () => {
    expect(allHref()).toBe(ALL_HREF);
    expect(allHref({ facet: "research" })).toBe("/all?facet=research");
    expect(allHref({ tag: "data-modeling" })).toBe("/all?tag=data-modeling");
    for (const facet of FACETS) {
      const href = allHref({ facet });
      expect(parseAllParams({ facet: new URL(href, "https://x.test").searchParams.get("facet") ?? undefined })).toEqual({
        ok: true,
        filter: { kind: "facet", facet },
      });
    }
  });
});
