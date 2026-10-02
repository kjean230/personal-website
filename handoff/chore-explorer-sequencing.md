# Handoff — chore/explorer-sequencing

**Merged into:** `main` — opened as a PR and **left for the owner to merge**; `main-protection` requires a review GitHub will not let the author give, so it needs the owner's `--admin` path, as every earlier docs chore did.
**Plan row:** none — a `chore/*` branch, cut from and targeting `main` per `BUILD_PLAN.md` §2, because no lane is live and `main` holds the documents it corrects. Documentation only, four files: `BUILD_PLAN.md`, `CLAUDE.md`, `PROMPTS.md` and this handoff. No app code, no `lib/`, no CSS, no schema, no migration, no seed, no dependency, no CI change, and no edit to any earlier handoff.

This is the architecture and docs-planning session `handoff/chore-recruiter-gate-closeout.md` named as next. It changes what order the remaining work runs in. It builds nothing.

## Shipped

### State verified before the first edit

- **PR #49 merged** 2026-10-01 20:58:38 UTC, squash `da152d2` (`da152d2d1a257d85398a700554fd7fc6fba65624`). An earlier attempt at this session stopped three times because #49 was still open; planning began only after the merge was read from GitHub.
- **`origin/main` = `da152d2`**, by `git fetch` and by `git ls-remote`, and unchanged between the plan and the edits. `bda8136..da152d2` adds one file: the recruiter gate close-out handoff.
- **CI on `da152d2`:** all jobs green, `CI green` included.
- **Working tree clean.** This branch was cut from `origin/main` at `da152d2`.
- **No implementation lane exists.** The remote holds `lane/identity`, `lane/recruiter` and `lane/spine` only — no `lane/ingestion`, `lane/console-shell` or `lane/admin`.
- **Open PRs:** the five Dependabot ones (#31, #32, #42, #43, #44), untouched.
- **No hidden local spec.** `.git/info/exclude` is empty, and the only ignored document, `REFERENCES.md`, carries no sequencing rule.

### The old sequencing

- `BUILD_PLAN.md` §5 said of Pair 2: "Runs after Pair 1 merges, because Play Activity depends on ingested data existing."
- That made all ten `lane/console-shell` sub-branches, and all of `lane/admin`, wait for all of `lane/ingestion` — for a reason that applies to one shell row.
- `CLAUDE.md`'s phase-order line and `PROMPTS.md`'s Pair 2 motion notes restated it.
- `lane/ingestion` is not started and is held by owner decisions, so the rule stalled the whole Explorer.

### The revised sequencing — `BUILD_PLAN.md` §5.1

**The rule:** a sub-branch waits on another lane only if it consumes what that lane produces. A console-shell sub-branch is blocked by ingestion if, and only if, it reads ingested data.

The Pair headings stay as lane groupings, so every earlier reference to "Pair 1", "Pair 2" or "Pair 3" still resolves. They no longer decide when a lane starts.

| Step | What runs | Starts when |
|---|---|---|
| 1 | LCP diagnostic — a chore, not a lane | Now |
| 2a | `lane/console-shell` | The diagnostic's handoff is on `main`. Nothing else is required |
| 2b | `lane/ingestion` | Its §8 owner items are settled. It waits for neither the diagnostic nor the shell |
| 3 | `lane/admin` | `lane/ingestion` → `main` has merged |
| 4 | `lane/reactions` + `lane/content` | `lane/console-shell` and `lane/admin` have both merged |
| 5 | `lane/hardening` | Every lane above has merged |

Gates land in the order ingestion → admin → console-shell.

### The two-lane model

- A lane is active from the moment its branch is cut until its lane → `main` gate merges. A `chore/*` branch is not a lane.
- The active sets, in order: `{console-shell}` or `{console-shell, ingestion}` → `{console-shell, admin}` → `{reactions, content}` → `{hardening}`. Ingestion, console-shell and admin are never open together.
- **`lane/admin` waits for `lane/ingestion` → `main`, and the edges force that.** The shell holds `feat/shell-play-activity`; admin holds the manual ingestion trigger, which dispatches ingestion's workflows (by elimination, `feat/admin-controls`). Neither lane can tick §7's "lane scope complete" until ingestion is on `main`. Cutting admin beside the shell would fill both seats with lanes that cannot finish and leave none for the lane they wait on.
- `{console-shell, ingestion}` is file-disjoint on the split Pair 1 already used: app routes, `app/(explorer)` and `design/tokens` against `.github/workflows`, worker scripts and `supabase/migrations`.

### The ten console-shell rows

| Sub-branch | Reads | Waits on ingestion? | What a session does |
|---|---|---|---|
| `feat/shell-boot-profile` | Identity assets and the chime; no content | No | Runs in order |
| `feat/shell-tile-grid` | `entries` | No | Runs in order; renders no Storage-backed image |
| `feat/shell-facets` | `entries.facet`, `tags` | No | Runs in order |
| `feat/shell-detail-panel` | `entries`, `entry_relations`, `links`, `tags` | No | Runs in order and ships without media |
| `feat/shell-trophy-full` | `entries` (certifications and awards), `status` | No | Runs in order |
| `feat/shell-play-activity` | `ingest_spotify_*`, `ingest_steam_*`, IGDB titles and genres | **Yes** | Waits for both start conditions |
| `feat/shell-album-news` | `media` (Album) · `entries` of kind `post` (News) | No | Waits for `feat/admin-media` on `main` |
| `feat/shell-settings-notifications` | Client state only | No | Runs in order |
| `feat/shell-gamepad` | Nothing — the Gamepad API | No | Runs in order |
| `feat/shell-mobile` | Whatever the rows above render | No | Runs in order |

Exactly one row is ingestion-dependent. Ingested data lives in `ingest_spotify_*` and `ingest_steam_*`, never in `entries`, so no other row can reach it.

### What a session does at a waiting row

- A waiting row has start conditions. A session for a row whose conditions are not met **does not begin**.
- The lane moves to the next row in the list, and the skipped row is named as pending under `## Next` in that handoff.
- Starting a waiting row anyway is a §2.1 stop.
- Rows listed after a waiting row do not wait for it. List order is the default running order, never a dependency.

### Play Activity's two start conditions

`feat/shell-play-activity` starts only when both hold:

1. `lane/ingestion` → `main` has merged, carrying `feat/ingest-spotify`, `feat/ingest-steam` and `feat/ingest-igdb`.
2. A new §8 row is settled: **who owns, and where lives, the application read/query layer over `ingest_spotify_*` and `ingest_steam_*`.** The app reads only through `lib/content/queries.ts` today, and no plan row assigns the ingest reads to any lane.

That layer was neither assigned nor designed here. The gap is a pre-start blocker so the session cannot begin on a guess.

### The media rule, and one scope assignment

The governing fact is an owner decision already on record: S6's Decision 3 (2026-08-27, `handoff/chore-prompts-spine-s6.md`) — media stays unrendered until `feat/admin-media` creates the Storage bucket. Lanes see each other only through `main`, so the bucket reaches the shell when `lane/admin` → `main` merges.

- **`feat/shell-detail-panel` does not wait.** It ships dates, stack, links and related entries with no media markup, no bucket constant, no URL helper and no guessed bucket name. A session that cannot finish the row without media stops under §2.1 and does not add it.
- **`feat/shell-album-news` waits as a whole row** until `feat/admin-media` is on `main`. Album is media and nothing else. News waits with it at no visible cost: `post` rows do not exist until `lane/content`, and `/now` already renders its empty state.
- **Storage-backed images in the shell are rendered by `feat/shell-album-news` and by no earlier row** — Album, the detail panel's media slot, and any `entries.icon_asset` tile art.
- **The scope assignment.** Decision 3 forces the first two bullets. It does not say which shell row later adds media to the detail panel; this revision names `feat/shell-album-news`, the only existing shell row that consumes media, and the owner approved that with the plan. No sub-branch was added, and no empty-state Album was invented.

### The LCP diagnostic — `BUILD_PLAN.md` §5.2

Brief §9 requires "Recruiter mode: LCP < 1.5s". CI recorded 1,820–2,824 ms on `main` at the recruiter gate. `lighthouserc.json` asserts it at `warn`, so CI is green while the criterion is unmet. Until this chore, no document named a diagnostic.

- **Gate:** `lane/console-shell` is not cut until the diagnostic's handoff is on `main`. Every console-shell sub-branch counts as substantial Explorer visual complexity, so the gate is on the lane.
- **Completion is the whole gate.** The handoff on `main` opens the lane, whatever it finds. Deciding whether to schedule a remediation is separate and is **not** a condition for cutting `lane/console-shell`.
- **It gates nothing else** — not `lane/ingestion`, not a docs chore.
- **It measures; it does not fix.** A finding is not permission to optimise. Remediation is a separate plan item the owner approves after reading the findings; none exists.
- **Branch:** `chore/lcp-diagnostic`, cut from and merged into `main`, one session.
- **Scope:** recruiter-mode rendering of four pages, one per route class, all already in `lighthouserc.json` — `/` (static) · `/experience` (per request) · `/experience/break-through-tech` (SSG on demand) · `/resume` (static, hourly revalidate).
- **Inputs:** `main` as it stands · `lighthouserc.json` unchanged · the `lighthouse-reports` artifact of the latest `main` CI run · a local `npm run build && npm run start` · production at `https://kerwynjean.dev`, read-only and unauthenticated.
- **Measurements, per page and per environment** (CI artifact, local, production):
  - the LCP element — its selector, and whether it is text or an image;
  - LCP and its four sub-parts: time to first byte, resource load delay, resource load duration, element render delay;
  - the conditions behind each number: throttling method, form factor, cold or warm cache, run count;
  - median and range over at least five runs wherever the session controls the run count;
  - what sits on the critical path before the LCP paint: render-blocking CSS, font loading, script, hydration, and for `/experience` the server render and its data reads.
- **Classification:** for each page, the dominant source of delay — server, data or rendering · CSS or font · network or resource · framework or runtime · client hydration · or another measured source — with the numbers that show it, and where the four pages differ.
- **Acceptance:** the LCP element identified on all four pages in every environment measured · sub-part timings with run count, median and range · each page's dominant delay named with evidence, any unexplained remainder reported as unexplained · the CI figure reproduced locally or the gap reported · a protocol a second person can rerun and land inside the stated range · remediation options listed smallest first, each tied to a measured cause, with expected gain and cost, none applied.
- **Deliverable:** `handoff/chore-lcp-diagnostic.md` and nothing else. Any driver script stays out of the repo.
- **Stop:** when the PR opens. No app code, CSS, config, dependency, CI job or `lighthouserc.json` change. If the measurement cannot be finished without changing the app, stop and report that instead.

### Spotify and Steam stay required

- Owner's decision, 2026-10-01: **both are required product goals.** Neither is dropped to unblock sequencing.
- `BUILD_PLAN.md` §8's Steam row read "Steam profile set to public, or Steam ingestion is dropped". The second half is struck in place and the row says Steam is required.
- `lane/ingestion`'s paragraph in §5 now states both as required, and that what is undecided is how each is built.
- This supersedes option (b), "drop Spotify ingestion", in `handoff/chore-verify-terms.md` open question 1. That handoff is left as written.

### Files changed

| File | Change |
|---|---|
| `BUILD_PLAN.md` | §2: a chore has no plan row, except one the plan names · new §5.1 (sequencing, the step table, the two-lane model) · new §5.2 (the LCP diagnostic) · §5 Pair 1: the recruiter merge recorded, Spotify and Steam required, Steam after `/privacy` · §5 Pair 2: the blanket sentence replaced · §5 `lane/console-shell`: the ten-row table and the waiting-row rules · §6: `/privacy` and budget enforcement notes · §8: the Steam row reworded, five rows added |
| `CLAUDE.md` | The phase-order line points at plan §5.1 instead of restating pair order |
| `PROMPTS.md` | Line 852: the Pair 2 ordering sentence replaced · line 846: the stale ingestion blocker list replaced with a pointer to plan §8 |
| `handoff/chore-explorer-sequencing.md` | New — this file |

### Verification

- **File set:** exactly the four files above differ from `origin/main`; `git diff origin/main -- handoff/` shows this one new file, so no earlier handoff changed.
- **No code:** nothing under `app/`, `lib/`, `supabase/`, `scripts/`, `design/` or `.github/`, and neither `package.json` nor `package-lock.json`.
- **Consistency search** over `BUILD_PLAN.md`, `CLAUDE.md`, `PROMPTS.md`, `README.md` and `DESIGN.md`, for pair-order and ingestion-wait wording, `wait` / `waits` / `blocked` as whole words, "drop" beside Spotify or Steam, `admin-media`, "media markup", the two ingest table prefixes, and read-layer ownership:
  - every live match is consistent with §5.1, §5.2 and §8;
  - the only "dropped" beside a provider is the struck phrase in §8 and the two sentences saying dropping is not an option;
  - one stale match is historical and left as written — see Deviated;
  - **no contradiction was found outside the four authorised files.**
  - `git grep -E` on this machine does not support `\b`: the first pass for whole words returned nothing, silently. It was re-run with `-w`, which returned 25 lines. A search that comes back empty here is not evidence until the pattern is canaried.
- **Added-line checks**, over the staged diff with a scanner kept out of the repo: prohibited terms with the two regexes read out of `design/tokens/build.mjs` — **0** · brief §2.1's other names — **0** · contact literals — **0** · the Supabase project ref — **0** · secret shapes — **0 real**, one false positive: the 40-hex pattern matches the full commit id of `main` quoted under Shipped, which is public. The scanner was canaried against known-bad strings in the same run, and every canary fired.
- **No local build or test run**, deliberately, on the `chore/verify-terms` precedent: four Markdown files prove nothing a build would catch, and CI runs the full suite on the PR.
- CI results for this PR are recorded in the PR, not here.

## Deviated from plan

- **Two plan-mode rounds, not one.** The first plan called the `PROMPTS.md:846` edit optional, left the media dependency as "recorded, unresolved", and left the Play Activity read-layer gap in risks prose. The owner returned it with three corrections; Revision 2 made the `PROMPTS.md` edit mandatory, wrote the waiting-row rules, and promoted the read-layer gap to a §8 row. What shipped is Revision 2.
- **`PROMPTS.md:624` is left as written.** It says Pair 1 "is now blocked only on plan §8's Steam-visibility item", which no longer matches §8. It sits inside the dated 2026-08-29 spine-gate record, so it was treated as history rather than as live blocker text, and the owner approved the plan with that stated.
- **The remediation decision is worded as a non-prerequisite in three places** — §5.1's step table, §5.2 and the new §8 row — on the owner's instruction at approval that it must not silently become a second condition for cutting `lane/console-shell`.
- **No subagents were used** (`PROMPTS.md` → Tooling posture), although the harness's plan mode defaults to them.
- **Local `main` was not fast-forwarded.** The branch was cut from `origin/main` directly; local `main` is still one commit behind at `bda8136`.

## Deferred

- **`PROMPTS.md` has no session block for the LCP diagnostic.** `BUILD_PLAN.md` §5.2 is the scope source. `PROMPTS.md:122` records that each session's block is committed there before it runs, so the owner may want one written first.
- **`PROMPTS.md` still has no dated recruiter-gate section** of the kind the spine gate got. Unchanged from `chore-recruiter-gate-closeout.md`.
- **Stale and left as written, because none is a sequencing rule:** `PROMPTS.md:868`'s script-budget figures are the spine gate's (the current ones are in `chore-recruiter-gate-closeout.md`) · `CLAUDE.md`'s "Verify at build time" line lists four items `BUILD_PLAN.md` §9 settled on 2026-08-30 · `PROMPTS.md:862` says "at Pair 2 time", which now means when `lane/console-shell` opens.
- **`BUILD_BRIEF.md` was not edited.** Its §6 Spotify row and box-art wording stay superseded by `BUILD_PLAN.md` §9, as `chore-verify-terms.md` left them.
- **The standing deferral of the entry page's semantic `<figure>` markup to `feat/admin-media` is unchanged.** This chore assigns the shell's media presentation only.
- **`feat/shell-play-activity` and `feat/shell-album-news` will run after `feat/shell-gamepad` and `feat/shell-mobile`**, so each carries its own keyboard, gamepad and small-screen behaviour to the conventions those rows set. Nothing in the plan says so in those words.
- Unchanged from earlier handoffs: the four-page printed resume · print and SEO checks as CI jobs · security headers and `app/global-error.tsx` → Phase 3 · delete `keep-warm.yml` when an ingestion cron lands, at no less than daily frequency · `links.kind = 'credential'` migration · facet-count view · generated-types drift check in CI · `www` has no DNS record · the five Dependabot PRs.

## Open questions for owner

Now rows in `BUILD_PLAN.md` §8:

1. **`feat/ingest-spotify`: which compliant storage design?** The accumulated-history design in brief §6 cannot be built under Spotify's terms. Dropping Spotify is no longer on the list.
2. **`feat/ingest-steam`: is the Steam profile public?**
3. **`feat/ingest-steam`: how is the Valve Brand & Links clause honoured?** A brief §2.1 call.
4. **`feat/ingest-steam`: which branch delivers `/privacy` ahead of Phase 3?** It is an app route, and `lane/ingestion` owns none.
5. **`feat/shell-play-activity`: who owns the read/query layer over the ingest tables, and where does it live?**

Not rows, and still open:

6. **The second seat is ingestion's.** While items 1–4 are open only the shell runs, and `lane/admin` waits behind them. Starting admin sooner needs a rule the plan does not have — gating a lane with a sub-branch deferred, or moving the manual ingestion trigger out of admin.
7. **May Play Activity ship with one source first?** Undecided, so under this plan it waits for both Spotify and Steam.
8. **Under what conditions is brief §9's 1.5 s judged?** The brief does not say. The diagnostic records the conditions behind each number; what the target means is the owner's call.
9. **`.git/config` on this machine sets `commit.template` to the literal value `commit.gpgsign`**, which names no file. `CLAUDE.md` says the repo has no `commit.template`. It is local, uncommitted and was not changed here; this chore committed with `-F`, which never reads a template. It looks like a mistyped check, and a bare `git commit` may fail on it.

## Next

**The LCP diagnostic — `chore/lcp-diagnostic`, cut from `main`, scoped by `BUILD_PLAN.md` §5.2.** It is step 1 of §5.1 and the only thing `lane/console-shell` waits for. One session, measurement only, one deliverable: `handoff/chore-lcp-diagnostic.md`. It changes no app code, CSS, config, dependency, CI job or `lighthouserc.json`, and it stops at findings and recommendations.

Two things can proceed beside it, because neither waits on it: the owner's decisions on open questions 1–4, which are what `lane/ingestion` waits for, and open question 5, which `feat/shell-play-activity` waits for.

After the diagnostic's handoff is on `main`, `lane/console-shell` may be cut from `main`, starting with `feat/shell-boot-profile`.

Not started. No lane, sub-branch, diagnostic or feature was begun in this session.
