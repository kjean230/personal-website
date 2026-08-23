#!/usr/bin/env node
/**
 * design/tokens/build.mjs — generator and linter for the identity C tokens.
 *
 * Zero dependencies. Node 18+.
 *
 *   node design/tokens/build.mjs          parse tokens.css, verify, and write
 *                                         tokens.json, CONTRAST.md, specimen.html
 *   node design/tokens/build.mjs --check  same work, but write nothing; exit 1 if any
 *                                         generated file on disk is stale or any check fails
 *
 * What it checks (exit 1 on any failure):
 *   · tokens.css has the four expected blocks and the two dark blocks are identical
 *   · every var(--x) reference resolves to a declared token
 *   · every required WCAG 2.2 AA pair passes in both themes (4.5:1 text, 3:1 non-text)
 *   · every SVG under design/assets/{icons,mark} follows the construction rules and
 *     carries no literal colour except `var(--color-*, #fallback)` whose fallback equals
 *     that token's light value — the mechanical check for "nowhere-hardcoded values"
 *   · no prohibited brand term appears in tokens, assets, or generated output
 *
 * tokens.css is the source of truth. Edit it; never edit the generated files.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, basename, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..", "..");
const P = {
  css: join(here, "tokens.css"),
  json: join(here, "tokens.json"),
  contrast: join(here, "CONTRAST.md"),
  specimen: join(here, "specimen.html"),
  icons: join(repo, "design", "assets", "icons"),
  mark: join(repo, "design", "assets", "mark"),
  chime: join(repo, "design", "assets", "chime"),
};
const CHECK = process.argv.includes("--check");
const rel = (p) => relative(repo, p);

const problems = [];
const fail = (msg) => problems.push(msg);

/* ----------------------------------------------------------------------------
   1. Parse tokens.css
   ---------------------------------------------------------------------------- */

function parseCss(src) {
  const text = src.replace(/\/\*[\s\S]*?\*\//g, "");
  const blocks = [];
  const stack = [];
  let buf = "";
  for (const ch of text) {
    if (ch === "{") {
      stack.push(buf.trim());
      buf = "";
    } else if (ch === "}") {
      const decls = parseDecls(buf);
      if (decls.length) blocks.push({ path: [...stack], decls });
      buf = "";
      stack.pop();
    } else {
      buf += ch;
    }
  }
  if (stack.length) fail("tokens.css: unbalanced braces");
  return blocks;
}

function parseDecls(chunk) {
  const out = [];
  for (const raw of chunk.split(";")) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^(--[\w-]+)\s*:\s*(.+)$/s);
    if (!m) {
      fail(`tokens.css: not a custom-property declaration: "${line}"`);
      continue;
    }
    out.push([m[1], m[2].trim()]);
  }
  return out;
}

const cssSource = readFileSync(P.css, "utf8");
const blocks = parseCss(cssSource);
const key = (b) => b.path.join(" > ");
const byKey = Object.fromEntries(blocks.map((b) => [key(b), b.decls]));

const EXPECT = {
  root: ":root",
  darkAttr: ':root[data-theme="dark"]',
  darkMedia: '@media (prefers-color-scheme: dark) > :root:not([data-theme="light"])',
  reduced: "@media (prefers-reduced-motion: reduce) > :root",
};
for (const [name, k] of Object.entries(EXPECT)) {
  if (!byKey[k]) fail(`tokens.css: missing block "${k}" (${name})`);
}
const extra = Object.keys(byKey).filter((k) => !Object.values(EXPECT).includes(k));
for (const k of extra) fail(`tokens.css: unexpected block "${k}"`);
if (problems.length) bail();

function bail() {
  console.error(`build.mjs: ${problems.length} problem(s)`);
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}

const rootDecls = byKey[EXPECT.root];
const darkA = byKey[EXPECT.darkAttr];
const darkB = byKey[EXPECT.darkMedia];
const reduced = byKey[EXPECT.reduced];

if (JSON.stringify(darkA) !== JSON.stringify(darkB)) {
  fail("tokens.css: the two dark blocks differ — they must be identical declarations in the same order");
}

const dark = Object.fromEntries(darkA);
const rootMap = Object.fromEntries(rootDecls);
const themedNames = Object.keys(dark);
const light = {};
const stat = {};
for (const [name, value] of rootDecls) {
  if (name in dark) light[name] = value;
  else stat[name] = value;
}
for (const name of themedNames) {
  if (!(name in light)) fail(`tokens.css: ${name} is set in the dark block but has no light value in :root`);
}
for (const [name, value] of reduced) {
  if (!name.startsWith("--duration-")) fail(`tokens.css: reduced-motion block sets ${name}; only --duration-* belongs there`);
  if (value !== "0ms") fail(`tokens.css: reduced-motion ${name} must be 0ms, got ${value}`);
  if (!(name in stat)) fail(`tokens.css: reduced-motion block sets ${name}, which :root does not declare`);
}
for (const name of Object.keys(stat)) {
  if (name.startsWith("--duration-") && !reduced.some(([n]) => n === name)) {
    fail(`tokens.css: ${name} is not collapsed to 0ms in the reduced-motion block`);
  }
}

