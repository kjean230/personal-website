# Handoff — feat/shell-facets

**Merged into:** `lane/console-shell` — PR opened with auto-merge enabled. The merge record is the close-out's to add.
**Plan row:** `BUILD_PLAN.md` §5, `lane/console-shell`, third row — `feat/shell-facets`, which reads `entries.facet` and `tags` and does not wait on ingestion. Brief §5: "Groups — Tag and facet browsing". Brief §4.2: filter chips "pill-shaped, with live counts, one active at a time, arrow-key traversable".

## Shipped

### The answer, first

- **Groups is on `/all`.** A row of facet chips, counted across every kind, and one row of tag chips per category. Choosing one narrows the index through a real URL: `/all?facet=<facet>` or `/all?tag=<slug>`.
- **One thing narrows the index at a time:** a search, a facet or a tag. A URL carrying two is a 404.
- **Facet chips are now arrow-key traversable in Explorer mode**, on section pages and on `/all`, and show the glyphs Phase 0 drew for them. That closes the part of brief §4.2 that was not built.
- **Recruiter mode is unchanged on section pages.** Their chips were measured pixel-identical to production.
- **Production shows no tag chips yet.** The hosted database holds no tags. The tag paths were built and verified against the local fixture, and will appear on the live site when content adds tags.
- No dependency, migration, seed change, new icon, motion or LCP remediation.

### Starting state, verified before any branch existed (Gate A)

- `origin/main` = `3c281104d8112b2d196a012ab3bce5d5ccaa8693`.
- `origin/lane/console-shell` = `446e57601373cd12f5b39d068df4338858067dec`, the squash of PR #54, merged 2026-10-03 20:11:07 UTC. Its tree is identical to the chore commit `e3249e3`.
- PR #54's CI run `37150344025`: all eight jobs green, Lighthouse budget included. The push run on the lane head, `37150627777`, is green. Vercel status success.
- No `feat/shell-facets` branch or PR anywhere, and no later `feat/shell-*` branch.
- Working tree clean. `.git/info/exclude` empty.
- The branch was cut from `origin/lane/console-shell` at `446e576`, with `--no-track`, only after Gate C.

### What the repository settled, so it was not asked

- **Facet URLs on sections:** `/<section>?facet=<facet>`; invalid or repeated → 404; canonical is the bare section; never in the sitemap (`lib/routes/table.ts`, `CLAUDE.md`).
- **Facet chips:** `All (n)` plus the non-zero facets in `FACETS` order, counts from the query, pill-shaped, one active at a time (brief §4.2; `handoff/feat-spine-routes.md`).
- **Mode and `/all`:** `data-mode="explorer"` is the only Explorer selector; the `/all` and search contract is fixed (`BUILD_PLAN.md` §5).
- **No schema change is needed:** `tags` and `entry_tags` exist, the anonymous role may read both, and both are indexed. Tag slugs are unique and slug-shaped by a CHECK constraint.

### Two facts that shaped the decisions

- **The hosted database has 0 tags and 0 tag links.** Read with the site's own anonymous requests, counts only. The fixture seed has four tags, one per category; its team tag is attached to nothing.
- **Docker Desktop was installed and not running**, and the fixture is the only data with tags.

### Gate B — twelve decisions, each asked and answered in the session

Three rounds of four questions. Every answer below is the option the owner chose, with the description it was offered under, lightly condensed.

