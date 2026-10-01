import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CONTACT, Contact } from "./contact";

// Three things here fail silently and nothing else in the toolchain catches
// them: a fifth contact value creeping in (BUILD_PLAN §8 settled exactly
// four), a value drifting between the const and the href, and a hardcoded
// colour or length landing in one of the two @media print blocks —
// `tokens:check` reads design/tokens/ and never app/**.

const html = renderToStaticMarkup(<Contact />);
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const appCss = read("app/app.css");
const siteCss = read("app/site.module.css");

/** Every declaration value inside a file's `@media print { … }` block. */
function printDeclarations(css: string): string[] {
  const start = css.indexOf("@media print");
  if (start === -1) return [];
  let depth = 0;
  let end = css.length;
  for (let i = css.indexOf("{", start); i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    else if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  // `[^;{}]` cannot span a selector, so this matches declarations and skips
  // the selectors between them.
  const block = css.slice(start, end).replace(/\/\*[\s\S]*?\*\//g, "");
  return [...block.matchAll(/[\w-]+\s*:\s*([^;{}]+);/g)].map((m) => m[1].trim());
}

describe("the contact block", () => {
  it("renders the four settled values and no fifth", () => {
    expect(Object.keys(CONTACT)).toEqual(["location", "email", "linkedin", "github"]);
    for (const value of Object.values(CONTACT)) expect(html).toContain(value);
    expect(html.match(/<li/g)).toHaveLength(4);
  });

  it("carries the settled values verbatim", () => {
    expect(CONTACT.location).toBe("New York, NY");
    expect(CONTACT.email).toBe("kerwynjean123@gmail.com");
    expect(CONTACT.linkedin).toBe("https://www.linkedin.com/in/kerwynjean/");
    expect(CONTACT.github).toBe("https://github.com/kjean230");
  });

  it("prints each URL as its own link text, so no generated content is needed on paper", () => {
    expect(html).toContain(`href="mailto:${CONTACT.email}"`);
    expect(html).toContain(`>${CONTACT.email}<`);
    expect(html).toContain(`href="${CONTACT.linkedin}"`);
    expect(html).toContain(`>${CONTACT.linkedin}<`);
    expect(html).toContain(`href="${CONTACT.github}"`);
    expect(html).toContain(`>${CONTACT.github}<`);
  });

  it("adds no phone, street address or personal-site URL", () => {
    expect(html).not.toMatch(/tel:/);
    expect(html).not.toMatch(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/);
    expect(html).not.toMatch(/\b\d+\s+\w+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd)\b/i);
    expect(html).not.toMatch(/kerwynjean\.dev/);
  });

  it("is an <address> and sends visitors off-site with rel=noopener", () => {
    expect(html).toMatch(/^<address/);
    expect(html.match(/rel="noopener"/g)).toHaveLength(2);
  });
});

describe("the print stylesheets", () => {
  it("both exist — print CSS is invisible to lint, typecheck and Lighthouse", () => {
    expect(appCss).toContain("@media print");
    expect(siteCss).toContain("@media print");
    expect(printDeclarations(appCss).length).toBeGreaterThan(0);
    expect(printDeclarations(siteCss).length).toBeGreaterThan(0);
  });

  it("hardcode no design value — every declaration is a token, a keyword or 0", () => {
    const allowed = /^(var\(--[\w-]+\)|none|normal|auto|0|" \(" attr\(href\) "\)"|avoid)$/;
    for (const css of [appCss, siteCss]) {
      for (const value of printDeclarations(css)) {
        expect(value, `unexpected print value: ${value}`).toMatch(allowed);
      }
    }
  });

  it("pins the dark theme too — a print stylesheet inherits prefers-color-scheme", () => {
    expect(appCss).toContain(':root[data-theme="dark"]');
    expect(appCss).toContain(':root:not([data-theme="light"])');
  });

  it("expands entry-row link URLs but not the contact block's", () => {
    expect(siteCss).toContain(".resumeRow .linkList .chip::after");
    expect(siteCss).not.toMatch(/\.contact[^{]*::after/);
  });
});