/* ----------------------------------------------------------------------------
   2. Resolve var() references per theme
   ---------------------------------------------------------------------------- */

function makeResolver(themeMap) {
  const table = { ...stat, ...themeMap };
  const resolve = (value, seen = []) =>
    value.replace(/var\((--[\w-]+)\)/g, (_, ref) => {
      if (!(ref in table)) {
        fail(`tokens.css: var(${ref}) does not resolve to a declared token`);
        return _;
      }
      if (seen.includes(ref)) {
        fail(`tokens.css: circular reference through ${ref}`);
        return _;
      }
      return resolve(table[ref], [...seen, ref]);
    });
  return { table, resolve };
}
const L = makeResolver(light);
const D = makeResolver(dark);
const resolvedLight = Object.fromEntries(Object.keys(L.table).map((n) => [n, L.resolve(L.table[n])]));
const resolvedDark = Object.fromEntries(Object.keys(D.table).map((n) => [n, D.resolve(D.table[n])]));

/* ----------------------------------------------------------------------------
   3. Colour maths — WCAG 2.x relative luminance and contrast ratio
   ---------------------------------------------------------------------------- */

function parseColor(str) {
  const s = str.trim();
  let m;
  if ((m = s.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i))) {
    const h = m[1];
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: m[2] ? parseInt(m[2], 16) / 255 : 1,
    };
  }
  if ((m = s.match(/^#([0-9a-f]{3})$/i))) {
    const [r, g, b] = m[1].split("").map((c) => parseInt(c + c, 16));
    return { r, g, b, a: 1 };
  }
  if ((m = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i))) {
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
  }
  return null;
}
const composite = (fg, bg) => ({
  r: fg.r * fg.a + bg.r * (1 - fg.a),
  g: fg.g * fg.a + bg.g * (1 - fg.a),
  b: fg.b * fg.a + bg.b * (1 - fg.a),
  a: 1,
});
const lin = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = ({ r, g, b }) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (c1, c2) => {
  const a = luminance(c1);
  const b = luminance(c2);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};
const hex = ({ r, g, b }) =>
  "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0").toUpperCase()).join("");
const fmt = (n) => n.toFixed(2);

/* ----------------------------------------------------------------------------
   4. Contrast pairs — every pair the tokens establish, both themes
   ---------------------------------------------------------------------------- */

const TEXT = 4.5;
const UI = 3;
// kind: "text" (1.4.3, 4.5:1) | "ui" (1.4.11, 3:1)
// status: "required" | "rule" (passes by the outline rule, footnote †) | "decorative" (informative only, ‡)
const PAIRS = [
  ["Text on surface", "--color-text", "--color-surface", "text"],
  ["Muted text on surface", "--color-text-muted", "--color-surface", "text"],
  ["Text on raised surface", "--color-text", "--color-surface-raised", "text"],
  ["Muted text on raised surface", "--color-text-muted", "--color-surface-raised", "text"],
  ["Primary as text on surface", "--color-primary-text", "--color-surface", "text"],
  ["Primary as text on raised surface", "--color-primary-text", "--color-surface-raised", "text"],
  ["On-primary text on primary fill", "--color-on-primary", "--color-primary", "text"],
  ["Secondary as text on surface", "--color-secondary", "--color-surface", "text"],
  ["Secondary as text on raised surface", "--color-secondary", "--color-surface-raised", "text"],
  ["On-secondary text on secondary fill", "--color-on-secondary", "--color-secondary", "text"],
  ["Success as text on surface", "--color-success", "--color-surface", "text"],
  ["Success as text on raised surface", "--color-success", "--color-surface-raised", "text"],
  ["On-state text on success fill", "--color-on-state", "--color-success", "text"],
  ["Warning as text on surface", "--color-warning", "--color-surface", "text"],
  ["Warning as text on raised surface", "--color-warning", "--color-surface-raised", "text"],
  ["On-state text on warning fill", "--color-on-state", "--color-warning", "text"],
  ["Error as text on surface", "--color-error", "--color-surface", "text"],
  ["Error as text on raised surface", "--color-error", "--color-surface-raised", "text"],
  ["On-state text on error fill", "--color-on-state", "--color-error", "text"],
  ["Info as text on surface", "--color-info", "--color-surface", "text"],
  ["Info as text on raised surface", "--color-info", "--color-surface-raised", "text"],
  ["On-state text on info fill", "--color-on-state", "--color-info", "text"],
  ["Focus ring vs surface", "--color-focus-ring", "--color-surface", "ui"],
  ["Focus ring vs raised surface", "--color-focus-ring", "--color-surface-raised", "ui"],
  ["Accent outline vs surface (the measured boundary of every accent fill)", "--color-outline-accent", "--color-surface", "ui"],
  ["Accent outline vs raised surface", "--color-outline-accent", "--color-surface-raised", "ui"],
  ["Mark vs surface", "--color-mark", "--color-surface", "ui"],
  ["Strong border vs surface", "--color-border-strong", "--color-surface", "ui"],
  ["Strong border vs raised surface", "--color-border-strong", "--color-surface-raised", "ui"],
  ["Primary fill vs surface", "--color-primary", "--color-surface", "ui", "rule"],
  ["Primary fill vs raised surface", "--color-primary", "--color-surface-raised", "ui", "rule"],
  ["Secondary fill vs surface", "--color-secondary", "--color-surface", "ui"],
  ["Success fill vs surface", "--color-success", "--color-surface", "ui"],
  ["Warning fill vs surface", "--color-warning", "--color-surface", "ui"],
  ["Error fill vs surface", "--color-error", "--color-surface", "ui"],
  ["Info fill vs surface", "--color-info", "--color-surface", "ui"],
  ["Subtle border vs surface (hairline divider)", "--color-border-subtle", "--color-surface", "ui", "decorative"],
].map(([label, fg, bg, kind, status = "required"]) => ({ label, fg, bg, kind, status }));