| # | Question | Owner's answer |
|---|---|---|
| 1 | The live site has no tags yet. Should this row build tag browsing now? | **Build now, fixture-verified.** Facet and tag browsing ship together. Tag chips stay invisible in production until content adds tags. The tag paths are verified in a real browser against the local fixture database, which means starting Docker Desktop on this machine |
| 2 | Where does Groups, the tag and facet browsing, live? | **On `/all`.** A region of the All Software page: a row of facet chips counted across every kind, then tag chips. Choosing one narrows the index. Section pages keep the facet chips they already have. No new page and no new entry point |
| 3 | Should the new group chips be visible in Recruiter mode and with JavaScript off? | **Shared markup.** The chips are plain links in the server's HTML, as section facet chips already are; Explorer mode adds keys and styling on top. Recruiter section pages keep exactly the chips they have today |
| 4 | Brief §4.2 says facet chips are arrow-key traversable, and today they are Tab-only links. How should chips take keys? | **Arrows in Explorer.** In Explorer mode each row of chips is one tab stop: arrows step and wrap, Home and End jump, Enter follows the link, Tab moves to the next row. It reuses the home row's island and key rule. Recruiter and JS-off keep every chip as its own tab stop |
| 5 | What URL represents a selected group on `/all`? | **Query parameters.** `/all?facet=<facet>` and `/all?tag=<slug>`. Both canonicalise to `/all` and neither is in the sitemap. A value that is not a facet, a slug no tag has, or a repeated parameter is a 404. A tag that exists but has no entries shows the empty state |
| 6 | Can a search, a facet and a tag be active on `/all` at the same time? | **One at a time.** `/all` takes exactly one of a search, a facet or a tag. Choosing a group drops a search and any other group; searching drops the group. One tag at most. A URL carrying two of them is a 404 |
| 7 | Should a search on `/all` also match tag names? | **No, unchanged.** `?q=` keeps reading title, subtitle and summary only. A tag is found through its chip |
| 8 | How are tag chips arranged and counted? | **Like facets and entry pages.** Grouped by category under the entry page's existing headings, Skills, Tools, Domains, Teams, in that order, A to Z by label inside each. Every chip reads `Label (n)`. A tag with no entries, and a category with no tags, is not shown |
| 9 | Team tags exist for followed-team cards (brief §4.3). How should Groups treat them? | **A category like the others.** Teams is the fourth category, and a team tag with entries narrows the index like any tag. A team tag attached to no entry is not shown. Followed-team cards on the Hobbies page stay separate, later work |
| 10 | What is the region called? | **Groups.** It names the landmark for screen readers |
| 11 | How should the chips look in Explorer mode? | **Pills with facet glyphs.** Each facet chip shows the glyph Phase 0 drew for it, on section pages and on `/all`. Tag chips have none. Recruiter chips stay text only. No visible title |
| 12 | Entry pages already list an entry's tags as plain pills. Should those pills link to the tag's group? | **No, leave them.** Entry pages are untouched by this row |

### Gate C — the plan, and two corrections the owner made when approving it

The implementation plan was written in plan mode and put to the owner. The owner approved it with two accessibility corrections, which were written into the plan before the plan prompt was accepted. The approved plan is what was built.

| # | Correction | Owner's wording |
|---|---|---|
| 13 | Roving tab stop | "In Explorer mode, a chip row should initialize its single tabbable item as: the chip with `aria-current="page"` when that row has an active chip; otherwise the first chip. Do not always force the first chip to be the initial tab stop." Examples given: `/all?facet=research` → Research; `/all?tag=python` → Python in its tag row; `/all?q=machine` → each row falls back to its first chip; bare `/all` → All. "Arrow/Home/End behavior remains exactly as planned." |
| 14 | Row names | "Keep: `<nav aria-label="Groups">`. Also ensure each chip list has a programmatic row name: facet row → "Facets"; tag rows → Skills, Tools, Domains, Teams. Use `aria-label`, `aria-labelledby`, or equivalent semantic association with the visible category heading. Do not add a visible "Groups" title." |

The owner's approval also restated the limits: no manual merge, no force push, no lane → `main` merge, no later shell row, no LCP remediation, no schema migration, no Storage-backed images, no entry-page changes, no combined filters, no search over tags.

### URL and filter contract

| URL | Result |
|---|---|
| `/all` | The whole index, unchanged |
| `/all?q=<words>` | Search, exactly as before |
| `/all?facet=<facet>` | Every entry of any kind with that facet |
| `/all?tag=<slug>` | Every entry carrying that tag |
| `/<section>?facet=<facet>` | Unchanged in every respect |

