import { describe, expect, it } from "vitest";
import { ADMIN_HREF, PRIVACY_HREF } from "../lib/routes/table";
import robots from "./robots";

// robots.txt is pinned whole: allow everything, name the sitemap on the
// settled origin. The reserved routes are asserted absent because they have no
// page to keep crawlers out of, and a Disallow line would only advertise the
// admin path (PROMPTS.md Session B: reserved routes belong in neither file).

describe("app/robots.ts", () => {
  const result = robots();

  it("allows every crawler everywhere and names the absolute sitemap URL", () => {
    expect(result).toEqual({
      rules: { userAgent: "*", allow: "/" },
      sitemap: "https://kerwynjean.dev/sitemap.xml",
    });
  });

  it("names neither reserved route", () => {
    const text = JSON.stringify(result);
    expect(text).not.toContain("disallow");
    expect(text).not.toContain(ADMIN_HREF);
    expect(text).not.toContain(PRIVACY_HREF);
  });
});
