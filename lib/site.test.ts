import { describe, expect, it } from "vitest";
import { SITE_URL, absoluteUrl } from "./site";

// The origin is BUILD_PLAN §8's settled value and every absolute URL the site
// writes — canonical links through metadataBase, the sitemap, robots.txt, the
// JSON-LD — is built on it, so it is pinned literally: a typo here would move
// every canonical at once and nothing else would notice.

describe("SITE_URL", () => {
  it("is the settled origin: https, the apex, no trailing slash", () => {
    expect(SITE_URL).toBe("https://kerwynjean.dev");
    expect(new URL(SITE_URL).origin).toBe(SITE_URL);
  });
});

describe("absoluteUrl", () => {
  it("resolves route-table paths onto the origin", () => {
    expect(absoluteUrl("/")).toBe("https://kerwynjean.dev/");
    expect(absoluteUrl("/experience")).toBe("https://kerwynjean.dev/experience");
    expect(absoluteUrl("/experience/break-through-tech")).toBe(
      "https://kerwynjean.dev/experience/break-through-tech",
    );
    expect(absoluteUrl("/sitemap.xml")).toBe("https://kerwynjean.dev/sitemap.xml");
  });

  // A protocol-relative `//host` would resolve to another site, and an
  // absolute URL did not come from the route table. Either would be written
  // into a document a crawler trusts, so both are refused outright.
  it("refuses anything that is not a site-relative path", () => {
    expect(() => absoluteUrl("//evil.test/x")).toThrow(/not a site-relative path/);
    expect(() => absoluteUrl("https://evil.test/x")).toThrow(/not a site-relative path/);
    expect(() => absoluteUrl("experience")).toThrow(/not a site-relative path/);
    expect(() => absoluteUrl("")).toThrow(/not a site-relative path/);
  });
});
