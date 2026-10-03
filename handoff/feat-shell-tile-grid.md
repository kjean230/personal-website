# Handoff — feat/shell-tile-grid

**Merged into:** `lane/console-shell` — PR opened with auto-merge enabled. The merge record is the close-out's to add.
**Plan row:** `BUILD_PLAN.md` §5, `lane/console-shell`, second row — "`feat/shell-tile-grid` (tile row, All Software index, search)". Brief §5: "Tile row — Top-level sections" and "'All Software' grid — Full searchable index of every entry". Motion per the plan's mapping: hover and focus zoom, smooth scrolling, the icon-display grammar.

## Shipped

### The answer, first

- **`/all` is a new page: the "All Software" index.** It lists every entry on the site once, with a search box above the list.
- **Search is `/all?q=<words>`**, answered by the server. It works with JavaScript off and in both modes, and a search is a link that can be shared.
- **Explorer mode now looks different from Recruiter mode**, on two pages: the home tile row and the index. Every other page is unchanged.
- **Recruiter mode is unchanged on the home page.** The link to the index shows only after a session chooses Explorer.
- **Zoom and smooth scrolling are Explorer-only and are off under `prefers-reduced-motion`.**
- No dependency was added and no LCP remediation was performed.

### Starting state, verified before any branch existed

- `origin/main` = `3c281104d8112b2d196a012ab3bce5d5ccaa8693`.
- `origin/lane/console-shell` = `2c7c5766f410ff2cdc4730b7e0064d98663cebe5`, the squash of PR #52. Its tree is identical to `feat/shell-boot-profile`'s tip (`git diff 0ae23d0 2c7c576` is empty).
- No `feat/shell-tile-grid` branch, locally or on the remote, and no PR for it. No later console-shell branch.
- Working tree clean. `.git/info/exclude` empty. The git-ignored `REFERENCES.md` is present.
- The branch was cut from `origin/lane/console-shell` at `2c7c576`, with `--no-track`. The feature is one commit on top of it — the commit that adds this file.

### Four owner decisions, taken before any code

Preflight passed, and the session then stopped under `BUILD_PLAN.md` §2.1's ambiguity trigger. The route table had no URL for the index, no document named it, nothing said whether Recruiter mode links to it, and no search contract existed. Four questions were put to the owner and answered in the session:

| # | Question | Owner's answer |
|---|---|---|
| 1 | What is the index called, and what is its URL? | **"All Software" at `/all`** |
| 2 | Does the home page link to it in Recruiter mode too? | **Explorer mode only** |
| 3 | How does search run? | **`?q=` on the server** — a GET form, no client code |
| 4 | Which fields does search match? | **Title, subtitle and summary** |

Eight readings were stated alongside the questions and not objected to:

- **Order:** one flat list in tile order, across all kinds.
- **Matching:** case-insensitive, every word must appear, nothing ranked. No fuzzy matching, highlighting or persistence.
- **Where search lives:** on the index only, not on `/<section>`.
- **Explorer presentation:** keyed on `data-mode="explorer"`. The link to the index is the circular button Phase 0's specimen drew, and the tile row stays six.
- **Recruiter rendering:** `/` with no mode or with JavaScript off is otherwise unchanged from S7.
- **Zoom:** the hovered or focused tile grows and its neighbours dim, on the existing tokens. No scale at all under reduced motion.
- **Smooth scrolling:** the page glides a focused tile into view in Explorer mode, and jumps under reduced motion. The tile row is not a horizontal scroller.
- **SEO:** the index is in the sitemap with its own canonical. A search canonicalises to the bare index.

### All Software contract