- **One at a time.** At most one of `q`, `facet`, `tag`. A blank value counts as absent, as `?q=` and `?facet=` already treated blanks.
- **404:** two of them present · a repeated parameter · a `facet` outside `FACETS` · a `tag` that is not slug-shaped · a slug-shaped `tag` no tag has · a `q` over 100 characters.
- **200 with the empty state:** a tag that exists but has no entries; a valid facet no entry has.
- **Canonical:** `/all` on every 200; none on a 404. **Sitemap:** unchanged at 28 URLs, none with a query string.

### Groups on `/all`

- `<nav aria-label="Groups">` between the search form and the status line. No visible title.
- **Facet row:** `All (n)`, then each facet with at least one entry, in `FACETS` order, counted across every kind. On hosted data: All (19), Corporate (1), Research (5), Volunteer (1), Classroom (3), Coursework (2).
- **Tag rows:** one per category that has a chip, in the order Skills, Tools, Domains, Teams, each under its visible label. Chips A to Z by label whatever its case, each `Label (n)`.
- **Current chip:** `aria-current="page"`. `All` is current only on the bare `/all`; under a search no chip is current.
- **Status line:** unchanged for the bare index and a search. With a group: "5 of 19 entries". An empty group: "Nothing here yet.", the string section pages use.
- **Search form:** unchanged. It sends only `q`, so a search drops the group. Chip links never carry `q`.

### Recruiter behaviour

- **Section pages:** the same chips, the same hrefs, the same text, each its own tab stop. The chip boxes on `/experience` are equal to production's to the pixel. The markup gained two things that do nothing here: a `data-tile` attribute on each chip, and a hidden decorative glyph.
- **`/all`:** the Groups chips are visible as plain links. Recruiter pages still do not link to `/all`.
- **No arrow key is intercepted** and no `tabindex` is written.

### Explorer behaviour

- **Keys:** each chip row is one tab stop. Left/Right and Up/Down step and wrap, Home and End jump, Enter is the link's own, Tab moves to the next row and then the grid.
- **Tab stop:** the row's current chip when it has one, otherwise its first (correction 13). It is re-derived when the row's current chip changes, so it also holds after a soft navigation and after Back; while the current chip is unchanged, the tab stop stays wherever the arrows left it.
- **Glyphs:** each facet chip shows its Phase 0 glyph at 16 px, ahead of the label. Tag chips have none.
- **No new motion.** No transition, transform, animation or token was added.

### Accessibility

- **Landmark and lists** (correction 14), read from Chrome's accessibility tree: navigation "Groups"; list "Facets"; lists named by their visible category label. On a section page: navigation "Facets" with its one list, as before.
- **Links:** every chip is an `<a href>` to a route-table URL; its name is its text, `Label (n)`. The glyph is `aria-hidden`.
- **Focus:** the global 3 px ring on every chip. Nothing traps: Tab leaves each row.
- **Touch targets:** every chip is 44 px high, at 1280 px and at 360 px.
- **No hover-only information.**

### JS-off behaviour

- Section pages and `/all` render the chips as ordinary links with no `tabindex` and no visible glyph.
- Following a chip loads the narrowed URL: `/experience?facet=research` (4 rows), `/all?facet=research` ("5 of 19 entries"), and on the fixture build `/all?tag=fixture-skill` ("2 of 26 entries").

### Data and query-layer changes