function evalPair(pair, resolved, themeName) {
  const fgRaw = resolved[pair.fg];
  const bgRaw = resolved[pair.bg];
  const surface = parseColor(resolved["--color-surface"]);
  const fgC = parseColor(fgRaw ?? "");
  let bgC = parseColor(bgRaw ?? "");
  if (!fgC || !bgC) {
    fail(`contrast: ${pair.label} (${themeName}): ${pair.fg}=${fgRaw} / ${pair.bg}=${bgRaw} is not a colour`);
    return null;
  }
  if (bgC.a < 1) bgC = composite(bgC, surface);
  const fgOver = fgC.a < 1 ? composite(fgC, bgC) : fgC;
  const r = ratio(fgOver, bgC);
  const threshold = pair.kind === "text" ? TEXT : UI;
  let result;
  if (pair.status === "decorative") result = "INFO";
  else if (r >= threshold) result = "PASS";
  else if (pair.status === "rule") result = "RULE";
  else result = "FAIL";
  if (result === "FAIL") fail(`contrast: ${pair.label} (${themeName}) = ${fmt(r)}:1, below ${threshold}:1`);
  return { ratio: r, threshold, result, fg: hex(fgOver), bg: hex(bgC), fgRaw, bgRaw };
}

const contrastRows = PAIRS.map((pair) => ({
  pair,
  light: evalPair(pair, resolvedLight, "light"),
  dark: evalPair(pair, resolvedDark, "dark"),
}));

/* ----------------------------------------------------------------------------
   5. SVG assets — construction rules and the no-hardcoded-colour rule
   ---------------------------------------------------------------------------- */

const ICON_ROOT = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "3",
  "stroke-linecap": "square",
  "stroke-linejoin": "miter",
};
const FORBIDDEN_MARKUP = [/<image\b/i, /<script\b/i, /<style\b/i, /<foreignObject\b/i, /href\s*=\s*["']\s*(https?:)?\/\//i, /url\(/i, /\bon\w+\s*=/i];
const PROHIBITED_TERMS = [/nintendo/i, /joy-?con/i];

function listSvgs(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".svg")).sort().map((f) => join(dir, f));
}
const iconFiles = listSvgs(P.icons);
const markFiles = listSvgs(P.mark);
if (!iconFiles.length) fail(`assets: no icons found in ${rel(P.icons)}`);
if (!markFiles.length) fail(`assets: no mark files found in ${rel(P.mark)}`);

function rootAttrs(svg) {
  const m = svg.match(/<svg\b([^>]*)>/);
  if (!m) return null;
  const attrs = {};
  for (const a of m[1].matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)) attrs[a[1]] = a[2];
  return attrs;
}

