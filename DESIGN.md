# DESIGN.md — identity and provenance

This site's Explorer mode is a handheld-console-style shell. This document records what
that shell borrows, what it does not, and where the original identity that stands in for
the protected parts lives in the repository. It is written for anyone reading the public
repo.

## What is borrowed: an interaction grammar

The shell uses a layout convention shared by many console and launcher interfaces:

- flat, high-contrast surfaces with no skeuomorphism;
- thick square-cornered tiles in a horizontal, recency-ordered row;
- a bottom rail of circular utility buttons;
- a top status bar with identity on the left and clock / status on the right;
- corner button hints in the `A Select` / `B Back` style;
- near-instant transitions and minimal click-style sound;
- a profile-select screen at entry, a trophy case, a play-activity view, notifications.

These are functional arrangements — where things sit and how you move between them. They
are the grammar of the genre, not the expression of any one product, and they are what
makes keyboard and gamepad navigation feel native here.

## What is not taken

No third-party console mark, logotype, typeface, character, box art, hardware rendering
or chime appears in this repository or in the built site. Specifically:

- no console manufacturer's name or product name as branding anywhere in UI copy,
  metadata, filenames, or alt text;
- no controller silhouettes and no red-with-blue accent pairing;
- no rendered device — the shell is a flat interface layout, never a picture of hardware;
- no proprietary boot chime, and nothing resembling one;
- no third-party icon set, wordmark, or font binaries committed.

Every mark, icon, colour, easing curve and sound in the identity below was drawn, chosen
or composed for this project. Third-party media the site may display at run time — game
cover art, album art — comes from the ingestion providers, is never committed, and is
shown only under each provider's terms.

## The identity: C · Ink & paper

Chosen from three original proposals (`design/identity-proposals/index.html`, column C).

- **Surfaces.** Paper (`#F6F1E6`, raised `#FFFDF8`) in the light theme; ink (`#171612`,
  raised `#23211B`) in the dark theme. Text is ink on paper and paper on ink.
- **One accent.** Saffron `#E8B11B` is the active item and the reward. Slate
  (`#4A5560` on paper, `#9AA5B0` on ink) does structure and information. Semantic states
  are muted earth hues so the single accent stays the loudest thing on screen.
- **The outline rule.** On paper, every accent fill carries a 2 px ink outline; on ink,
  saffron stands alone. The tokens carry this: `--color-outline-accent` is ink on paper
  and saffron on ink, and `--border-accent`, `--color-focus-ring`, `--color-mark` and
  `--color-shadow` follow it. Saffron as running text on paper uses the deepened
  `--color-primary-text` (`#7A5A00`); text on a saffron fill is ink.
- **Mark.** A KJ monogram: heavy slab forms with stencil cuts, butt terminals, slab serifs
  top and bottom. Ink on paper, saffron on ink. `design/assets/mark/`.
- **Icons.** Drawn from scratch on a 24 px grid: 3 px outlines, square caps, mitred joins,
  no rounding. Fills appear only for the active or unlocked item, in saffron, inside the
  outline. `design/assets/icons/`.
- **Motion.** Glide — `cubic-bezier(0.16, 1, 0.3, 1)`, 180–320 ms. Fast departure, long
  deceleration, no overshoot; things arrive like a page settling. Under
  `prefers-reduced-motion` every duration is 0 ms and the boot sequence does not run.
- **Elevation.** Hard offset shadows with no blur — a stamp, not a glow.
- **Sound.** A soft low sine thud followed by a single bright click, about 0.4 s: a stamp
  landing on paper. An original composition, delivered as a Web Audio synthesis spec in
  code (`design/assets/chime/boot-chime.js`); no audio file exists. Sound is off by
  default and plays only after opt-in.
- **Type.** Inter for the interface and JetBrains Mono for code and terminal elements,
  both under the SIL Open Font License. Font files are not committed; the app loads them
  at build time, and system stacks are the fallback.

## Where things live

| Path | What |
|---|---|
| `design/tokens/tokens.css` | Source of truth: every colour, size, radius, easing and shadow as CSS custom properties, light and dark |
| `design/tokens/build.mjs` | Generator and linter — `node design/tokens/build.mjs` regenerates, `--check` verifies |
| `design/tokens/tokens.json` | Generated JSON mirror of the tokens |
| `design/tokens/CONTRAST.md` | Generated WCAG 2.2 AA table, one row per token pair, both themes |
| `design/tokens/specimen.html` | Generated review sheet; every value on it is a `var()` |
| `design/assets/icons/`, `mark/`, `chime/` | Icons, the KJ mark, the chime spec |

The theme is selected by `data-theme="light"` or `"dark"` on the root element; with no
attribute the system preference applies. Contrast ratios, swatches and specimen colours are all
generated from the one token source, so they cannot disagree with each other.