- **`lib/content/queries.ts` — `listTagGroups()`:** every tag with the ids of its entries. Two flat reads, `tags` and `entry_tags`, each with an exact count through the existing truncation guard, every row validated. No embed and no aggregate.
- **`lib/content/schema.ts`:** `entryTagSchema` for the junction; `slugSchema` exported for the URL boundary.
- **`lib/routes/table.ts`:** `TAG_PARAM`, `parseTagParam`, `AllFilter`, `parseAllParams`, `allHref`.
- **`lib/routes/load.ts`:** `RouteQueries` gains `listTagGroups`; `loadAll(filter)` returns `found` or `not-found` and the page carries `facets` and `tags`.
- **Narrowing and counting stay in code**, over lists the fetch cache already holds. `/all` makes two more cached reads per hour. Nothing from a URL reaches a PostgREST filter.
- **No migration, no seed change, no regenerated types.**

### What changed, file by file

| File | Change |
|---|---|
| `app/(explorer)/groups.tsx` | New. `FacetChips`, `Groups`, the shared chip row, the four category labels |
| `app/(explorer)/groups.test.tsx` | New tests |
| `app/(explorer)/tile-row.tsx` | An `explorerOnly` option for chip rows; the tab-stop rule; an accessible name for the list |
| `app/(explorer)/keys.ts` | `tabStop` |
| `app/(explorer)/tiles.ts` | `FACET_ICONS` |
| `app/(explorer)/all-software.tsx` | Renders Groups; the status line for a group; a `key` on the grid |
| `app/(explorer)/explorer.module.css` | The chip glyph, hidden unless Explorer |
| `app/all/page.tsx` | Parses the three parameters; one cached lookup; 404 for an unknown tag |
| `app/[section]/page.tsx` | Chips rendered through `FacetChips` |
| `lib/content/schema.ts`, `lib/content/queries.ts`, `lib/routes/table.ts`, `lib/routes/load.ts` | As above |
| `app/(explorer)/all-software.test.tsx`, `keys.test.ts`, `tiles.test.ts`, `lib/content/schema.test.ts`, `lib/routes/table.test.ts`, `lib/routes/load.test.ts` | Extended |
| `supabase/tests/api.test.ts`, `supabase/tests/routes.test.ts` | Extended |
| `CLAUDE.md` | Five statements this row changed, and a conventions block |
| `handoff/feat-shell-facets.md` | New — this file |

23 files. Not touched: `app/[section]/[slug]/page.tsx`, `app/page.tsx`, `app/layout.tsx`, `app/site.module.css`, `BUILD_PLAN.md`, `lighthouserc.json`, `next.config.ts`, `design/`, `package.json`, `package-lock.json`, migrations, seeds, workflows.

### Verification: local gates, on the final tree

- `npm run lint`: 0 problems.
- `npm run typecheck`: clean.
- `npm test`: **366 passed, 29 files** (311 and 28 before this branch).
- `npm run tokens:check`: ok — 60 static and 19 themed tokens, 68 of 68 contrast measurements pass, 29 icons and 2 mark files. No token changed.
- `npm run build`: ok. `/` ○, `/_not-found` ○, `/[section]` ƒ, `/[section]/[slug]` ●, `/all` ƒ, `/resume` ○ with a 1 h revalidate. No route changed mode.
- `npm run db:test`: **71 passed, 4 files** (64 before), against the local compose database after `db:up` and `db:apply`.
- The built client bundle contains no icon path data, no category label, and no `marked`, `ContentValidationError` or Supabase code.
- The six facet glyphs are traced for every per-request route: `/[section]` and `/[section]/[slug]` trace 19 icon files, `/all` all 29.

### Verification: a real browser, tags (fixture build)

Headless Chrome driven by `puppeteer-core`, against `next start` on a production build that read the local compose database through a proxy kept outside the repo. The local database holds 26 entries (19 real, 7 fixture) and 4 tags.