function lintSvg(file, { isIcon }) {
  const name = rel(file);
  const svg = readFileSync(file, "utf8");
  const attrs = rootAttrs(svg);
  if (!attrs) return fail(`${name}: no <svg> root element`);
  // Nested <svg> is allowed in mark files (the badge embeds the mark); icons are one element.
  if (isIcon && (svg.match(/<svg\b/g) || []).length !== 1) fail(`${name}: icons must be a single <svg> element`);
  if (!/<title\b[^>]*>[^<]+<\/title>/.test(svg)) fail(`${name}: missing <title>`);
  if (isIcon) {
    for (const [k, v] of Object.entries(ICON_ROOT)) {
      if (attrs[k] !== v) fail(`${name}: root ${k}="${attrs[k] ?? ""}" — expected "${v}"`);
    }
    // No element may soften the construction: no round caps/joins, no other stroke widths.
    for (const m of svg.matchAll(/stroke-linecap\s*=\s*"([^"]*)"/g)) if (m[1] !== "square") fail(`${name}: stroke-linecap="${m[1]}"`);
    for (const m of svg.matchAll(/stroke-linejoin\s*=\s*"([^"]*)"/g)) if (m[1] !== "miter") fail(`${name}: stroke-linejoin="${m[1]}"`);
    for (const m of svg.matchAll(/stroke-width\s*=\s*"([^"]*)"/g)) if (m[1] !== "3") fail(`${name}: stroke-width="${m[1]}" — icons use 3`);
    if (/\brx\s*=|\bry\s*=/.test(svg)) fail(`${name}: rounded rect corners (rx/ry) are not part of this icon language`);
  } else if (!attrs.viewBox) {
    fail(`${name}: missing viewBox`);
  }
  for (const re of FORBIDDEN_MARKUP) if (re.test(svg)) fail(`${name}: forbidden markup ${re}`);
  for (const re of PROHIBITED_TERMS) if (re.test(svg)) fail(`${name}: prohibited term ${re}`);

  // Literal colours: only `var(--color-x, #fallback)` with a fallback equal to x's light value.
  let stripped = svg;
  for (const m of svg.matchAll(/var\((--color-[\w-]+)\s*,\s*(#[0-9a-fA-F]{6})\)/g)) {
    const [whole, token, fallback] = m;
    const expected = resolvedLight[token];
    if (expected === undefined) fail(`${name}: ${whole} references an unknown token`);
    else if (expected.toUpperCase() !== fallback.toUpperCase()) {
      fail(`${name}: ${whole} fallback must equal the light value ${expected}`);
    }
    stripped = stripped.replace(whole, "");
  }
  for (const m of stripped.matchAll(/(fill|stroke|color|stop-color)\s*=\s*"([^"]*)"/g)) {
    const v = m[2].trim();
    if (v === "none" || v === "currentColor" || v === "") continue;
    fail(`${name}: literal colour ${m[1]}="${v}" — use currentColor or var(--color-*, #fallback)`);
  }
  if (/#[0-9a-fA-F]{3,8}\b/.test(stripped.replace(/<title[\s\S]*?<\/title>/, "").replace(/id="[^"]*"|aria-labelledby="[^"]*"|href="#[^"]*"/g, ""))) {
    fail(`${name}: literal hex colour outside a var() fallback`);
  }
  return { file, name: basename(file, ".svg"), svg, title: svg.match(/<title\b[^>]*>([^<]+)<\/title>/)?.[1] ?? "" };
}

const icons = iconFiles.map((f) => lintSvg(f, { isIcon: true })).filter(Boolean);
const marks = markFiles.map((f) => lintSvg(f, { isIcon: false })).filter(Boolean);

// Prohibited terms in the source and in anything this script will emit.
for (const re of PROHIBITED_TERMS) if (re.test(cssSource)) fail(`tokens.css: prohibited term ${re}`);
for (const f of existsSync(P.chime) ? readdirSync(P.chime) : []) {
  const t = readFileSync(join(P.chime, f), "utf8");
  for (const re of PROHIBITED_TERMS) if (re.test(t)) fail(`${rel(join(P.chime, f))}: prohibited term ${re}`);
}

/* ----------------------------------------------------------------------------
   6. Emit tokens.json
   ---------------------------------------------------------------------------- */

const tokensJson =
  JSON.stringify(
    {
      $comment: "GENERATED by design/tokens/build.mjs from design/tokens/tokens.css — do not edit. Identity C · Ink & paper.",
      source: "design/tokens/tokens.css",
      static: stat,
      themes: { light, dark },
      resolved: { light: resolvedLight, dark: resolvedDark },
    },
    null,
    2
  ) + "\n";

/* ----------------------------------------------------------------------------
   7. Emit CONTRAST.md
   ---------------------------------------------------------------------------- */

const badge = (res) =>
  res.result === "PASS" ? "PASS" : res.result === "RULE" ? "RULE †" : res.result === "INFO" ? "INFO ‡" : "**FAIL**";
const totals = { required: 0, pass: 0, fail: 0, ruleAlone: 0, ruleOutlined: 0, info: 0 };
for (const row of contrastRows) {
  for (const t of ["light", "dark"]) {
    const r = row[t];
    if (!r) continue;
    if (row.pair.status === "required") {
      totals.required++;
      if (r.result === "PASS") totals.pass++;
      else totals.fail++;
    } else if (row.pair.status === "rule") {
      if (r.result === "PASS") totals.ruleAlone++;
      else totals.ruleOutlined++;
    } else {
      totals.info++;
    }
  }
}
const contrastMd = `<!-- GENERATED by design/tokens/build.mjs from design/tokens/tokens.css — do not edit. -->
# Contrast — identity C · Ink & paper

WCAG 2.2 AA, both themes, one row per token pair the tokens establish. Regenerate with
\`node design/tokens/build.mjs\`; verify with \`--check\`. The generator exits non-zero if any
required pair is below threshold, so this table cannot be committed in a failing state.

**Method.** sRGB channels linearised, relative luminance weighted 0.2126 / 0.7152 / 0.0722,
ratio = (L_lighter + 0.05) / (L_darker + 0.05), rounded to two decimals. Translucent
colours are composited over the surface before measuring. Thresholds: 4.5:1 for text
(1.4.3), 3:1 for non-text components (1.4.11).

**Result.** ${totals.required} required measurements: ${totals.pass} pass, ${totals.fail} fail.
Rule-bound pairs: ${totals.ruleAlone} pass bare, ${totals.ruleOutlined} pass by the outline rule (†).
${totals.info} informative measurements (‡) are listed for completeness.

| Pair | Threshold | Light | | Dark | |
|---|---|---|---|---|---|
${contrastRows
  .map(({ pair, light: l, dark: d }) => {
    const cell = (r) => (r ? `\`${r.fg}\` on \`${r.bg}\` · ${fmt(r.ratio)}:1 | ${badge(r)}` : "— | —");
    return `| ${pair.label}<br><sub>\`${pair.fg}\` on \`${pair.bg}\`</sub> | ${pair.threshold ?? (pair.kind === "text" ? "4.5:1 text" : "3:1 non-text")} | ${cell(l)} | ${cell(d)} |`;
  })
  .join("\n")}

