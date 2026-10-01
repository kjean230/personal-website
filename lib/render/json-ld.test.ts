import { describe, expect, it } from "vitest";
import { breadcrumbJsonLd, profilePageJsonLd, serializeJsonLd, websiteJsonLd, type JsonLd } from "./json-ld";

// This module is the second place allowed to produce unescaped output (the
// first is markdown.ts), so the escape is what is pinned first: no `<`
// survives serialisation, and the data still parses back unchanged. The
// builders are pinned to exact shapes because they are the only statement the
// site makes about itself to a search engine — an extra field would be a
// claim nothing in the repo supports.

const hostile = "</script><script>alert(1)</script>";

describe("serializeJsonLd", () => {
  const doc: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Thing",
    name: hostile,
    alternateName: "Hobbies & Interests <3 <!-- x -->",
  };
  const out = serializeJsonLd(doc);

  it("leaves no literal < in the output, so no </script or <!-- can close the element", () => {
    expect(out).not.toContain("<");
    expect(out.toLowerCase()).not.toContain("</script");
  });

  it("replaces every < with \\u003c, not only the first", () => {
    expect(out.match(/\\u003c/g)).toHaveLength((hostile + doc.alternateName).split("<").length - 1);
  });

  it("round-trips through JSON.parse unchanged, & included", () => {
    expect(JSON.parse(out)).toEqual(doc);
  });
});

describe("websiteJsonLd", () => {
  it("names the site and its origin, and nothing else", () => {
    expect(websiteJsonLd()).toEqual({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Kerwyn Jean",
      url: "https://kerwynjean.dev/",
    });
  });
});

describe("breadcrumbJsonLd", () => {
  it("numbers the trail from 1 with absolute item URLs, labels verbatim", () => {
    expect(
      breadcrumbJsonLd([
        { name: "Kerwyn Jean", path: "/" },
        { name: "Hobbies & Interests", path: "/hobbies" },
        { name: hostile, path: "/hobbies/sample" },
      ]),
    ).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Kerwyn Jean", item: "https://kerwynjean.dev/" },
        { "@type": "ListItem", position: 2, name: "Hobbies & Interests", item: "https://kerwynjean.dev/hobbies" },
        { "@type": "ListItem", position: 3, name: hostile, item: "https://kerwynjean.dev/hobbies/sample" },
      ],
    });
  });

  it("refuses a crumb path that is not site-relative", () => {
    expect(() => breadcrumbJsonLd([{ name: "x", path: "//evil.test" }])).toThrow();
  });
});

describe("profilePageJsonLd", () => {
  const sameAs = ["https://profiles.example/a", "https://code.example/b"];

  it("is the page with the owner as its Person, sameAs exactly as passed", () => {
    expect(profilePageJsonLd({ path: "/resume", sameAs })).toEqual({
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      url: "https://kerwynjean.dev/resume",
      mainEntity: {
        "@type": "Person",
        name: "Kerwyn Jean",
        url: "https://kerwynjean.dev/",
        sameAs,
      },
    });
  });

  it("copies sameAs rather than holding the caller's array", () => {
    const person = profilePageJsonLd({ path: "/resume", sameAs }).mainEntity as { sameAs: string[] };
    expect(person.sameAs).not.toBe(sameAs);
  });
});