| # | Check | Result |
|---|---|---|
| 1 | Status codes | `/all` 200 · `?tag=fixture-skill` 200 · `?tag=fixture-team` 200 · `?tag=no-such-tag` 404 · `?tag=Not%20A%20Slug` 404 · `?facet=research&tag=fixture-skill` 404 · `?q=fixture&tag=fixture-skill` 404 · a repeated `tag` 404 |
| 2 | No mode, `/all` | Navigation "Groups"; lists Facets, Skills, Tools, Domains. No Teams row: the fixture's team tag has no entries. No visible "Groups" text. No `tabindex`; every chip is its own tab stop |
| 3 | Counts | Fixture skill (2), Fixture tool (1), Fixture domain (1); each chip leads to that many rows |
| 4 | Explorer, `/all` | Tab order: search field, Search, facet row, Skills, Tools, Domains, first card — one stop per row. Glyphs on the six facet chips, none on tag chips |
| 5 | Facet row keys | Right, Right, Left, End, Right (wraps to All), Home, Down, Up all land where the row rule says; Tab moves to the Skills row; ring solid 3 px |
| 6 | A selected tag, by deep link | `/all?tag=fixture-skill`: "2 of 26 entries", the two fixture projects, canonical `/all`. The Skills row's tab stop is the current chip; the facet row falls back to All |
| 7 | A tag followed by keyboard | Enter on Fixture tool → `/all?tag=fixture-tool`, "1 of 26 entries", that chip current, focus kept on it |
| 8 | A tag with no entries | `/all?tag=fixture-team`: "Nothing here yet.", no list, no chip current |
| 9 | An unknown slug | 404, no canonical |
| 10 | JavaScript off | The tag chip is a link; following it narrows the index |
| 11 | 360 × 740, both modes | No horizontal overflow; chips 44 px high |
| 12 | Console | No error or warning, other than the browser's own message for the deliberate 404 |

Two things the fixture cannot show, which unit tests cover instead: a Teams row, because the fixture's only team tag has no entries; and the tab-stop rule on a tag row with several chips, because each fixture category has one tag. The rule itself was exercised in the browser on the facet row, below.

### Verification: a real browser, everything else (hosted build)

The final build against hosted data: 19 entries, no tags.

| # | Check | Result |
|---|---|---|
| 1 | Status codes | `/`, `/all`, `/all?facet=research`, `/all?q=machine`, `/all?facet=` and `/all?q=&facet=research` 200 · `/all?tag=python`, `/all?facet=bogus`, `/all?facet=research&q=machine`, a repeated `facet` 404 · section pages as before, `/experience?facet=bogus` 404 |
| 2 | No mode, `/experience` | Chip boxes equal production's to the pixel. Navigation "Facets" with one unnamed list. Every chip its own tab stop; ArrowRight not intercepted; glyphs not displayed |
| 3 | Recruiter chosen | The same. `/experience?facet=research` shows 4 rows and tabs chip by chip |
| 4 | Explorer, section page | One tab stop for the row. Right, Right, End, Right (wraps), Home, Left (wraps). Glyph 16 × 16 px. Enter on Research → `/experience?facet=research`, 4 rows, tab stop on Research, focus kept, ring solid 3 px |
| 5 | Correction 13 by deep link | First Tab into the row lands on: Research for `/experience?facet=research` and `/all?facet=research`; Coursework for `/all?facet=coursework`; All for the bare `/all`; All, with no chip current, for `/all?q=machine` |
| 6 | Correction 13 after a soft navigation | From Research, ArrowLeft then Enter → `/all?facet=corporate`: tab stop on Corporate, "1 of 19 entries" |
| 7 | Correction 13 after Back | Back to `/all?facet=research`: tab stop on Research again, and the first Tab from the search field lands on it |
| 7a | The arrows' choice is kept while the current chip is unchanged | On `/all?facet=research`: Tab lands on Research, ArrowRight moves to Volunteer, Tab leaves, Shift+Tab returns to Volunteer |
| 7b | The grid restarts per view | On `/all` the grid's tab stop was moved to its third card; after following Research (5 cards) it is the first card |
| 8 | Correction 14 | `/all`: navigation "Groups", list "Facets". No tag list, because there are no tags |
| 9 | One at a time | Under a search no chip is current and no chip href carries `q`. Under a group the form holds only `q`; searching from `/all?facet=research` lands on `/all?q=intern` |
| 10 | Escape | From `/all?facet=research` → `/`, as before |
| 11 | JavaScript off | Chips are links on `/experience` and `/all`; following one narrows the page |
| 12 | 360 × 740, both modes | No horizontal overflow on `/experience?facet=research` or `/all?facet=research`; chips 44 px high |
| 13 | Invalid input | Each 404 above renders with no canonical |
| 14 | Console | No error or warning |

