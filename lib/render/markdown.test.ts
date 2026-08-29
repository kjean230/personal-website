import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./markdown";

// `entries.body` reaches the page as raw HTML, so this file is the executable
// statement of the boundary in lib/render/markdown.ts (BUILD_PLAN §7 "all input
// validated at the boundary"): what is escaped, which hrefs survive, and where
// headings land. Every renderer override must return a string — a `false`
// return falls through to marked's default and emits the raw HTML — so each
// override has a test that would fail loudly if it ever did.

// supabase/seed.content.sql, the Fordham teaching-assistant experience, verbatim.
const REAL_BODY =
  "- Led weekly office hours for undergraduates on Jupyter, Python, and object-oriented programming.\n" +
  "- Graded assignments and quizzes with written feedback on NumPy, pandas, and Matplotlib work.\n" +
  "- Supported course operations and technical communication.";

describe("renderMarkdown", () => {
  it("escapes a block html tag and gives it its own paragraph", () => {
    expect(renderMarkdown("<script>alert(1)</script>")).toBe(
      "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>",
    );
  });

  it("escapes an inline tag and its event handler attribute", () => {
    const html = renderMarkdown('hello <b onclick="x()">bold</b> world');
    expect(html).toContain("&lt;b onclick=&quot;x()&quot;&gt;");
    expect(html).not.toContain("<b ");
    expect(html).not.toContain("onclick=\"x()\"");
  });

  it("drops a javascript: href and keeps the link text", () => {
    expect(renderMarkdown("[click](javascript:alert(1))")).toBe("<p>click</p>\n");
  });

  it("drops a data: href and keeps the link text", () => {
    expect(renderMarkdown("[click](data:text/html,hi)")).toBe("<p>click</p>\n");
  });

  it("drops a protocol-relative href, which leaves the site despite the leading slash", () => {
    expect(renderMarkdown("[click](//example.com/x)")).toBe("<p>click</p>\n");
  });

  it("keeps an https href with rel=noopener and no target", () => {
    const html = renderMarkdown("[docs](https://example.com/a?b=1&c=2)");
    expect(html).toBe('<p><a href="https://example.com/a?b=1&amp;c=2" rel="noopener">docs</a></p>\n');
    expect(html).not.toContain("target=");
  });

  it("keeps a site-relative href", () => {
    expect(renderMarkdown("[resume](/resume)")).toBe(
      '<p><a href="/resume" rel="noopener">resume</a></p>\n',
    );
  });

  it("renders an absolute image and reduces a relative one to its escaped alt text", () => {
    expect(renderMarkdown("![alt text](https://example.com/a.png)")).toBe(
      '<p><img src="https://example.com/a.png" alt="alt text" /></p>\n',
    );
    expect(renderMarkdown("![alt <b>](/x.png)")).toBe("<p>alt &lt;b&gt;</p>\n");
  });

  it("makes a lone h2 body's shallowest heading an h2", () => {
    expect(renderMarkdown("## Only\n\ntext")).toBe("<h2>Only</h2>\n<p>text</p>\n");
  });

  it("shifts h1 + h2 down to h2 + h3 so nothing competes with the page h1", () => {
    expect(renderMarkdown("# One\n\n## Two\n")).toBe("<h2>One</h2>\n<h3>Two</h3>\n");
  });

  it("shifts a deep-only body up so its shallowest heading is still h2", () => {
    expect(renderMarkdown("##### Five\n\n###### Six\n")).toBe("<h2>Five</h2>\n<h3>Six</h3>\n");
  });

  it("never shifts a heading past h6", () => {
    expect(renderMarkdown("# One\n\n###### Six\n")).toBe("<h2>One</h2>\n<h6>Six</h6>\n");
  });

  it("re-levels a heading nested in a blockquote too", () => {
    expect(renderMarkdown("> ### Quoted\n")).toBe("<blockquote>\n<h2>Quoted</h2>\n</blockquote>\n");
  });

  it("renders bullets, ordered lists, emphasis and code, escaping inside code", () => {
    expect(renderMarkdown("- one\n- two **bold** and *em* and `co<de`\n")).toBe(
      "<ul>\n<li>one</li>\n<li>two <strong>bold</strong> and <em>em</em> and <code>co&lt;de</code></li>\n</ul>\n",
    );
    expect(renderMarkdown("1. a\n2. b\n")).toBe("<ol>\n<li>a</li>\n<li>b</li>\n</ol>\n");
    expect(renderMarkdown("```\n<script>x</script>\n```\n")).toBe(
      "<pre><code>&lt;script&gt;x&lt;/script&gt;\n</code></pre>\n",
    );
  });

  it("renders a real seed body as a plain list", () => {
    expect(renderMarkdown(REAL_BODY)).toBe(
      "<ul>\n" +
        "<li>Led weekly office hours for undergraduates on Jupyter, Python, and object-oriented programming.</li>\n" +
        "<li>Graded assignments and quizzes with written feedback on NumPy, pandas, and Matplotlib work.</li>\n" +
        "<li>Supported course operations and technical communication.</li>\n" +
        "</ul>\n",
    );
  });

  it("is synchronous and deterministic, so a prerender and a revalidation agree", () => {
    const first = renderMarkdown(REAL_BODY);
    expect(typeof first).toBe("string");
    expect(renderMarkdown(REAL_BODY)).toBe(first);
  });
});
