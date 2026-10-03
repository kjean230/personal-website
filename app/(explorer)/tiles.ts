/**
 * app/(explorer)/tiles.ts — the shell's icons, read from the Phase 0 assets (S7).
 *
 * `app/(explorer)` is the console shell's component directory, not a route
 * tree: it holds no `page.tsx` and no `layout.tsx`, because two route groups
 * resolving to one path is a Next build error and the architecture fixes one
 * page file per URL. Nothing here creates a URL.
 *
 * Server-only, and self-enforcing: a `"use client"` module importing this would
 * pull `node:fs` into the browser build and fail it outright. That is why the
 * tile row takes server-rendered children instead of icon props.
 *
 * `design/assets/icons/` stays the single source of the icon set — nothing is
 * copied into `app/`. Two consequences worth stating, because neither is
 * visible from the call site:
 *
 *  1. Every read is a **literal** path. `/[section]`, `/[section]/[slug]` and
 *     `/all` render per request, so these reads happen at cold start inside the
 *     serverless function, not at build; `@vercel/nft` can only trace a path it
 *     can evaluate statically. `next.config.ts` also names the directory in
 *     `outputFileTracingIncludes`, because a local `next start` runs from the
 *     repo root and would never reveal a tracing gap that breaks the deploy.
 *  2. The route table owns which sections exist; this file only says which
 *     drawing belongs to each, and throws at import if a section has none.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
// Relative, not "@/": this module is also imported by tiles.test.ts, and the
// Vitest config declares no path alias (lib/**/*.test.ts uses the same style).
import type { Facet } from "../../lib/content/schema";
import { SECTIONS } from "../../lib/routes/table";

/**
 * Prepares an icon for inlining, as `design/tokens/build.mjs` does for the
 * specimen sheet: drop the XML prolog, strip the `id` / `aria-labelledby` /
 * `role` wiring, and mark the `<svg>` decorative.
 *
 * Stripping is not tidying. The icon files carry a hard-coded
 * `id="icon-<name>-title"`, so inlining them raw would put duplicate ids in
 * any document that shows one glyph twice — which S8's trophy rows will do —
 * and `role="img"` with a `<title>` would give each tile link a second
 * accessible name on top of its visible label, announcing "Experience
 * Experience". `aria-hidden` leaves the label as the only name.
 *
 * This goes one step further than `build.mjs` and removes the `<title>`
 * element as well: the specimen has no text beside its glyphs, but a tile
 * does, and a retained `<title>` shows as a hover tooltip repeating the label.
 * @returns the SVG source, ready for `dangerouslySetInnerHTML`.
 */
export function inlineIcon(svg: string): string {
  return svg
    .replace(/<\?xml[^>]*\?>\s*/, "")
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>\s*/g, "")
    .replace(/\s(id|aria-labelledby|role)="[^"]*"/g, "")
    .replace(/<svg\b/, '<svg aria-hidden="true" focusable="false"')
    .trim();
}

const read = (svg: string) => inlineIcon(svg);

/**
 * Section segment → its inlined icon. Every drawing is a hand-drawn Phase 0
 * icon (24 px grid, 3 px stroke, `currentColor` — DESIGN.md).
 *
 * `now` is drawn by `tile-news.svg`, not `tile-now.svg`: the section is `/now`,
 * but the icon was drawn for brief §4.3's "Now/News". This is the one place
 * that mismatch is written down.
 */
const ICONS: Readonly<Record<string, string>> = {
  experience: read(readFileSync(join(process.cwd(), "design/assets/icons/tile-experience.svg"), "utf8")),
  projects: read(readFileSync(join(process.cwd(), "design/assets/icons/tile-projects.svg"), "utf8")),
  certifications: read(readFileSync(join(process.cwd(), "design/assets/icons/tile-certifications.svg"), "utf8")),
  education: read(readFileSync(join(process.cwd(), "design/assets/icons/tile-education.svg"), "utf8")),
  hobbies: read(readFileSync(join(process.cwd(), "design/assets/icons/tile-hobbies.svg"), "utf8")),
  now: read(readFileSync(join(process.cwd(), "design/assets/icons/tile-news.svg"), "utf8")),
};

