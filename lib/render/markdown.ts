/**
 * lib/render/markdown.ts — the entry body's HTML boundary (S6, BUILD_PLAN §4).
 *
 * `entries.body` is owner-authored markdown that reaches the page as raw HTML
 * (`dangerouslySetInnerHTML`), so this module is the one place where untrusted
 * shapes are neutralised. It is the security boundary named in the S6 PR's
 * BUILD_PLAN §7 checklist: body HTML is escaped here and hrefs are allowlisted
 * here, not at the call site.
 *
 * `marked` has no sanitize option and exports no escape helper, so the
 * boundary is renderer overrides on a module-local `Marked` instance. Every
 * override MUST return a string: returning `false` falls through to marked's
 * own default, which would emit the raw HTML this file exists to stop.
 *
 * Output is therefore closed: p, ul/ol/li, strong/em, code (and pre/code),
 * blockquote, a, img, h2–h6. Headings are re-levelled so the shallowest is an
 * h2 under the page's single h1 — axe's `heading-order` rule fails a jump of
 * more than one level.
 *
 * Server-only. S6 ships no client components at all, and this module must
 * never be imported into one: that would put `marked` in the browser bundle
 * and spend the lighthouserc.json script budget on work the server has
 * already done.
 */

import { Marked, type Token, type Tokens } from "marked";

/** Absolute links that may leave the site. Anything else is dropped, text kept. */
const ABSOLUTE_HTTP = /^https?:\/\//i;

/** `marked` exports no escape helper; this is the whole escape surface. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * The href allowlist: absolute http(s), or site-relative. `//host/path` is
 * protocol-relative — it leaves the site — so a lone leading slash is not
 * enough.
 * @returns the trimmed href, or `null` when it may not be linked.
 */
function safeHref(href: string): string | null {
  const trimmed = href.trim();
  if (ABSOLUTE_HTTP.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  return null;
}

/**
 * `Token` includes marked's open-ended `Generic` extension token, so the
 * `type` tag alone does not prove the shape; `depth` is what this file reads.
 */
function isHeading(token: Token): token is Tokens.Heading {
  return token.type === "heading" && typeof (token as Tokens.Heading).depth === "number";
}

/** Walks every heading, including those nested in blockquotes and list items. */
function eachHeading(tokens: readonly Token[], visit: (heading: Tokens.Heading) => void): void {
  for (const token of tokens) {
    if (isHeading(token)) visit(token);
    if ("tokens" in token && Array.isArray(token.tokens)) eachHeading(token.tokens, visit);
    if ("items" in token && Array.isArray(token.items)) {
      for (const item of token.items as readonly Tokens.ListItem[]) eachHeading(item.tokens, visit);
    }
  }
}

/**
 * Re-levels headings so the shallowest one in the body is an h2, keeping the
 * relative depths and clamping at h6. A body that starts at `###` shifts up;
 * one that starts at `#` shifts down. No headings: nothing to do.
 */
function shiftHeadings(tokens: readonly Token[]): void {
  let shallowest = Number.POSITIVE_INFINITY;
  eachHeading(tokens, (heading) => {
    shallowest = Math.min(shallowest, heading.depth);
  });
  if (!Number.isFinite(shallowest)) return;
  const shift = 2 - shallowest;
  if (shift === 0) return;
  eachHeading(tokens, (heading) => {
    heading.depth = Math.min(6, heading.depth + shift);
  });
}

const markdown = new Marked({ gfm: true, async: false });

markdown.use({
  renderer: {
    // Raw HTML in the source is shown as text, never parsed. A block token sits
    // between paragraphs and marked appends it bare, so it gets its own <p>.
    html({ text, block }) {
      const escaped = escapeHtml(text);
      return block ? `<p>${escaped}</p>` : escaped;
    },
    // `javascript:`, `data:` and protocol-relative hrefs lose the anchor but
    // keep their text — the reader still sees what was written.
    link({ href, title, tokens }) {
      const content = this.parser.parseInline(tokens);
      const safe = safeHref(href);
      if (safe === null) return content;
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
      return `<a href="${escapeHtml(safe)}"${titleAttr} rel="noopener">${content}</a>`;
    },
    // Only absolute http(s) images; a site-relative one would be a Storage
    // path, and S6 renders no media (PROMPTS.md S6 decision 3).
    image({ href, title, text }) {
      const alt = escapeHtml(text);
      const trimmed = href.trim();
      if (!ABSOLUTE_HTTP.test(trimmed)) return alt;
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
      return `<img src="${escapeHtml(trimmed)}" alt="${alt}"${titleAttr} />`;
    },
  },
  hooks: {
    processAllTokens(tokens) {
      shiftHeadings(tokens);
      return tokens;
    },
  },
});

/**
 * Renders one `entries.body` to HTML. Synchronous and deterministic: the same
 * body always yields the same string, so a prerendered page and a revalidated
 * one agree.
 * @returns HTML safe to pass to `dangerouslySetInnerHTML`.
 */
export function renderMarkdown(body: string): string {
  return markdown.parse(body, { async: false });
}
