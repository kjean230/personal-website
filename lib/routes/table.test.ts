import { describe, expect, it } from "vitest";
import { FACETS, KINDS } from "../content/schema";
import {
  ADMIN_HREF,
  FACET_ORDER,
  HOME_HREF,
  PRIVACY_HREF,
  RESUME_HREF,
  SECTIONS,
  entryHref,
  parseFacetParam,
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
const STATIC_SEGMENTS = [RESUME_HREF, PRIVACY_HREF, ADMIN_HREF].map((href) => href.slice(1));

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
