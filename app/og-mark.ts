import { readFileSync } from "node:fs";
import { join } from "node:path";
// Relative, not the `@/` alias: this module has a test beside it.
import tokens from "../design/tokens/tokens.json";

// The pieces of the share image (app/opengraph-image.tsx), kept out of the
// route file so they can be tested — a metadata route may only export the
// fields Next defines.
//
// The mark keeps exactly one source, design/assets/mark/kj-badge.svg, the
// same file app/page.tsx inlines. The read is a *literal* path at module
// scope, the tiles.ts / page.tsx pattern @vercel/nft can trace. It runs at
// build: the image route takes no request input and fetches nothing, so it is
// prerendered once and served as a static file (see the route's comment).
//
// The image renderer (Satori, then resvg) cannot resolve CSS custom
// properties, and the badge paints with `var(--color-*, #fallback)` so it can
// follow the theme when inlined. design/tokens/build.mjs guarantees every such
// fallback is the token's light-theme value, so substituting the fallback is
// the light theme — not a second colour decision. The background is read the
// same way, from the generated tokens.json (never edited), so no colour is
// defined anywhere but design/tokens/tokens.css.

/**
 * Replaces every `var(--color-*, #hex)` with its fallback hex.
 * @returns the SVG with no custom-property references left in paint values.
 */
export function resolveColorFallbacks(svg: string): string {
  return svg.replace(/var\(--color-[a-z0-9-]+,\s*(#[0-9A-Fa-f]{3,8})\)/g, "$1");
}

const badge = resolveColorFallbacks(
  readFileSync(join(process.cwd(), "design/assets/mark/kj-badge.svg"), "utf8"),
);

/** The KJ badge as an `<img src>` for the share image. */
export const OG_MARK_SRC = `data:image/svg+xml;base64,${Buffer.from(badge, "utf8").toString("base64")}`;

/** The paper surface: the light theme's `--color-surface`. */
export const OG_BACKGROUND: string = tokens.themes.light["--color-surface"];