- **URL:** `/all`. A static route with its own page file, beside `/[section]`.
- **Contents:** every entry of every kind, each once. 19 entries on the hosted data today.
- **Order:** tile order — `compareRecency`: featured, then owner weight, then most recent start, then title. It is the same merge `/hobbies` uses for its two kinds.
- **Each row shows:** the title (a link to the entry's canonical URL), the subtitle, the dates, the section it belongs to, the status when it is not `unlocked`, and the summary.
- **Selecting a row** opens the entry's canonical URL, `/<section>/<slug>`. No row has a state-only destination.
- **Multi-placement:** each record appears once. The Break Through Tech experience, its project and its certification are three rows with three URLs.
- **Rendering:** `ƒ`, per request, because it reads `?q=`. The database reads are the per-kind lists the sitemap already reads, held by the fetch cache for an hour.
- **Images:** none. Each tile shows its section's own drawing; `entries.icon_asset` is not rendered.
- **Canonical and sitemap:** canonical is `/all`. It is in `/sitemap.xml`, which now lists 28 URLs.

### Search contract

- **Form:** `<form role="search" method="get" action="/all">`, one labelled field named `q`, one submit button. A "Show all" link appears while a search is active.
- **Fields read:** `title`, `subtitle`, `summary`. Not the body, slug, kind, section name, facet or tags.
- **Matching:** case-insensitive. The search is split on whitespace and every word must appear somewhere in those three fields. A word may match part of a word.
- **Order:** unchanged. A match keeps the place it has in the full index.
- **Empty or blank `q`:** the whole index.
- **Invalid `q`:** a repeated parameter, or more than 100 characters, is a 404. The field carries `maxlength="100"`, so a form cannot send either.
- **No results:** "Nothing matches “…”." and no list.
- **Where it runs:** in `loadAll`, over lists already fetched. A visitor's text never reaches a PostgREST filter, and a search adds no database read.
- **How it is rendered:** as a React text child and an input's value only, so it arrives escaped.
- **Not built:** ranking, fuzzy matching, highlighting, query persistence, analytics, an external index, a search dependency.

### Mode behaviour

| State | Home page | `/all` |
|---|---|---|
| No `data-mode` (deep link, JavaScript off, never chose) | As S7: six tiles, Resume. No link to the index | Plain list, one tab stop per entry |
| `data-mode="recruiter"` | Same as no mode | Same as no mode |
| `data-mode="explorer"` | Tiles on square faces, zoom, the All Software button | Grid of cards, arrow keys, zoom |
| Any other value | Same as no mode | Same as no mode |

- `data-mode` is the only mode state. Stylesheets read it as `html[data-mode="explorer"]`; script reads it through `isExplorer` in `boot.ts`, which `tile-row.tsx` alone calls.
- No cookie, no `localStorage`, no URL parameter, no redirect, no React state for mode.
- The link to the index is always in the home page's HTML and is `display: none` until the mode is Explorer.

### Tile-row behaviour

- **Unchanged in every mode:** six `<a href>` tiles in `SECTIONS` order, roving `tabindex` applied after hydration, Left/Right/Up/Down step and wrap, Home and End, native Enter, Tab leaves the row.
- **Explorer mode only — the icon-display grammar:** the drawing sits on a 112 px square face and the label stands under it, as Phase 0's specimen draws it. The tiles stand side by side, centred, and wrap when they do not fit.
- **Explorer mode only — the All Software button:** a 44 px circle carrying the `all-software` glyph, with its label beside it, below the Resume link. It is not a tile and the arrows do not reach it; Tab does.

### Motion behaviour

- **Zoom:** the hovered or focused tile scales to `--scale-zoom` (1.06). The other tiles scale to `--scale-recede` (0.97) and their labels take `--color-text-muted`.
- **Timing:** `--duration-fast` (180 ms) on `--ease-glide`. Both are existing tokens.
- **State is never zoom alone:** the active face fills saffron inside the accent outline and the focus ring is drawn.
- **Smooth scrolling:** `scroll-behavior: smooth` on `<html>` in Explorer mode. It applies when the arrows bring an index card into view and when a fragment link is followed.
- **Route changes are instant.** `<html>` carries `data-scroll-behavior="smooth"`, the attribute Next 16 reads for that.
- **Two new tokens:** `--scale-zoom` and `--scale-recede`, in `tokens.css`.
- **No motion library.** CSS transitions and one `scrollIntoView` call.

### Reduced-motion behaviour

- The zoom rules sit inside `@media (prefers-reduced-motion: no-preference)`. Under reduced motion no tile scales.
- The reason for a query: `build.mjs` admits only `--duration-*` to the reduced-motion block, and a scale with a zero duration is still a tile changing size.
- The smooth-scrolling rule sits inside the same query. Under reduced motion every scroll is instant.
- Navigation and state are unaffected: the fill, the dimming and the focus ring still apply, with a 0 ms transition.

### Accessibility

- **Links:** every tile and every index row is a real `<a href>` to a route-table URL.
- **Index row structure:** the link is the title inside an `<h2>`, so its name is the entry's title. In Explorer mode its `::after` covers the card, which makes the whole card the target.
- **Focus ring:** always drawn. On an index card it is drawn around the card, 3 px solid, outside the border.
- **Keyboard on the grid, Explorer mode:** one tab stop into the grid. Left/Right step in reading order and wrap. Up/Down move a whole row. At the top and bottom rows Up/Down are left to the browser, so the page scrolls.
- **Keyboard on the list, Recruiter mode:** every entry is its own tab stop and no key is intercepted.
- **Search:** the field has a visible `<label>`. Escape in the field clears it and does not trigger Back.
- **Touch targets:** tile 152 × 161 px, All Software button 134 × 44 px, search field and button 44 px high, index title link 44 px or more.
- **No hover-only information:** the summary is always on the row.
- **No trap:** Tab leaves the row and the grid.

### JS-off behaviour

- `/`: no dialog, no link to the index, six tiles as six ordinary tab stops, zero `tabindex` attributes.
- `/all`: the plain list, 19 entry links, no mode.
- Search works: typing in the field and pressing Enter loads `/all?q=fordham` with "11 of 19 entries match".

### What changed, file by file

| File | Change |
|---|---|
| `app/all/page.tsx` | New. The route: parses `?q=`, loads the index, sets the canonical |
| `app/(explorer)/all-software.tsx` | New. Server components: the index with its search form, and the link to it |
| `app/(explorer)/all-software.test.tsx` | New tests |
| `app/(explorer)/tile-row.tsx` | A `grid` variant: Explorer-only keys, row-wise Up/Down, card scrolled into view |
| `app/(explorer)/keys.ts` | `nextIndex` takes a column count |
| `app/(explorer)/boot.ts` | `isExplorer`; one header sentence corrected |
| `app/(explorer)/tiles.ts` | `ALL_ICON` |
| `app/(explorer)/explorer.module.css` | The search form, the All Software button, and every Explorer-mode rule |
| `app/(explorer)/keys.test.ts`, `boot.test.ts`, `tiles.test.ts` | Extended |
| `app/page.tsx` | Renders `<AllSoftwareLink />` in the sections nav |
| `app/layout.tsx` | `data-scroll-behavior="smooth"` on `<html>` |
| `app/app.css` | The smooth-scrolling rule |
| `app/entry-dates.tsx` | Import path spelled relatively. No behaviour change |
| `lib/routes/table.ts` | `ALL_HREF`, `ALL_LABEL`, `SEARCH_PARAM`, `SEARCH_MAX_LENGTH`, `parseSearchParam` |
| `lib/routes/load.ts` | `loadAll`; `/all` added to `loadSitemap` |
| `lib/routes/table.test.ts`, `load.test.ts` | Extended |
| `design/tokens/tokens.css` | Two static tokens |
| `design/tokens/tokens.json` | Regenerated |
| `next.config.ts` | `/all` added to `outputFileTracingIncludes` |
| `CLAUDE.md` | Repo state, existing statements updated where this row changed them, a new conventions block |
| `handoff/feat-shell-tile-grid.md` | New — this file |

24 files. No dependency, no icon, no asset, no migration, no query-layer change, no `lighthouserc.json` or workflow change. `package.json` and `package-lock.json` are untouched.

### Verification: local gates, on the final tree

- `npm run lint`: 0 problems.
- `npm run typecheck`: clean.
- `npm test`: **311 passed, 28 files** (257 and 27 before this branch).
- `npm run tokens:check`: ok — 60 static and 19 themed tokens, 68 of 68 contrast measurements pass, 29 icons and 2 mark files.
- `npm run build`: ok. `/` ○, `/_not-found` ○, `/[section]` ƒ, `/[section]/[slug]` ●, **`/all` ƒ**, `/resume` ○ with a 1 h revalidate.
- `npm run db:test` was not run. Nothing it covers changed; CI runs it.
- The built client bundle contains no icon path data, no "All Software" string, and no `marked`, `ContentValidationError` or Supabase code.

### Verification: a real browser

Headless Chrome driven by `puppeteer-core` from the `@lhci/cli` dev tree, against `next start` on the production build with hosted data. The drivers stayed outside the repo. A fresh browser context was used as a fresh session.

| # | Check | Result |
|---|---|---|
| 1 | No mode, `/all` by deep link | 200. List, no icons, no `tabindex`. Tab order: skip link, site name, Resume, search field, Search, then each entry. ArrowDown is not intercepted. No transform on hover |
| 2 | Recruiter chosen | `/`: the All Software link is `display: none`, the row is S7's grid, hover does not scale. `/all`: same as no mode |
| 3 | Explorer chosen, `/` | The link shows. Faces 112 × 112 px. Tab order ends tile row, Resume, All Software |
| 4 | Hover zoom, sampled every 30 ms | 1 → 1.043 → 1.056 → 1.059 → 1.06. Neighbours 0.97, labels `rgb(90, 87, 75)`. Returns to no transform when the pointer leaves |
| 5 | Focus zoom, sampled the same way | 1 → 1.028 → 1.051 → 1.058 → 1.06. `:focus-visible` true, outline solid 3 px, face saffron |
| 6 | Explorer, `/all` | Grid of 4 columns at 1280 px. Roving `tabindex` `0,-1,…`. Card ring solid 3 px on the `::after`; the link's own outline is none |
| 7 | Grid keys | Right → 1, Down → 5, Left → 4, Up → 0, Up again left to the browser, End → 18, Down left to the browser, Home → 0 |
| 8 | Smooth scrolling | Three ArrowDown presses moved the page from 0 to 1,017 px through 37 distinct positions. The focused card ended fully inside the viewport |
| 9 | Route change from a scrolled page | Enter at 1,381 px opened the entry at 0 px. No intermediate position was seen on the new page |
| 10 | Fragment link in Explorer mode | The skip link moved the page from 1,465 to 61 px through 38 positions |
| 11 | Tab out of the grid and back | Tab leaves it. Tabbing back in lands on the tile the arrows left |
| 12 | Search with matches | "Machine  LEARNING" + Enter → `/all?q=Machine++LEARNING`, "2 of 19 entries match", two rows, the field keeps the text, mode still Explorer, canonical `/all` |
| 13 | Search with no matches | "Nothing matches “zzzz”." No list. "Show all" is 44 px high and returns all 19 rows |
| 14 | Escape | In the search field: clears it, stays on `/all`. Outside it: goes to `/` |
| 15 | Deep link later in an Explorer session | `/experience/break-through-tech` carries `data-mode="explorer"` and renders as before |
| 16 | Reduced motion, Explorer | Hover and focus transforms are `none` at every sample. Transition duration 0 s. Face still fills, ring still drawn. `scroll-behavior` is `auto`; three ArrowDown presses gave 4 positions, one per jump |
| 17 | JavaScript disabled | See JS-off behaviour above |
| 18 | 360 × 740, both modes | No horizontal overflow at rest or with a zoomed tile or card. Explorer grid is one column and ArrowDown steps to the next card |
| 19 | A mode that is not one | `kj.mode` = "Explorer" in storage: no attribute, recruiter rendering. `data-mode="console"` set by hand: recruiter rendering on both pages, arrows not intercepted |
| 20 | Both themes | Screenshots of `/` and `/all` in both modes, light and dark, at rest, hovered and focused |
| 21 | Status codes | `/all` 200, `/all?q=machine` 200, a 100-character `q` 200, a 101-character `q` 404, `?q=a&q=b` 404 |
| 22 | Console | No error or warning in any scenario |

**Only Chrome was driven.** Safari and Firefox were not tested.

The driver chooses a profile with a scripted click. After that, the first Tab lands on the document and the second on the skip link. That is the profile dialog's behaviour, which this branch does not change, and it was not examined further.

### Verification: Lighthouse and the script budget

`npx lhci autorun` with `lighthouserc.json` unchanged, three runs on each of the five audited URLs. The baseline is the lane head's own reports from this machine, written by the previous session on the identical tree. Medians.

| URL | Script, before → after | Stylesheet | Document | Performance | Accessibility |
|---|---|---|---|---|---|
| `/` | 144,286 → 144,717 B (+431) | +795 B | +156 B | 0.98 → 0.98 | 1.00 |
| `/experience` | 145,398 → 145,898 B (+500) | +795 B | +33 B | 0.98 → 0.98 | 1.00 |
| `/experience/break-through-tech` | 145,398 → 145,898 B (+500) | +795 B | +6 B | 0.98 → 0.98 | 1.00 |
| `/certifications` | 145,398 → 145,898 B (+500) | +795 B | +34 B | 0.98 → 0.98 | 1.00 |
| `/resume` | 144,286 → 144,717 B (+431) | +795 B | +23 B | 0.98 → 0.98 | 1.00 |

- **Script budget:** the largest audited page is 145,898 B against the 250,000 B cap, leaving 104,102 B.
- Every error-level assertion passed. The five warn-level LCP notices are the same five as before; LCP medians are 2,329–2,469 ms.
- **`/all` is not in `lighthouserc.json`, so CI does not audit it.** It was audited once here through Lighthouse's Node API, with the same defaults:

| URL | Mode | Performance | Accessibility | Best practices | SEO | Script |
|---|---|---|---|---|---|---|
| `/all` | none | 0.98 | 1.00 | 1.00 | 1.00 | 147,016 B |
| `/all?q=machine` | none | 0.98 | 1.00 | 1.00 | 1.00 | 147,016 B |
| `/all` | Explorer | — | 1.00 | 1.00 | 1.00 | — |
| `/all?q=machine` | Explorer | — | 1.00 | 1.00 | 1.00 | — |
| `/` | Explorer | — | 1.00 | 1.00 | 1.00 | — |

- `/all` is the largest page on the site at 147,016 B, 102,984 B under the cap. It loads both the tile-row island and the Back binding.
- The Explorer rows ran with a warm cache, because the mode has to be set in the same tab first. Their sizes and performance scores are not comparable and are left out. Their accessibility audits had zero failures, including target size and colour contrast.
- These are local figures. Do not compute a delta against CI's.
- **No LCP remediation was performed.** No font preload, stylesheet, throttling setting or `lighthouserc.json` line was changed.

### Prohibited-term, secret and contact sweep

Over every added line of the staged diff, with `PROHIBITED_TERMS` read out of `design/tokens/build.mjs` rather than retyped: both regexes **0**; brief §2.1's other names **0**; JWT shapes, key prefixes, credential assignments, the eight values in the git-ignored env files, contact literals and reference URLs **0**. The 40-hex probe matches twice, on the public commit ids of `main` and the lane quoted under Starting state. Every probe fired on a canary in the same run. No binary and no third-party asset was added.

"All Software" is the visible name of the index by the owner's decision 1. It is also the label the referenced console gives the same element, which is why the question was put to the owner under brief §2.1 rather than settled in the diff.

## Deviated from plan

- **The row was built to four owner decisions and eight stated readings the plan does not contain.** They are tabulated above and nowhere else in the repo.
- **The shared route table gained a URL and a query parameter.** `lib/routes/table.ts` is the S5 contract both renderers bind to. `/all` and `?q=` are the owner's decisions 1 and 3.
- **`app/layout.tsx` and `app/app.css` were edited.** Both serve every route. Smooth scrolling is a property of the document, and a CSS module cannot style `<html>`.
- **`app/entry-dates.tsx` was edited**, import path only. It is a shared recruiter file. The tested index component renders it, and Vitest resolves no `@/` alias.
- **`design/tokens/tokens.css` gained two tokens.** A scale factor is a design value, and the stylesheets may not hold one.
- **Zoom is gated by a media query, not by the tokens.** `DESIGN.md` says reduced motion disables zoom "by construction", through the duration tokens. That holds for the transition and not for the scale. `DESIGN.md` was not edited.
- **Smooth scrolling has no token.** `scroll-behavior` takes no duration; the browser owns the curve.
- **"Neighbours dim" is a colour token plus a small scale-down, not an opacity.** An opacity would be an unaudited contrast pair.
- **The tile row wraps in Explorer mode; it does not scroll sideways.** Six tiles fit a desktop screen, and S7's rule against a clipping ancestor still holds.
- **The index is in the sitemap although Recruiter mode never links to it.** A stated reading.
- **Statements in `CLAUDE.md` were updated where this row made them false or incomplete**, rather than left standing. The main one is "nothing reads that attribute yet".
- **The motion was composed from `DESIGN.md`'s one-sentence descriptions.** The reference videos cannot be watched in this harness and were not.
- **The Lighthouse baseline was read, not re-measured.** The lane head's reports from the previous session were used, on the strength of the identical tree. This session added 15 reports to `.lighthouseci/reports/`.
- **No subagents were used** (`PROMPTS.md` → Tooling posture). The second-gaze checkpoint in that section is a manual loop of the owner's and was not run.

## Deferred

- **Auditing `/all` in CI.** It needs a line in `lighthouserc.json`, which this session was told not to touch.
- **Tags and facets on the index, and search over tags** → `feat/shell-facets`. Search over the body is a contract change for the owner.
- **Section and entry pages in Explorer mode.** They still render as the recruiter pages → `feat/shell-facets`, `feat/shell-detail-panel`.
- **The click → detail transition** → `feat/shell-detail-panel`, per the plan's motion mapping.
- **Storage-backed tile art** → `feat/shell-album-news`.
- **Gamepad on the row and the grid** → `feat/shell-gamepad`.
- **The mobile shell** → `feat/shell-mobile`. At 360 px the Explorer row is a centred vertical stack and the grid is one column; neither has swipe or a D-pad hint.
- **The rest of the utility rail, and the status bar.** The All Software button is the first rail-shaped element. No plan row names the rail or the bar.
- **`/privacy`** should say that a search is part of the URL, so it reaches the host's request logs like any other path. The site stores nothing about it.
- **The bracketed keys in `next.config.ts` match nothing.** `/all` traces all 29 icon files; `/[section]` and `/[section]/[slug]` trace 13, exactly the files `tiles.ts` reads by literal path. Those two routes are protected by the literal reads alone. Not changed here.
- **Safari, Firefox, a real device and a screen reader** → Phase 3's manual passes.
- **`PROMPTS.md` has no session block for this sub-branch.** The prompt was pasted, not committed.
- Unchanged from `handoff/feat-shell-boot-profile.md` and earlier handoffs, and not restated here: the chime, a way to change mode after choosing, a nonce for the inline scripts, the open ingestion items in `BUILD_PLAN.md` §8, the Dependabot PRs.

## Open questions for owner

1. **Does the motion feel right?** In one sentence: the tile under the pointer or the focus grows by 6 % over 180 ms while the others shrink by 3 % and grey out, and the page glides to keep a focused card in view. Feel is the acceptance criterion and only `npm run dev` shows it.
2. **Should CI audit `/all`?** It is now the largest page, and nothing in CI measures it.
3. **Should `/all` stay in the sitemap?** Recruiter mode does not link to it, so a search engine is the only way a recruiter-mode visitor would find it.
4. **Is the flat order right?** With no featured or weighted entry today, the index runs newest start date first, so a project can sit above the experience it belongs to.
5. **Which row owns the bottom utility rail and the top status bar?** Brief §2.1 lists both as borrowed grammar, Phase 0's specimen draws both, and no `lane/console-shell` row names either.
6. **`.git/config` on this machine still sets `commit.template` to the literal `commit.gpgsign`.** It was not changed; this branch committed with `-F`.

## Next

**`feat/shell-facets`** on `lane/console-shell` (`BUILD_PLAN.md` §5). It reads `entries.facet` and `tags`, does not wait on ingestion, and runs in order. It inherits the conventions this row set: `data-mode` as the only mode state, zoom inside a `no-preference` query, dimming by colour token, and the stretched-link card.

Start by pulling `origin/lane/console-shell` and branching from it, never from this branch.

Not started. No other sub-branch, lane or fix was begun in this session.