† **Rule-bound.** Saffron (\`--color-primary\`) on paper is ${fmt(contrastRows.find((r) => r.pair.label === "Primary fill vs surface").light.ratio)}:1
as a bare fill. In this identity no accent fill is ever bare on paper: every accent-filled
component carries \`--border-accent\` — a 2 px outline in \`--color-outline-accent\`, which is ink
on paper (${fmt(contrastRows.find((r) => r.pair.label.startsWith("Accent outline vs surface")).light.ratio)}:1 against the surface) — and that outline is the component boundary
1.4.11 measures. Text on the saffron fill is \`--color-on-primary\` (ink, ${fmt(contrastRows.find((r) => r.pair.label === "On-primary text on primary fill").light.ratio)}:1); saffron
as running text uses \`--color-primary-text\` (${fmt(contrastRows.find((r) => r.pair.label === "Primary as text on surface").light.ratio)}:1 on paper). On ink,
\`--color-outline-accent\` is saffron itself, so the fill stands alone at ${fmt(contrastRows.find((r) => r.pair.label === "Primary fill vs surface").dark.ratio)}:1.

‡ **Informative.** \`--color-border-subtle\` is a hairline divider — decoration, never the only
boundary of a component — so 1.4.11 does not apply to it. Component boundaries use
\`--border-strong\` or \`--border-accent\`.
`;

/* ----------------------------------------------------------------------------
   8. Emit specimen.html — a review sheet that consumes only tokens
   ---------------------------------------------------------------------------- */

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// Inline an SVG file: drop the XML prolog, ids and aria wiring (a caption sits beside it).
const inline = (svg, extraClass = "") =>
  svg
    .replace(/<\?xml[^>]*\?>\s*/, "")
    .replace(/\s(id|aria-labelledby|role)="[^"]*"/g, "")
    .replace(/<svg\b/, `<svg aria-hidden="true"${extraClass ? ` class="${extraClass}"` : ""}`)
    .trim();
const scopedBlock = (sel, map) => `${sel} {\n${Object.entries(map).map(([k, v]) => `  ${k}: ${v};`).join("\n")}\n}`;
const themeCss = [scopedBlock('.theme[data-theme="light"]', light), scopedBlock('.theme[data-theme="dark"]', dark)].join("\n");

const colourNames = themedNames.filter((n) => n.startsWith("--color-"));
const typeNames = Object.keys(stat).filter((n) => n.startsWith("--text-"));
const spaceNames = Object.keys(stat).filter((n) => n.startsWith("--space-") && stat[n] !== "0");
const radiusNames = Object.keys(stat).filter((n) => n.startsWith("--radius-") && !n.endsWith("circle"));
const elevNames = Object.keys(stat).filter((n) => n.startsWith("--elevation-"));
const byName = (n) => icons.find((i) => i.name === n);
const sectionTiles = ["tile-experience", "tile-projects", "tile-certifications", "tile-education", "tile-hobbies", "tile-news"];
const tileLabels = { "tile-experience": "Experience", "tile-projects": "Projects", "tile-certifications": "Certifications", "tile-education": "Education", "tile-hobbies": "Hobbies", "tile-news": "Now" };
const railNames = ["tile-news", "all-software", "album", "controllers", "settings", "sleep"];

const swatches = colourNames
  .map(
    (n) =>
      `<li><i class="chip" style="background:var(${n})"></i><b>${esc(n.replace("--color-", ""))}</b><code class="hex" data-light="${esc(resolvedLight[n])}" data-dark="${esc(resolvedDark[n])}"></code></li>`
  )
  .join("\n");

const iconGrid = icons
  .map((i) => `<figure><span class="ic">${inline(i.svg)}</span><span class="ic lg">${inline(i.svg)}</span><figcaption>${esc(i.name)}</figcaption></figure>`)
  .join("\n");

const trophyRow = ["locked", "in-progress", "unlocked"]
  .map((s) => {
    const ic = byName(`trophy-${s}`);
    return ic ? `<figure class="tstate t-${s}"><span class="ic lg">${inline(ic.svg)}</span><figcaption>${s.replace("-", " ")}</figcaption></figure>` : "";
  })
  .join("\n");

const strip = `<div class="strip">
  <div class="bar"><span class="logo">${marks.find((m) => m.name === "kj-mark") ? inline(marks.find((m) => m.name === "kj-mark").svg) : ""}</span><span class="clock"><i></i>12:00</span></div>
  <ul class="tiles">${sectionTiles
    .map((n, idx) => {
      const ic = byName(n);
      return `<li class="tile${idx === 0 ? " is-focused" : ""}"><span class="face">${ic ? inline(ic.svg) : ""}</span><span class="lbl">${tileLabels[n]}</span></li>`;
    })
    .join("")}</ul>
  <div class="foot"><ul class="rail">${railNames
    .map((n, idx) => {
      const ic = byName(n);
      return `<li class="${idx === 0 ? "is-active" : ""}">${ic ? inline(ic.svg) : ""}</li>`;
    })
    .join("")}</ul><span class="hints"><span>${byName("hint-a") ? inline(byName("hint-a").svg) : ""}Select</span><span>${byName("hint-b") ? inline(byName("hint-b").svg) : ""}Back</span></span></div>
</div>`;

const panel = (theme) => `<section class="theme" data-theme="${theme}" aria-label="${theme} theme">
  <h2>${theme === "light" ? "Paper" : "Ink"} <small>${theme}</small></h2>

  <h3>Mark</h3>
  <div class="row">
    <span class="mark">${marks.find((m) => m.name === "kj-mark") ? inline(marks.find((m) => m.name === "kj-mark").svg) : ""}</span>
    <span class="badge">${marks.find((m) => m.name === "kj-badge") ? inline(marks.find((m) => m.name === "kj-badge").svg) : ""}</span>
  </div>

  <h3>Colour</h3>
  <ul class="swatches">
${swatches}
  </ul>

  <h3>Surfaces, borders, focus, elevation</h3>
  <div class="row wrap">
    <div class="tile-demo">idle</div>
    <div class="tile-demo focused">focused</div>
    <div class="tile-demo accent">accent</div>
    <div class="tile-demo raised">raised</div>
    ${elevNames.map((n) => `<div class="tile-demo" style="box-shadow:var(${n})">${esc(n.replace("--", ""))}</div>`).join("\n    ")}
  </div>

  <h3>Type</h3>
  ${typeNames.map((n) => `<p class="type" style="font-size:var(${n})"><span>${esc(n)}</span> Ink &amp; paper — a printed programme</p>`).join("\n  ")}
  <p class="type mono">--font-mono · const status = "unlocked";</p>

  <h3>Spacing</h3>
  <div class="spaces">${spaceNames.map((n) => `<div><i style="width:var(${n})"></i><code>${esc(n)}</code></div>`).join("")}</div>

  <h3>Radii</h3>
  <div class="row">${radiusNames.map((n) => `<div class="rad" style="border-radius:var(${n})"><code>${esc(n.replace("--radius-", ""))}</code></div>`).join("")}</div>

  <h3>Motion</h3>
  <div class="row"><button type="button" class="tile-demo motion">hover / focus</button><p class="muted">Glide · <code>var(--ease-glide)</code> · <code>var(--duration-base)</code>. Under reduced motion the durations are 0ms.</p></div>

  <h3>Trophy states</h3>
  <div class="row">${trophyRow}</div>

  <h3>Icons <small>${icons.length} · 24 px grid · 3 px stroke</small></h3>
  <div class="icons">
${iconGrid}
  </div>

  <h3>In context</h3>
  ${strip}
</section>`;

const specimenHtml = `<!DOCTYPE html>
<!-- GENERATED by design/tokens/build.mjs from design/tokens/tokens.css and design/assets — do not edit. -->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Token specimen — identity C · Ink &amp; paper</title>
<meta name="color-scheme" content="light dark">
<link rel="stylesheet" href="tokens.css">
<style>
/* Scoped copies of the themed tokens, generated from tokens.css, so both themes
   render side by side. Everything below consumes tokens; nothing is hardcoded. */
${themeCss}

*{box-sizing:border-box}
body{margin:0;background:var(--color-surface);color:var(--color-text);font-family:var(--font-sans);font-size:var(--text-md);line-height:var(--leading-normal)}
code{font-family:var(--font-mono);font-size:0.85em}
h1{font-size:var(--text-2xl);line-height:var(--leading-tight);letter-spacing:var(--tracking-tight);margin:0 0 var(--space-2)}
h2{font-size:var(--text-xl);line-height:var(--leading-tight);margin:0 0 var(--space-4)}
h2 small,h3 small{font-size:var(--text-xs);font-weight:var(--weight-regular);color:var(--color-text-muted);margin-left:var(--space-2)}
h3{font-size:var(--text-xs);text-transform:uppercase;letter-spacing:var(--tracking-caps);color:var(--color-text-muted);margin:var(--space-6) 0 var(--space-2)}
p{margin:var(--space-1) 0}
.muted{color:var(--color-text-muted)}
.wrap{max-width:1600px;margin:0 auto;padding:var(--space-6) var(--space-6) var(--space-12)}
header p{max-width:80ch;color:var(--color-text-muted)}
.compare{display:grid;grid-template-columns:repeat(auto-fit,minmax(440px,1fr));gap:var(--space-6);align-items:start}
.theme{background:var(--color-surface);color:var(--color-text);border:var(--border-strong);border-radius:var(--radius-sm);padding:var(--space-6)}
.row{display:flex;gap:var(--space-4);align-items:center}
.row.wrap{flex-wrap:wrap;align-items:flex-end}
.mark{display:block;width:96px;height:81px;color:var(--color-mark)}
.mark svg{width:100%;height:100%;display:block}
.badge{display:block;width:64px;height:64px}
.badge svg{width:100%;height:100%;display:block}
ul.swatches{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:var(--space-2)}
ul.swatches li{display:flex;flex-direction:column;gap:2px;font-size:var(--text-xs);line-height:1.25}
ul.swatches .chip{display:block;height:28px;border-radius:var(--radius-xs);border:var(--border-hairline)}
ul.swatches b{font-weight:var(--weight-semibold)}
ul.swatches .hex{color:var(--color-text-muted)}
.theme[data-theme="light"] .hex::before{content:attr(data-light)}
.theme[data-theme="dark"] .hex::before{content:attr(data-dark)}
.tile-demo{appearance:none;font:inherit;font-size:var(--text-xs);color:var(--color-text);width:88px;height:88px;display:grid;place-items:center;text-align:center;padding:var(--space-1);background:var(--color-surface);border:var(--border-strong);border-radius:var(--radius-sm)}
.tile-demo.focused{outline:var(--focus-ring);outline-offset:var(--focus-ring-offset);box-shadow:var(--elevation-2)}
.tile-demo.accent{background:var(--color-primary);color:var(--color-on-primary);border:var(--border-accent)}
.tile-demo.raised{background:var(--color-surface-raised);border:var(--border-hairline)}
.tile-demo.motion{cursor:default;transition-property:transform,box-shadow;transition-timing-function:var(--ease-glide);transition-duration:var(--duration-base)}
.tile-demo.motion:hover,.tile-demo.motion:focus-visible{transform:translateY(-6px);box-shadow:var(--elevation-accent);outline:var(--focus-ring);outline-offset:var(--focus-ring-offset)}
.type{margin:0 0 var(--space-1);line-height:var(--leading-tight);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.type span{display:inline-block;min-width:9ch;font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-muted)}
.type.mono{font-family:var(--font-mono);font-size:var(--text-sm);color:var(--color-primary-text)}
.spaces div{display:flex;align-items:center;gap:var(--space-2);margin-bottom:2px}
.spaces i{display:block;height:12px;background:var(--color-secondary)}
.rad{width:56px;height:56px;border:var(--border-strong);display:grid;place-items:center;font-size:var(--text-xs)}
.icons{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:var(--space-3)}
.icons figure,.tstate{margin:0;display:flex;flex-direction:column;align-items:center;gap:var(--space-1);font-size:var(--text-xs);color:var(--color-text-muted);text-align:center}
.ic{display:inline-block;width:var(--size-icon);height:var(--size-icon);color:var(--color-text)}
.ic.lg{width:var(--size-icon-lg);height:var(--size-icon-lg)}
.ic svg{width:100%;height:100%;display:block}
.icons figure>span{display:inline-flex;gap:var(--space-2);align-items:flex-end}
.icons figure .ic:first-child{margin-right:var(--space-2)}
.t-locked .ic{color:var(--color-text-muted)}
.t-in-progress .ic{color:var(--color-warning)}
.t-unlocked .ic{color:var(--color-outline-accent)}
.strip{border:var(--border-strong);border-radius:var(--radius-sm);padding:var(--space-3);display:flex;flex-direction:column;gap:var(--space-3)}
.strip .bar{display:flex;align-items:center;justify-content:space-between;font-size:var(--text-sm);color:var(--color-text-muted)}
.strip .logo{display:block;width:32px;height:27px;color:var(--color-mark)}
.strip .logo svg{width:100%;height:100%;display:block}
.strip .clock{display:flex;align-items:center;gap:var(--space-2)}
.strip .clock i{display:inline-block;width:8px;height:8px;border-radius:var(--radius-circle);background:var(--color-success)}
.strip ul.tiles{list-style:none;margin:0;padding:2px 0 0;display:flex;gap:var(--space-3);overflow:hidden}
.strip .tile{flex:none;width:72px;display:flex;flex-direction:column;align-items:center;gap:var(--space-1);font-size:var(--text-xs);color:var(--color-text-muted);text-align:center}
.strip .face{display:grid;place-items:center;width:56px;height:56px;background:var(--color-surface-raised);border:var(--border-strong);border-radius:var(--radius-sm);color:var(--color-text)}
.strip .face svg{width:var(--size-icon);height:var(--size-icon)}
.strip .tile.is-focused{color:var(--color-text);font-weight:var(--weight-semibold)}
.strip .tile.is-focused .face{background:var(--color-primary);color:var(--color-on-primary);border:var(--border-accent);box-shadow:var(--elevation-2)}
.strip .foot{display:flex;align-items:center;justify-content:space-between}
.strip .rail{display:flex;gap:var(--space-2);list-style:none;margin:0;padding:0}
.strip .rail li{width:32px;height:32px;border-radius:var(--radius-circle);border:2px solid var(--color-text-muted);color:var(--color-text-muted);display:grid;place-items:center}
.strip .rail li svg{width:16px;height:16px}
.strip .rail li.is-active{background:var(--color-primary);color:var(--color-on-primary);border:var(--border-accent)}
.strip .hints{font-size:var(--text-xs);color:var(--color-text-muted);display:flex;gap:var(--space-3)}
.strip .hints span{display:inline-flex;align-items:center;gap:var(--space-1)}
.strip .hints svg{width:18px;height:18px}
footer{margin-top:var(--space-8);padding-top:var(--space-4);border-top:var(--border-hairline);color:var(--color-text-muted);font-size:var(--text-sm)}
:focus-visible{outline:var(--focus-ring);outline-offset:var(--focus-ring-offset)}
@media (max-width:520px){.compare{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="wrap">
<header>
  <h1>Token specimen</h1>
  <p>Identity C · Ink &amp; paper. Generated from <code>design/tokens/tokens.css</code> and <code>design/assets/</code>; every colour, size, radius, shadow and easing on this page is a <code>var()</code>. Both themes side by side; the page chrome follows your system theme. Typefaces are Inter and JetBrains Mono when loaded by the app; this local page renders with their fallback stacks.</p>
</header>
<main class="compare">
${panel("light")}
${panel("dark")}
</main>
<footer>
  <p>Contrast per token pair, both themes: <code>design/tokens/CONTRAST.md</code>. Provenance and the borrowed-grammar distinction: <code>DESIGN.md</code>.</p>
</footer>
</div>
</body>
</html>
`;

for (const re of PROHIBITED_TERMS) {
  for (const [name, text] of [["tokens.json", tokensJson], ["CONTRAST.md", contrastMd], ["specimen.html", specimenHtml]]) {
    if (re.test(text)) fail(`generated ${name}: prohibited term ${re}`);
  }
}

/* ----------------------------------------------------------------------------
   9. Write or check
   ---------------------------------------------------------------------------- */

const outputs = [
  [P.json, tokensJson],
  [P.contrast, contrastMd],
  [P.specimen, specimenHtml],
];

if (CHECK) {
  for (const [file, content] of outputs) {
    const onDisk = existsSync(file) ? readFileSync(file, "utf8") : null;
    if (onDisk !== content) fail(`${rel(file)} is stale — run node design/tokens/build.mjs`);
  }
} else {
  for (const [file, content] of outputs) writeFileSync(file, content);
}

report();

function report() {
  const summary = [
    `tokens: ${Object.keys(stat).length} static, ${themedNames.length} themed`,
    `contrast: ${totals.required} required measurements, ${totals.pass} pass, ${totals.fail} fail · rule-bound ${totals.ruleAlone} bare + ${totals.ruleOutlined} outlined · ${totals.info} informative`,
    `assets: ${icons.length} icons, ${marks.length} mark files`,
  ];
  if (problems.length) {
    console.error(`build.mjs: ${problems.length} problem(s)`);
    for (const p of problems) console.error("  - " + p);
    process.exit(1);
  }
  console.log(`build.mjs: ok${CHECK ? " (check)" : ""} — ` + summary.join(" · "));
  if (!CHECK) for (const [file] of outputs) console.log("  wrote " + rel(file));
}