/** The `A Select` / `B Back` button glyphs (brief §2.1's corner button hints). */
export const HINT_ICONS = {
  a: read(readFileSync(join(process.cwd(), "design/assets/icons/hint-a.svg"), "utf8")),
  b: read(readFileSync(join(process.cwd(), "design/assets/icons/hint-b.svg"), "utf8")),
} as const;

/**
 * One trophy drawing per `entries.status` (S8) — keyed by the status itself, so
 * `trophy.tsx` can index it with no second lookup table. The trophy case shows
 * one of these per row, which is the duplicate-id case `inlineIcon` above is
 * written for.
 *
 * `archived` is drawn by `trophy-locked.svg`, the same kind of mismatch as
 * `now` → `tile-news.svg`: the *file* was named for brief §5's word, the
 * *state* is named for the data. An archived credential is one that lapsed —
 * one you earned — so it is not called "locked" in the UI, only drawn with the
 * hollow cup. `trophy.tsx` owns that wording; this map owns the drawing.
 *
 * `trophy-unlocked.svg` is the one icon in the set carrying a literal colour,
 * as DESIGN.md's `var(--color-*, #fallback)` form: it is the earned trophy, and
 * a fill appears only for the unlocked item, inside its own 3 px stroke.
 */
export const TROPHY_ICONS = {
  unlocked: read(readFileSync(join(process.cwd(), "design/assets/icons/trophy-unlocked.svg"), "utf8")),
  in_progress: read(readFileSync(join(process.cwd(), "design/assets/icons/trophy-in-progress.svg"), "utf8")),
  archived: read(readFileSync(join(process.cwd(), "design/assets/icons/trophy-locked.svg"), "utf8")),
} as const;

/**
 * The glyph on both profile choices (feat/shell-boot-profile). One drawing for
 * two profiles on purpose: no icon was drawn for either mode, and the icon set
 * is not redrawn here (DESIGN.md). The label beside it is what tells them
 * apart, as it is for every other glyph in the shell.
 */
export const PROFILE_ICON = read(
  readFileSync(join(process.cwd(), "design/assets/icons/profile-select.svg"), "utf8"),
);

/**
 * The glyph on the link to the "All Software" index (feat/shell-tile-grid):
 * the four squares Phase 0 drew for it, shown where Phase 0's specimen put it —
 * a circular button beside the tile row, not a seventh tile.
 */
export const ALL_ICON = read(
  readFileSync(join(process.cwd(), "design/assets/icons/all-software.svg"), "utf8"),
);

/**
 * The glyph on each facet chip (feat/shell-facets): the six Phase 0 drew for
 * exactly this, keyed by the facet, with `all` for the chip that clears one.
 * Shown in Explorer mode only; the stylesheet hides them elsewhere. Tags have
 * no glyphs — none was drawn, and none is drawn here.
 *
 * `satisfies` is the totality check: a sixth facet in `FACETS` fails
 * `typecheck` on this line until someone says which drawing it gets.
 */
export const FACET_ICONS = {
  all: read(readFileSync(join(process.cwd(), "design/assets/icons/facet-all.svg"), "utf8")),
  corporate: read(readFileSync(join(process.cwd(), "design/assets/icons/facet-corporate.svg"), "utf8")),
  research: read(readFileSync(join(process.cwd(), "design/assets/icons/facet-research.svg"), "utf8")),
  volunteer: read(readFileSync(join(process.cwd(), "design/assets/icons/facet-volunteer.svg"), "utf8")),
  classroom: read(readFileSync(join(process.cwd(), "design/assets/icons/facet-classroom.svg"), "utf8")),
  coursework: read(readFileSync(join(process.cwd(), "design/assets/icons/facet-coursework.svg"), "utf8")),
} as const satisfies Record<Facet | "all", string>;

for (const section of SECTIONS) {
  if (!ICONS[section.segment]) throw new Error(`tiles: section "${section.segment}" has no icon`);
}

/** One inlined icon per section, keyed by segment. Total over `SECTIONS`, checked at import. */
export const TILE_ICONS: ReadonlyMap<string, string> = new Map(
  SECTIONS.map((section) => [section.segment, ICONS[section.segment]]),
);

/**
 * @returns the inlined icon for a section segment.
 * @throws if the segment is not a section — `SECTIONS` is the only caller.
 */
export function tileIcon(segment: string): string {
  const icon = TILE_ICONS.get(segment);
  if (!icon) throw new Error(`tiles: no icon for segment "${segment}"`);
  return icon;
}