Reduced motion was not re-run: no motion CSS was touched, which a search of the stylesheet diff confirms. **Only Chrome was driven.** Safari and Firefox were not tested.

### Verification: Lighthouse and the script budget

`npx lhci autorun`, config unchanged, three runs on each of the six audited URLs, on the final hosted build. The baseline is the lane head's own run on this machine earlier the same day. Medians. **Exit code 0.**

| URL | Script, before → after | Document | Performance | Accessibility |
|---|---|---|---|---|
| `/` | 144,717 → 144,828 B (+111) | +35 B | 0.98 | 1.00 |
| `/experience` | 145,898 → 147,240 B (+1,342) | +454 B | 0.98 | 1.00 |
| `/experience/break-through-tech` | 145,898 → 146,029 B (+131) | −22 B | 0.98 | 1.00 |
| `/certifications` | 145,898 → 147,240 B (+1,342) | +83 B | 0.98 | 1.00 |
| `/resume` | 144,717 → 144,828 B (+111) | −1 B | 0.98 | 1.00 |
| `/all` | 147,016 → 147,240 B (+224) | +767 B | 0.98 | 1.00 |

- **Script budget:** the largest page is 147,240 B against the 250,000 B cap, leaving **102,760 B**. Section pages grew most because they now load the tile-row island.
- Best practices and SEO are 1.00 on every run. The six warn-level LCP notices are the same six; medians 2,465–2,470 ms.
- **Stylesheet transfer grew by 857 B on every route, and not from the new rules.** The new rules landed in the existing shared chunk, which shrank. The bundler now emits the home page's own `page.module.css` as a separate 589 B file. So `/` loads three stylesheets where it loaded two, and the other pages fetch that file as part of prefetching the home link. Nothing was done about it.
- These are local figures. Do not compute a delta against CI's.
- **No LCP remediation was performed.**

### Security and IP review

- **Input:** `?tag=` and `?facet=` are new on `/all`. Each has a closed parser; `tag` is held to the slug shape with the schema's own Zod `slugSchema`, then matched against the tags that exist. A repeated or malformed value is refused. No value from a URL is used to build a query.
- **Output:** tag labels and anything from a URL are rendered as React text. The only raw markup is the six Phase 0 glyphs, build-time constants keyed by a validated facet.
- **Data access:** read-only, as `anon`, through the existing query layer. No new table, grant, policy, endpoint or write path.
- **No identity tracking, no storage, no secret.**
- **Assets:** none added. The six glyphs were already in `design/assets/icons/`; no icon was drawn or redrawn.
- **Sweep**, over every added line of the staged diff with `PROHIBITED_TERMS` read out of `design/tokens/build.mjs`: both regexes **0**; brief §2.1's other names **0**; JWT shapes, key prefixes, credential assignments, the values in the git-ignored env files, contact literals and reference URLs **0**. The 40-hex probe matches twice, on the public commit ids of `main` and the lane quoted above. Every probe fired on a canary in the same run. No binary.

## Deviated from plan

