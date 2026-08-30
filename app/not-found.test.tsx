import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RESUME_HREF, SECTIONS, sectionHref } from "../lib/routes/table";
import NotFound from "./not-found";

// The 404 page's job is to be a way back, so what is pinned here is the way
// back: that the section list is derived from the route table rather than
// typed out, and that the page keeps the document structure every other page
// has (one <h1>, the skip link's target) rather than being treated as a
// throwaway because of its status code.

const html = renderToStaticMarkup(<NotFound />);

describe("app/not-found.tsx", () => {
  it("carries the skip link's target and exactly one <h1>", () => {
    expect(html).toContain('<main id="main"');
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
  });

  // S5's rule is that adding a section costs one SECTIONS entry and no other
  // edit. A hand-typed list here would be the first exception, and it would
  // fail silently — a missing section on a 404 breaks nothing loudly.
  it("links every section, from SECTIONS, in the route table's order", () => {
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
    expect(hrefs).toEqual([...SECTIONS.map((section) => sectionHref(section)), RESUME_HREF]);
  });

  // Compared after unescaping, because "Hobbies & Interests" reaches the
  // document as "Hobbies &amp; Interests" and a raw `toContain` would miss it.
  it("labels every link from the section's own label", () => {
    const text = [...html.matchAll(/<a [^>]*>([^<]+)<\/a>/g)].map((match) =>
      match[1].replaceAll("&amp;", "&"),
    );
    expect(text).toEqual([...SECTIONS.map((section) => section.label), "Resume"]);
  });

  it("groups the links in a labelled nav landmark", () => {
    expect(html).toContain('aria-label="Sections"');
  });
});
