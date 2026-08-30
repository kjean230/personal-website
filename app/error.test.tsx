import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HOME_HREF, RESUME_HREF } from "../lib/routes/table";
import RouteError from "./error";

// Two properties are worth a test here, and they are the two that fail
// silently: the page has to work with no JavaScript even though it is a client
// component, and its import list has to stay free of the server-only modules,
// because nothing in lint or typecheck notices a client bundle getting bigger.

const source = readFileSync(join(process.cwd(), "app/error.tsx"), "utf8");
const render = (digest?: string) =>
  renderToStaticMarkup(
    <RouteError error={Object.assign(new Error("boom"), { digest })} reset={() => {}} />,
  );

describe("app/error.tsx", () => {
  it("carries the skip link's target and exactly one <h1>", () => {
    const html = render();
    expect(html).toContain('<main id="main"');
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
  });

  // reset() is a function: with JavaScript off the button is inert and these
  // anchors are the entire recovery path, so what matters is that they reach
  // the document as real hrefs. They are literals in the component (importing
  // the route table would drag zod into the browser bundle), so this is where
  // the literals are held to the route table's actual values.
  it("offers real hrefs, not only the reset button", () => {
    const hrefs = [...render().matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
    expect(hrefs).toEqual([HOME_HREF, RESUME_HREF]);
  });

  it("keeps the retry control a real button that never submits anything", () => {
    expect(render()).toContain('<button type="button"');
  });

  // The digest is a hash Next hands over in production so a report can be
  // matched to a server log; the message is replaced with a generic string and
  // is never shown. Absent digest must not render an empty reference line.
  it("shows the digest only when there is one, and never the message", () => {
    expect(render("abc123")).toContain("abc123");
    expect(render()).not.toContain("Reference");
    expect(render("abc123")).not.toContain("boom");
  });

  it("is a client component", () => {
    expect(source.trimStart().startsWith('"use client"')).toBe(true);
  });

  // The budget is a Lighthouse assertion, so an import added here fails the
  // build rather than a review — but only after someone has waited for CI.
  // marked and zod both arrive through these four namespaces.
  it("imports nothing that would ship marked or zod to the browser", () => {
    const imports = [...source.matchAll(/from\s+"([^"]+)"/g)].map((match) => match[1]);
    expect(imports).toEqual(["next/link", "./site.module.css"]);
    for (const forbidden of ["lib/content", "lib/render", "lib/db", "zod"]) {
      expect(source, forbidden).not.toContain(`from "${forbidden}`);
    }
  });
});