- **The index grid takes a `key` per view.** Not in the plan. A chip is a soft navigation, which keeps the grid's island mounted with its tab stop on whichever card the previous view left it. The key restarts the grid on its first card for each narrowed list, which is what the plan meant by the grid behaving as before.
- **Stylesheet chunking changed**, as described above. A side effect, not a design choice.
- **Chrome reports the tag lists' names in capitals** ("SKILLS"). The visible label is styled `text-transform: uppercase`, as the entry page's headings have been since S6, and Chrome carries that into a name taken by `aria-labelledby`. The text, and the name's source, is "Skills".
- **The four category labels now exist twice:** in `groups.tsx` and in the entry page, which decision 12 said not to touch. A test pins the new copy.
- **`BUILD_PLAN.md` was not edited.** This row's decisions are recorded here and in `CLAUDE.md` only.
- **The tab-stop rule lives in the island for every variant**, not only chip rows. The home row and the grid never have a current item, so they are unaffected; `keys.test.ts` holds that.
- **Docker Desktop was started for the database suite and the fixture build**, as decision 1 allowed, and stopped again at the end of the session. The compose containers and their volume were kept.
- **The fixture build used a locally minted anonymous token** signed with the compose file's local-only secret, and a proxy that maps the app's `/rest/v1/` path onto the bare sidecar. Both lived in the session's scratchpad.
- **Production was read once**, `GET https://kerwynjean.dev/experience`, unauthenticated, to compare chip boxes.
- **The plan prompt was answered three times with typed text**, which the app records as "keep planning". The corrections were incorporated after the first; the plan was accepted on the fourth showing.
- **No subagents were used** (`PROMPTS.md` → Tooling posture), although plan mode defaults to them.
- **Lighthouse was run once locally**, which added 18 reports to `.lighthouseci/reports/`.

## Deferred

- **Not built, by decision:** tag chips on section pages (2) · links on entry-page tags (12) · search over tags (7) · combined filters (6) · followed-team cards (9) · a visible Groups title (11).
- **Not built, and not asked:** an "Other" chip for entries with no facet. It was offered as optional polish to two earlier sessions and declined. On hosted data 7 of 19 entries have no facet (2 education, 5 certifications); they are reachable through All.
- **Tags on the live site** arrive with `lane/content`. Groups will show them with no code change; a browser check on hosted data is worth doing then.
- **One copy of the category labels** → whenever the entry page is next edited, which is `feat/shell-detail-panel`'s territory.
- **Gamepad on the chip rows** → `feat/shell-gamepad`. **Small-screen treatment** → `feat/shell-mobile`.
- **Safari, Firefox, a real device and a screen reader** → Phase 3's manual passes.
- **`PROMPTS.md` has no session block for this sub-branch.** The brief was pasted, not committed.
- Unchanged from earlier handoffs and not restated: the chime, a way to change mode after choosing, a nonce for the inline scripts, the bracketed keys in `next.config.ts`, the open ingestion items in `BUILD_PLAN.md` §8, the Dependabot PRs.

## Open questions for owner

1. **Should this row's contract be recorded in `BUILD_PLAN.md` §5, as the tile-grid contract was?** Nothing authorised a plan edit here, so it is in this handoff and `CLAUDE.md` only.
2. **Which row gives section pages their Explorer grid?** `/all` is a grid in Explorer mode; `/experience` and the others are still the plain list, now with console chips above it. No plan row names this.
3. **Should the tag lists take a literal `aria-label` instead of `aria-labelledby`?** It would make Chrome report "Skills" rather than "SKILLS", at the cost of the programmatic tie to the visible label. Both satisfy correction 14 as worded.
4. **Is one more stylesheet on `/` acceptable?** It is a bundler side effect of this change, not something the change needed.
5. **`.git/config` on this machine still sets `commit.template` to the literal `commit.gpgsign`.** It was not changed; this branch committed with `-F`.

## Next

**`feat/shell-detail-panel`** on `lane/console-shell` (`BUILD_PLAN.md` §5). It reads `entries`, `entry_relations`, `links` and `tags`, does not wait on ingestion, and ships without media. It owns shape morphing and the click → detail transition per the plan's motion mapping, and it is the first row since S6 that may touch the entry page.

Start by pulling `origin/lane/console-shell` and branching from it, never from this branch.

Not started. No other sub-branch, lane or fix was begun in this session.
