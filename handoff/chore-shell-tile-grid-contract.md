# Handoff — chore/shell-tile-grid-contract

**Merged into:** `lane/console-shell` — PR opened with auto-merge enabled. The merge record is the close-out's to add.
**Plan row:** none — a `chore/*` branch, cut from and targeting `lane/console-shell` per `BUILD_PLAN.md` §2, because the lane is live and holds the documents it corrects. It ratifies `feat/shell-tile-grid` (PR #53, lane commit `a1cb832`) and adds no sub-branch.

This is the remediation the architecture review of PR #53 asked for. It changes two documents, one config line and adds this file. It changes no application code.

## Shipped

### The answer, first

- **The eight readings PR #53 was built on are now explicit owner decisions**, recorded in `BUILD_PLAN.md` §5 beside the four answers the owner gave in that session.
- **`/all` is in CI's Lighthouse audit set.** It passes every required assertion.
- **The utility rail and the top status bar have an owner:** `feat/shell-settings-notifications`.
- **No application behaviour changed.** No verification fix became necessary, so none was made.

### Starting state, verified before any branch existed

- `origin/main` = `3c281104d8112b2d196a012ab3bce5d5ccaa8693`.
- `origin/lane/console-shell` = `a1cb8327fdb76d173292d0db44f0b311c33f973f`, the squash of PR #53, merged 2026-10-03 17:45:10 UTC. Its tree is identical to the feature commit `3343134` (`git diff 3343134 a1cb832` is empty).
- PR #53's CI run `37141428704`: all eight jobs green. The push run on the lane head, `37141664653`, is green too. The Vercel status on the feature commit is success.
- `feat/shell-tile-grid` is gone from the remote. No `chore/shell-tile-grid-contract` existed anywhere, and no later `feat/shell-*` branch exists.
- Working tree clean. `.git/info/exclude` empty.
- The branch was cut from `origin/lane/console-shell` at `a1cb832`, with `--no-track`.

### Why this exists

- PR #53's handoff said eight behaviours were "stated alongside the questions and not objected to", and the implementation then treated them as product contracts.
- The architecture review of PR #53 passed the implementation and failed that. A reading nobody objected to is not a decision.
- The remedy is not a revert. The shipped behaviour stays, and each reading becomes a decision on the record.

### How the decisions were made

The decisions arrived in the session brief, which presents them as the outcome of that review. `BUILD_PLAN.md` attributes every decision it records to the owner, so before anything was written two questions were put to the owner and answered in the session:

| # | Question | Owner's answer |
|---|---|---|
| 1 | How should the plan record who made the decisions in the brief? | **As the owner's decisions.** The owner adopts all of them, dated 2026-10-03 |
| 2 | Adding `/all` to `lighthouserc.json` makes two sentences in `CLAUDE.md` false. Correct them in this PR? | **Correct both**, and only those two |

### The decisions, as recorded in `BUILD_PLAN.md` §5

**The index**

- Its visible name is "All Software" and its URL is `/all`.
- It lists every entry exactly once, in the existing global `compareRecency` order.
- Each row resolves to the entry's canonical URL.
- It reads the existing `entries` contract, does not wait on ingestion, and renders no Storage-backed image.

**Search**

- `/all?q=<words>`, answered by the server from an ordinary GET form.
- Case-insensitive. The query is split on whitespace, and every non-empty word must match: AND across words.
- A word may match anywhere in the searched text, so part of a word matches.
- The searched fields are `title`, `subtitle` and `summary` only. No body search, and no tag search in this row.
- No fuzzy matching, ranking, reordering, highlighting, persistence or external search service.
- Search exists on `/all`, not on section pages.
- A `q` over 100 characters, or a repeated `q`, is refused.

**Canonical and sitemap**

- The bare `/all` has its own canonical URL and is in the sitemap.
- `/all?q=…` canonicalises to `/all` and is never listed separately.
- Recruiter mode not linking to `/all` does not take it out of the sitemap. Mode is presentation state, not a URL dimension.

**Presentation**

- `data-mode="explorer"` is the only Explorer selector.
- In Recruiter mode and with no mode, `/` is visually unchanged. The link to the index is in the server's markup and stays hidden and unfocusable outside Explorer mode.
- The home row stays the six top-level section tiles.
- In Explorer mode `/all` is the grid, over the same entries and the same canonical URLs. No second URL tree, no second dataset.

**Motion**

- A hovered or focused tile scales to `--scale-zoom` (1.06); its neighbours recede to `--scale-recede` (0.97).
- The transition uses the existing `--duration-fast` and `--ease-glide`.
- Smooth scrolling in Explorer mode is the browser's own. Route changes stay instant.
- Zoom and smooth scrolling are both off under `prefers-reduced-motion`.
- No motion library.

**CI coverage**

- `lighthouserc.json` audits the bare `/all` beside the five URLs it already audited, under the same assertions and the same 250,000 B script cap.
- `/all?q=…` is not audited separately.

**Shell ownership**

- `feat/shell-settings-notifications` originates the desktop utility-rail container and the top status bar. It keeps the settings, notification rail and hold-HOME overlay it already owned.
- `feat/shell-gamepad` may later add its Controllers affordance to that rail. `feat/shell-mobile` may adapt the shell to small screens. Neither originates the rail or the bar.
- The circular All Software button uses the rail's visual grammar and is not the rail. No utility rail and no status bar exists yet, and none was built here.

### The Lighthouse change

- One line: `http://localhost:3000/all` appended to `ci.collect.url` in `lighthouserc.json`.
- Unchanged: the run count of 3, all seven assertions and their levels, the 250,000 B script cap, the 500,000 B total cap, the throttling defaults and the upload target.
- `/all?q=…` was not added. A search ships no client bundle of its own.

### Lighthouse result

`npx lhci autorun`, the command CI runs, on a clean build of this branch. Three runs per URL, medians. **Exit code 0: every required assertion passed on all six URLs.**

| URL | Script | Total | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|---|---|
| `/` | 144,717 B | 267,077 B | 0.98 | 1.00 | 1.00 | 1.00 |
| `/experience` | 145,898 B | 269,405 B | 0.99 | 1.00 | 1.00 | 1.00 |
| `/experience/break-through-tech` | 145,898 B | 260,172 B | 0.98 | 1.00 | 1.00 | 1.00 |
| `/certifications` | 145,898 B | 265,089 B | 0.98 | 1.00 | 1.00 | 1.00 |
| `/resume` | 144,717 B | 263,238 B | 0.98 | 1.00 | 1.00 | 1.00 |
| **`/all`** | **147,016 B** | 269,445 B | 0.98 | 1.00 | 1.00 | 1.00 |

- **Script budget:** `/all` is the largest audited page at 147,016 B, on all three runs. That leaves **102,984 B** under the 250,000 B cap.
- The lowest performance score on any single run of any URL was 0.96, against a floor of 0.90.
- The largest total on any run was 269,953 B, against the 500,000 B cap.
- **Warn-level LCP:** six notices, the same five as before plus `/all` (median 2,469 ms, range 2,467–2,472). The assertion is `warn`, so it is not a required one, and it behaves on `/all` as it does everywhere else. No remediation was performed.
- **No delta is given for `/all`.** No earlier CI measurement of it exists. PR #53's handoff measured it once, outside `lhci`, at the same 147,016 B.
- The other five script sizes equal PR #53's run to the byte, which is what an unchanged application predicts.
- These are local figures. CI's own run decides the merge.

### What changed, file by file

| File | Change |
|---|---|
| `BUILD_PLAN.md` | §5, `lane/console-shell`: two new paragraphs after the motion mapping, and the `feat/shell-settings-notifications` entry in the row list now names the rail and the bar |
| `lighthouserc.json` | One URL added |
| `CLAUDE.md` | Two sentences corrected |
| `handoff/chore-shell-tile-grid-contract.md` | New — this file |

Four files. Nothing under `app/`, `lib/`, `design/`, `supabase/`, `scripts/` or `.github/`. `package.json` and `package-lock.json` are untouched.

**Why `CLAUDE.md` is in the diff.** It was not in the expected file set, so the case is stated here:

- Its route-table paragraph listed the audited URLs as five. The config now lists six.
- Its tile-grid block said `/all` is "not in `lighthouserc.json`, so CI does not see it". After this change it is, and CI does.
- Both would be false the moment this merges, and `CLAUDE.md` is loaded into every session as project instructions.
- A word-level diff shows those two sentences and nothing else.

### Verification: local gates, on the final tree

- `npm run lint`: 0 problems.
- `npm run typecheck`: clean.
- `npm test`: **311 passed, 28 files** — the same count as the lane head.
- `npm run tokens:check`: ok — 60 static and 19 themed tokens, 68 of 68 contrast measurements pass, 29 icons and 2 mark files.
- `npm run build`: ok. `/` ○, `/_not-found` ○, `/[section]` ƒ, `/[section]/[slug]` ●, `/all` ƒ, `/resume` ○ with a 1 h revalidate. No route changed mode.
- **`npm run db:test` was not run.** The Docker daemon is not running on this machine. No query, schema, migration or seed changed, and CI's database job is in `CI green`'s `needs`, so it gates the merge.

### Verification: a real browser

Headless Chrome driven by `puppeteer-core`, against `next start` on this branch's production build with hosted data. The driver stayed outside the repo. Kept short on purpose: no application file changed.

| # | Check | Result |
|---|---|---|
| 1 | `/`, `/all`, `/all?q=machine` load | 200 each. The search shows "2 of 19 entries match", canonical `/all` |
| 2 | `/all` shows ordinary canonical links | 19 `<a href>`, 19 distinct, each `/<section>/<slug>`, each 200. No `target`, no `tabindex` |
| 3 | The same links with JavaScript off | A click on the first one loads its canonical URL |
| 4 | Recruiter chosen, `/` | The All Software link is in the markup, `display: none`, 0 × 0 px, and Tab never reaches it. Six tiles in S7's grid |
| 5 | Explorer chosen, `/` | The link shows at 134 × 44 px, Tab reaches it, and Enter opens `/all` as a grid of 19 |
| 6 | Console | No error or warning in any scenario |

Reduced motion was not re-run. The brief asks for it only if an implementation file changed, and none did. PR #53's handoff holds that evidence for the identical tree.

**One thing the driver turned up, which is tooling and not the site.** On a repeat visit to a URL in the same tab, puppeteer's `networkidle0` never settles and it counts a few requests as unfinished. They are Next's `?_rsc=` prefetches served from the HTTP cache. The browser's own Resource Timing shows each one finished within 36 ms with a transfer size of 0, and `/experience` and `/` do the same. First visits show none. Wait on `load` for a repeat visit.

### Prohibited-term, secret and contact sweep

Over every added line of the staged diff, with `PROHIBITED_TERMS` read out of `design/tokens/build.mjs` rather than retyped: both regexes **0**; brief §2.1's other names **0**; JWT shapes, key prefixes, credential assignments, the values in the git-ignored env files, contact literals and reference URLs **0**. The 40-hex probe matches twice, on the public commit ids of `main` and the lane quoted under Starting state. Every probe fired on a canary in the same run. No binary and no asset was added.

## Deviated from plan

- **Four files, not the three the brief expected.** `CLAUDE.md` is the fourth, on the owner's answer to question 2.
- **The `feat/shell-settings-notifications` entry in the row list was amended, not only described in a paragraph.** A session prompt quotes its row verbatim, so the ownership has to be in the row itself.
- **The decisions are recorded as the owner's.** That rests on the owner's answer to question 1, given in the session.
- **`handoff/feat-shell-tile-grid.md` was not edited.** It is the record of what that session knew. Three things in it are now superseded: the eight readings are decisions; `/all` is in `lighthouserc.json`; and its open questions 1 to 5 are answered by the decisions above.
- **`npm run db:test` was not run locally.** See above.
- **Lighthouse was run once locally**, which added 18 reports to `.lighthouseci/reports/`. That directory is never cleared; filter by filename timestamp.
- **No subagents were used** (`PROMPTS.md` → Tooling posture).

## Deferred

- **LCP.** `/all` joins the five pages over the 1.5 s warn threshold. Remediation is still a separate plan item the owner has not scheduled (`BUILD_PLAN.md` §5.2).
- **The local branch `feat/shell-tile-grid`** is still on this machine, merged and with its upstream gone. It was left alone.
- **`PROMPTS.md` has no session block for this chore.** The brief was pasted, not committed.
- Unchanged from `handoff/feat-shell-tile-grid.md` and not restated here: everything under its Deferred heading except the CI audit of `/all`, which this chore delivers, and the rail and status bar, which now have an owner.

## Open questions for owner

1. **`.git/config` on this machine still sets `commit.template` to the literal `commit.gpgsign`.** It was not changed; this branch committed with `-F`. Unchanged from the last three handoffs.

No new question. The five that `handoff/feat-shell-tile-grid.md` raised about the tile grid are answered by the decisions above.

## Next

**`feat/shell-facets`** on `lane/console-shell` (`BUILD_PLAN.md` §5), once this chore has merged. It reads `entries.facet` and `tags`, does not wait on ingestion, and runs in order. It inherits the contract recorded here: tag search is its to add or not, and it changes nothing about `/all`'s search without a new decision.

Start by pulling `origin/lane/console-shell` and branching from it.

Not started. No sub-branch, lane or feature was begun in this session.
