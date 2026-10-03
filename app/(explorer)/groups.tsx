/**
 * app/(explorer)/groups.tsx — Groups: facet and tag browsing (feat/shell-facets,
 * brief §5 "Groups — tag and facet browsing", brief §4.2's filter chips).
 *
 * Server components, kept here rather than in a page file so they can be
 * rendered to static markup under test, as `all-software.tsx` is.
 *
 * One markup, two renderings — the same rule the index follows. What the
 * server sends is what Recruiter mode and a visitor without JavaScript get:
 * rows of ordinary links, each `Label (n)`, the current one marked
 * `aria-current="page"`. Explorer mode adds two things on top and removes
 * nothing: `<TileRow explorerOnly>` makes each row one tab stop walked with
 * the arrows (brief §4.2: "arrow-key traversable"), and the stylesheet shows
 * the glyph Phase 0 drew for each facet.
 *
 * A chip is a link to a real URL from the route table and nothing else —
 * `/<section>?facet=…`, `/all?facet=…`, `/all?tag=…`. One group at a time, so
 * a chip never carries another filter with it (owner's decisions,
 * handoff/feat-shell-facets.md).
 */

import Link from "next/link";
import type { TagCategory } from "../../lib/content/schema";
import type { AllPage, FacetChip } from "../../lib/routes/load";
import site from "../site.module.css";
import { TileRow } from "./tile-row";
import { FACET_ICONS } from "./tiles";
import styles from "./explorer.module.css";

/**
 * The visible label of each tag category's row. These are the four headings
 * the entry page shows over an entry's own tags, by the owner's decision —
 * and that page keeps its own copy of them, because this row does not touch
 * it. `groups.test.tsx` pins these; unify the two when the entry page is next
 * edited.
 */
export const TAG_CATEGORY_LABELS: Readonly<Record<TagCategory, string>> = {
  skill: "Skills",
  tool: "Tools",
  domain: "Domains",
  team: "Teams",
};

interface Chip {
  readonly href: string;
  readonly label: string;
  readonly count: number;
  readonly active: boolean;
  /** An inlined glyph for the chip, shown in Explorer mode only. Facets have one; tags do not. */
  readonly icon?: string;
}

interface ChipRowProps {
  readonly chips: readonly Chip[];
  /** The list's accessible name, where nothing around it already gives it one. */
  readonly label?: string;
  /** The id of the visible label that names the list. */
  readonly labelledBy?: string;
}

/**
 * One row of chips. The markup is the chip list section pages have had since
 * S5 — same classes, same text — with two additions that do nothing outside
 * Explorer mode: `data-tile` for the island, and the glyph, which is
 * `aria-hidden` and hidden by the stylesheet. The label is a sibling of the
 * glyph, never inside it, so the text stays the link's only name.
 */
function ChipRow({ chips, label, labelledBy }: ChipRowProps) {
  return (
    <TileRow explorerOnly className={site.chipList} label={label} labelledBy={labelledBy}>
      {chips.map((chip) => (
        <li key={chip.href}>
          <Link
            href={chip.href}
            data-tile
            className={site.chip}
            aria-current={chip.active ? "page" : undefined}
          >
            {chip.icon && (
              <span
                className={styles.chipIcon}
                // Hand-drawn Phase 0 icon, stripped and marked decorative by
                // tiles.ts. Static, repo-owned SVG — never user input.
                dangerouslySetInnerHTML={{ __html: chip.icon }}
              />
            )}
            {chip.label} ({chip.count})
          </Link>
        </li>
      ))}
    </TileRow>
  );
}

/**
 * A row of facet chips: `All (n)` and each facet that has entries. Section
 * pages render it inside their own `<nav aria-label="Facets">`, which already
 * names it, so they pass no `label`; Groups names it itself.
 */
export function FacetChips({ chips, label }: { chips: readonly FacetChip[]; label?: string }) {
  return (
    <ChipRow
      label={label}
      chips={chips.map((chip) => ({ ...chip, icon: FACET_ICONS[chip.facet ?? "all"] }))}
    />
  );
}

/**
 * Groups on `/all`: the facet row, then one row of tag chips per category that
 * has any. The landmark is named "Groups" and has no visible title (owner's
 * decisions). Every list in it has a name of its own: the facet list is
 * "Facets"; a tag list is named by the visible category label above it.
 *
 * With no tags at all — the hosted site today — this is the facet row alone.
 */
export function Groups({ facets, tags }: Pick<AllPage, "facets" | "tags">) {
  return (
    <nav aria-label="Groups" className={site.chips}>
      <FacetChips chips={facets} label="Facets" />
      {tags.map((row) => {
        const id = `group-${row.category}`;
        return (
          <div key={row.category} className={site.tagGroup}>
            <p id={id} className={site.tagHeading}>
              {TAG_CATEGORY_LABELS[row.category]}
            </p>
            <ChipRow labelledBy={id} chips={row.chips} />
          </div>
        );
      })}
    </nav>
  );
}
