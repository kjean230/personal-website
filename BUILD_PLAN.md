# Build Plan — Phases, Branches, Gates

Companion to the Build Brief. The brief defines *what*; this defines *in what order, on which branch, and when it may merge*. Scope decisions in the brief are settled and are not reopened here.

---

## 1. Locked decisions

| # | Decision                                                                                                          |
| - | ----------------------------------------------------------------------------------------------------------------- |
| 1 | Hybrid slicing: one thin end-to-end spine, then parallel lanes                                                    |
| 2 | Spine depth: schema → API → recruiter render → one console tile + detail → BTT multi-placement + trophy state |
| 3 | Two lanes concurrent maximum, paired for file disjointness                                                        |
| 4 | Merge gate: green CI**and** a signed-off per-lane acceptance checklist                                      |
| 5 | Branch unit: long-lived lane branch with stacked sub-branches merged into it                                      |
| 6 | Console identity: agent proposes three complete identities, owner picks one                                       |
| 7 | BTT record sourced from owner's LinkedIn export, normalized by agent, edited by owner                             |
| 8 | Security: explicit items on every lane checklist, plus the Phase 3 audit                                          |
| 9 | Sub-branch is a stopping unit: the agent halts and hands back at each one (§2.1)                                  |
| 10 | Sub-branch → lane auto-merges on green CI; no human in that loop. Human gate is lane → main only                |

### Derived consequences

- CI/CD is **not** a Phase 1 lane. It is the first sub-branch of the spine, because checklists are meaningless without lint, typecheck, tests, and preview deploys already running.
- The LinkedIn export normalizer is **not** part of the ingestion lane. It is pre-spine work; it is a one-shot importer, not a scheduled worker.
- Infra/DB and API are absorbed into the spine rather than existing as separate Phase 1 lanes.
- Phase 0 splits into a proposal step that halts for a human decision, and a build step.

---

## 2. Branch conventions

```
main                        protected; no direct pushes
lane/<name>                 long-lived; one per lane; cut from main; rebased on main after every main merge
feat/<lane>-<slice>         stacked sub-branch; branched from and merged into its lane branch
chore/<slice>               docs/verification branch; cut from — and merged into — whichever branch
                            holds the documents it corrects: an open lane while that lane is live,
                            otherwise main
```

A `chore/*` branch is not a sub-branch and has no plan row; its handoff writes `**Plan row:** none — …`. The one exception is a chore the plan itself names — the LCP diagnostic (§5.2) — whose handoff cites that section instead. Before the spine reached `main` every docs chore targeted `lane/spine`, because `main` carried no `.github/` and the required `CI green` check could never report on a branch cut from it. That constraint ended at the spine gate.

- Sub-branch → lane: **auto-merge on green CI**. No sign-off, no human step. The agent opens the PR with auto-merge enabled and stops; CI merges it. See §2.1.
- Lane → main: **green CI + acceptance checklist signed off by owner**.
- Rebase lane branches on `main` after each merge to `main`. Never let a lane drift more than one merge behind.
- One Cowork session per sub-branch. One agent per lane. Never two agents on one lane branch.
- Every PR body links the lane checklist and ticks the security block (§7).

### 2.1 Sub-branch stop rule

**Canonical.** This section is the single source of truth for stopping behavior. Other documents (`CLAUDE.md`, any prompt template) carry a pointer here and one sentence — never a copy.

A sub-branch is a unit of work **and** a unit of stopping. Opening the PR ends the session; the merge is not the agent's job.

**At the end of every sub-branch:**

- Push, open the PR into the lane branch **with auto-merge enabled**, and report three things: what shipped, what was deliberately deferred, and which sub-branch is next. Then stop.
- Green CI merges the PR without a human. Do not wait on it, do not babysit it, and do not merge it by hand.
- Do not begin the next sub-branch in the same session — not even a stacked one that depends on the work just finished. "One Cowork session per sub-branch" (§2) is the enforcement mechanism, not a suggestion.
- Do not merge lane → `main`. That is the one human gate (§7) and always the owner's call.

**Start of every sub-branch session:** pull the lane branch first. Auto-merge means it already contains every prior sub-branch, so branch from `lane/<name>`, never from another `feat/` branch.

**Stop early, before the sub-branch is complete, when:**

- An item from §8 (blocked on owner) is reached
- **The plan is ambiguous or silent on something this sub-branch needs** — distinct from an §8 item, which is a known gap with a named owner. This one is an *unknown* gap. It is the case most likely to produce a confident wrong guess, so it is the one that most needs a halt: state the ambiguity and what you would have assumed, and stop. Do not resolve it by picking the reading that lets the work continue.
- The work requires inventing content — entries, dates, orgs, links, team names (brief §10)
- A change would touch files owned by another lane, or a shared component (§5)
- CI is red for a cause outside this sub-branch's scope
- The sub-branch's scope turns out to be wrong — say so rather than widening it

**Sub-branch definition of done.** Lighter than the lane checklist in §7; ticked in the sub-branch PR body.

- [ ] Scope matches the sub-branch row in §4/§5 — no more, no less
- [ ] Green CI: lint, typecheck, tests
- [ ] No secrets committed
- [ ] No prohibited term or third-party asset introduced (brief §2.1)
- [ ] Anything deferred is written down, not silently dropped

---

## 3. Phase 0 — Identity (blocking, serial, single agent)

Nothing visual starts until 0b merges.

Phase 0 predates CI and auto-merge (both arrive with S1): 0a and 0b PRs are opened without auto-merge and merged by hand by the owner; CI items in §2.1 and §7 are recorded as N/A for this phase.

### 0a — `feat/identity-proposals` → `lane/identity`

Produce **three complete, distinct identities**. Each one includes: wordmark, accent palette (primary, secondary, surface, text, semantic states), icon direction, motion curve character, and a one-line chime concept. Render each as a single comparison page.

Constraints from brief §2.1 apply to all three: no red/blue Joy-Con pairing, no Nintendo typefaces, no rendered console hardware, no first-party assets, and the phrase "Nintendo Switch" appears nowhere.

**Hard stop. Owner picks one before 0b begins.**

### 0b — `feat/identity-tokens` → `lane/identity` → `main`

- Design tokens: palette, type scale, spacing scale, radii, motion curves, elevation
- WCAG 2.2 AA contrast verified in **both** themes, documented per token pair
- Icon set drawn from scratch as SVG
- Wordmark asset
- Boot chime asset (see owner input §8)
- `DESIGN.md` recording the borrowed-grammar vs. protected-expression distinction

**Checklist:** tokens consume nowhere-hardcoded values · contrast table present and passing · zero third-party assets in repo or bundle · `DESIGN.md` present.

---

## 4. Phase S — Spine (serial, single lane, no concurrency)

Branch: `lane/spine`. Sub-branches stacked in order; each depends on the one before.

| #  | Sub-branch                     | Contents                                                                                                                                                                                                    |
| -- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1 | `feat/spine-ci`              | Next.js App Router + TS scaffold · lint · typecheck · test runner · Lighthouse CI budget · Vercel preview per PR · Dependabot · secret scanning · branch protection rules · **auto-merge enabled on `lane/*` targets (§2.1)**                           |
| S2 | `feat/spine-schema`          | Migrations for`entries`, `tags`, `entry_tags`, `entry_relations`, `media`, `links`, `reactions` · RLS policies · seed fixtures · local `docker-compose` · Supabase branch-per-PR wiring |
| S3 | `feat/spine-linkedin-import` | LinkedIn export parser →`entries` rows · output committed as editable seed data · **owner edits before S6**                                                                                      |
| S4 | `feat/spine-api`             | Zod schema per`kind` · query layer for tile row, detail, facet counts, relation traversal · caching and revalidation                                                                                    |
| S5 | `feat/spine-routes`          | **The shared route table.** Written before either renderer exists. Both modes bind to it. This is the artifact brief §8 requires lanes 5 and 6 to agree on.                                          |
| S6 | `feat/spine-recruiter`       | SSR section index + detail page · functional with JS disabled · plain`/resume`                                                                                                                          |
| S7 | `feat/spine-console-tile`    | Minimal shell: one tile row, tile → detail at the same URL · arrows/Enter/Escape · roving`tabindex` · visible focus ring                                                                              |
| S8 | `feat/spine-trophy`          | Trophy case rendering`status` as locked / in_progress / unlocked                                                                                                                                          |

**Spine acceptance (gates `lane/spine` → `main`):**

- One BTT record surfaces in Experience, Projects, and the trophy case, with zero duplication
- The same URL resolves correctly in both renderers
- Recruiter path works with JS disabled
- Keyboard traverses the tile row and reaches the detail page with no trap
- Green CI, preview deploy live

---

## 5. Phase 1 — Lanes (two concurrent, paired for file disjointness)

### 5.1 Sequencing — dependency edges and the two-lane limit

Revised 2026-10-01 by `chore/explorer-sequencing`, on the owner's direction at the recruiter gate. The pairs below still group the lanes and say which are file-disjoint. **They no longer decide when a lane starts** — this section does, and it replaces the old rule that all of Pair 2 waits for all of Pair 1.

**The rule.** A sub-branch waits on another lane only if it consumes what that lane produces. A console-shell sub-branch is blocked by ingestion if, and only if, it reads ingested Spotify, Steam or IGDB data. Exactly one does: `feat/shell-play-activity`. List order inside a lane is the default running order, never a dependency.

**Two lanes at most** (§1, decision 3). A lane is active from the moment its branch is cut until its lane → `main` gate merges. A `chore/*` branch is not a lane and does not count.

| Step | What runs                                    | Starts when                                                                        |
| ---- | -------------------------------------------- | ---------------------------------------------------------------------------------- |
| 1    | LCP diagnostic (§5.2) — a chore, not a lane | Now                                                                                |
| 2a   | `lane/console-shell`                         | The LCP diagnostic's handoff is on `main`. Nothing else is required                |
| 2b   | `lane/ingestion`                             | Its §8 owner items are settled. It waits for neither the diagnostic nor the shell |
| 3    | `lane/admin`                                 | `lane/ingestion` → `main` has merged                                              |
| 4    | `lane/reactions` + `lane/content` (Pair 3)   | `lane/console-shell` and `lane/admin` have both merged                             |
| 5    | `lane/hardening` (§6)                       | Every lane above has merged                                                        |

The active sets are therefore `{console-shell}` or `{console-shell, ingestion}`, then `{console-shell, admin}`, then `{reactions, content}`, then `{hardening}`. Ingestion, console-shell and admin are never open together. Gates land in the order ingestion → admin → console-shell.

**Why `lane/admin` waits for ingestion.** The shell and admin each hold one piece of work that consumes ingestion's output: `feat/shell-play-activity`, and admin's manual ingestion trigger, which dispatches ingestion's workflows (`feat/ingest-scheduling`; by elimination the trigger is `feat/admin-controls`). Neither lane can tick §7's "lane scope complete" until ingestion is on `main`. Cut admin beside the shell and both seats are held by lanes that cannot finish, with no seat left for the lane they are waiting on. So the second seat is ingestion's, and it stays empty while ingestion's §8 items are open.

**File disjointness of the first pairing.** `lane/console-shell` owns app routes, `app/(explorer)` and `design/tokens`; `lane/ingestion` owns `.github/workflows`, worker scripts and `supabase/migrations` — the same split Pair 1 relied on. `{console-shell, admin}` is Pair 2 as written, overlap rule included.

### 5.2 LCP diagnostic — gates `lane/console-shell`

Brief §9 requires "Recruiter mode: LCP < 1.5s". CI's Lighthouse recorded 1,820–2,824 ms on `main` at the recruiter gate (run `36904872895`), and a warn-level miss on every sub-branch since S5. `lighthouserc.json` asserts it at `warn`, so CI is green while the criterion is unmet, and nobody has measured why.

**Gate.** `lane/console-shell` is not cut until this diagnostic's handoff is on `main`. Every console-shell sub-branch counts as substantial Explorer visual complexity — the first, `feat/shell-boot-profile`, puts a boot sequence in front of `/` — so the gate is on the lane, not on a row. **Completion is the whole gate:** the handoff on `main` opens the lane, whatever it finds. The diagnostic gates nothing else — not `lane/ingestion`, not a docs chore.

**It measures; it does not fix.** A finding is not permission to optimise. The session stops at findings and recommendations. Remediation, if any, is a separate plan item the owner approves after reading them; none exists today, and deciding whether to schedule one is not a condition for cutting `lane/console-shell`.

Branch: `chore/lcp-diagnostic`, cut from and merged into `main`. One session.

- **Scope:** the recruiter-mode rendering of four pages, one per route class, all already in `lighthouserc.json` — `/` (static) · `/experience` (rendered per request) · `/experience/break-through-tech` (SSG on demand) · `/resume` (static, hourly revalidate).
- **Inputs:** `main` as it stands · `lighthouserc.json`, unchanged · the `lighthouse-reports` artifact of the latest `main` CI run · a local `npm run build && npm run start` · production at `https://kerwynjean.dev`, read-only and unauthenticated.
- **Measurements, per page and per environment** (CI artifact, local, production):
  - the LCP element — its selector, and whether it is text or an image;
  - LCP and its four sub-parts: time to first byte, resource load delay, resource load duration, element render delay;
  - the conditions behind each number: throttling method, form factor, cold or warm cache, run count;
  - median and range over at least five runs wherever the session controls the run count;
  - what sits on the critical path before the LCP paint: render-blocking CSS, font loading, script, hydration, and for `/experience` the server render and its data reads.
- **Classification:** for each page, name the dominant source of delay — server, data or rendering · CSS or font · network or resource · framework or runtime · client hydration · or another measured source — with the numbers that show it, and say where the four pages differ.
- **Acceptance:**
  - [ ] The LCP element is identified on all four pages, in every environment measured
  - [ ] Sub-part timings are reported with run count, median and range
  - [ ] Each page's dominant delay is named with its evidence; an unexplained remainder is reported as unexplained
  - [ ] The CI figure is reproduced locally, or the gap is reported
  - [ ] The protocol is written so a second person can rerun it and land inside the stated range
  - [ ] Remediation options are listed smallest first, each tied to a measured cause, with expected gain and cost — and none is applied
- **Deliverable:** `handoff/chore-lcp-diagnostic.md`, and nothing else — findings, the protocol, the options, open questions for the owner. Any driver script stays out of the repo.
- **Stop:** when the PR opens. No app code, CSS, config, dependency, CI job or `lighthouserc.json` change. If the measurement cannot be finished without changing the app, stop and report that instead.

### Pair 1 — `lane/recruiter` + `lane/ingestion`

Disjoint: app routes vs. `.github/workflows` and worker scripts.

**`lane/recruiter`** — all sections rendered semantically · print-friendly `/resume` · OG images · sitemap · structured data · facet chips with live counts from the query
Sub-branches: ~~`feat/recruiter-sections`~~, ~~`feat/recruiter-facets`~~, `feat/recruiter-resume-print`, `feat/recruiter-seo`
Two rows were delivered by the spine and need no sub-branch — **verified 2026-08-29 (`chore/post-gate-closeout`)**: `feat/recruiter-sections` by S6 + S8 (all six sections render semantically through two page files, with no per-section branch except `trophyCase`, an empty state, and exactly one `<h1>` per page), and `feat/recruiter-facets` by S5 + S6 (counts live from `getFacetCounts`, never hardcoded; "All" chip first; active state is `aria-current="page"` plus real CSS; empty sections degrade to `All (0)` under exact-array assertions). What is left in each is data (`hobby` / `interest` / `post` have no rows → `lane/content`) or media (→ `feat/admin-media`), not lane work. Optional polish still unclaimed: facet icons (six unused `design/assets/icons/facet-*.svg`) and an "Other" chip for the computed-but-unsurfaced `count.unfaceted` — `feat/recruiter-seo`'s session may pick these up. **The lane's real work is `feat/recruiter-resume-print` and `feat/recruiter-seo`.** **Both merged, and the lane reached `main` on 2026-10-01 — PR #48, squash `bda8136`** (`handoff/chore-recruiter-gate-closeout.md`).

**`lane/ingestion`** — Spotify OAuth + recently-played + top tracks/artists · Steam Web API playtime and achievements · IGDB metadata · Actions cron schedules · secrets handling · idempotent upserts · retry with backoff · structured logging · last-known-good serving
Sub-branches: `feat/ingest-spotify`, `feat/ingest-steam`, `feat/ingest-igdb`, `feat/ingest-scheduling`
**Spotify and Steam are both required** (owner, 2026-10-01). Neither is dropped to unblock the lane; what is undecided is how each is built, and those decisions are §8 rows. `feat/ingest-spotify` cannot be built as brief §6 specifies (§9), so it needs a compliant storage design first. `feat/ingest-steam` does not ship before `/privacy` is posted, because Steam's terms require a published policy naming the Steam data stored and the country it is stored in (§9). The lane waits for neither the LCP diagnostic nor the shell (§5.1).

### Pair 2 — `lane/console-shell` + `lane/admin`

Order is set by §5.1, not by this pairing. `lane/console-shell` starts once the LCP diagnostic (§5.2) is on `main` and does not wait for ingestion — only `feat/shell-play-activity` does. `lane/admin` starts when `lane/ingestion` → `main` has merged, so the two lanes of this pair overlap for the later part of the shell's life rather than from its start.
Overlap risk: shared components directory. Shell owns `app/(explorer)`, admin owns `app/admin`; any shared component change is raised before editing.

**`lane/console-shell`** — largest lane, most sub-branches:
`feat/shell-boot-profile` (≈1.2s boot, skippable, once per session; profile select) · `feat/shell-tile-grid` (tile row, All Software index, search) · `feat/shell-facets` · `feat/shell-detail-panel` · `feat/shell-trophy-full` · `feat/shell-play-activity` · `feat/shell-album-news` · `feat/shell-settings-notifications` (settings, notification rail, hold-HOME overlay; originates the desktop utility-rail container and the top status bar) · `feat/shell-gamepad` · `feat/shell-mobile`

**What each row reads, and whether it waits** (§5.1's rule applied; recorded 2026-10-01 by `chore/explorer-sequencing`; adds no sub-branch):

| Sub-branch                          | Reads                                                         | Waits on ingestion? | What a session does                            |
| ----------------------------------- | ------------------------------------------------------------- | ------------------- | ---------------------------------------------- |
| `feat/shell-boot-profile`           | Identity assets and the chime; no content                     | No                  | Runs in order                                  |
| `feat/shell-tile-grid`              | `entries`                                                     | No                  | Runs in order; renders no Storage-backed image |
| `feat/shell-facets`                 | `entries.facet`, `tags`                                       | No                  | Runs in order                                  |
| `feat/shell-detail-panel`           | `entries`, `entry_relations`, `links`, `tags`                 | No                  | Runs in order and ships without media          |
| `feat/shell-trophy-full`            | `entries` (certifications and awards), `status`               | No                  | Runs in order                                  |
| `feat/shell-play-activity`          | `ingest_spotify_*`, `ingest_steam_*`, IGDB titles and genres | **Yes**             | Waits for both start conditions below          |
| `feat/shell-album-news`             | `media` (Album) · `entries` of kind `post` (News)            | No                  | Waits for `feat/admin-media` on `main`         |
| `feat/shell-settings-notifications` | Client state only                                             | No                  | Runs in order                                  |
| `feat/shell-gamepad`                | Nothing — the Gamepad API                                    | No                  | Runs in order                                  |
| `feat/shell-mobile`                 | Whatever the rows above render                                | No                  | Runs in order                                  |

**Waiting rows.** A waiting row has start conditions. A session for a row whose conditions are not met does not begin: the lane moves to the next row in the list, and the skipped row is named as pending under `## Next` in that handoff. Starting one anyway is a §2.1 stop. Rows listed after a waiting row do not wait for it.

- **`feat/shell-play-activity`** starts only when both hold: `lane/ingestion` → `main` has merged, carrying `feat/ingest-spotify`, `feat/ingest-steam` and `feat/ingest-igdb`; and §8's read-layer row is settled — who owns, and where lives, the application read/query layer over `ingest_spotify_*` and `ingest_steam_*`. The app reads only through `lib/content/queries.ts` today, and no row assigns the ingest reads to any lane. That layer is not designed here.
- **`feat/shell-detail-panel` does not wait.** It ships its dates, stack, links and related entries with no media markup, no bucket constant, no URL helper and no guessed bucket name — the owner's S6 decision that media stays unrendered until `feat/admin-media` creates the bucket (`handoff/chore-prompts-spine-s6.md`). A session that cannot finish the row without media stops under §2.1 and does not add it.
- **`feat/shell-album-news` waits as a whole row** until `feat/admin-media` is on `main` — in practice until `lane/admin` → `main` has merged, since lanes see each other only through `main`. Album is media and nothing else. News waits with it at no visible cost: `post` rows do not exist until `lane/content`, and `/now` already renders its empty state.
- **Storage-backed images in the shell are rendered by `feat/shell-album-news` and by no earlier row** — Album, the detail panel's media slot, and any `entries.icon_asset` tile art.

**Motion, mapped onto the rows above** (owner's direction, recorded 2026-08-29 by `chore/post-gate-closeout`; adds no sub-branch and no scope). Hover/focus zoom on tiles, smooth scrolling, and the icon-display grammar → `feat/shell-tile-grid` · shape morphing and the click → detail transition → `feat/shell-detail-panel` · boot-sequence motion → `feat/shell-boot-profile` · touch and momentum behaviour → `feat/shell-mobile` · every other row inherits the conventions once set. The sources are annotated per sub-branch in the git-ignored `REFERENCES.md`; the borrowed-grammar reasoning is in `DESIGN.md`; the session guidance, tooling and capability limits are in `PROMPTS.md`. Three constraints decide what is achievable, and CI enforces them on every PR rather than at a phase gate: the **250,000 B script budget** is a Lighthouse assertion, so a motion library is an architectural decision and not a convenience — default to CSS transitions plus the Web Animations API; `prefers-reduced-motion` must disable boot, zoom and parallax (brief §2.2), which motion built on the duration tokens inherits for free and hardcoded durations break; and every easing and duration belongs in `design/tokens/tokens.css`, regenerated by `node design/tokens/build.mjs`.

**`feat/shell-tile-grid` — what shipped, as decisions** (owner, 2026-10-03; recorded by `chore/shell-tile-grid-contract`; adds no sub-branch, no scope and no behaviour). PR #53 (lane commit `a1cb832`) built this row on four answers the owner gave in its session and on eight readings its handoff recorded as "stated alongside the questions and not objected to". A reading that was not objected to is not a decision. The owner has now made each of them one, explicitly, and they are listed here so that a later row changes any of them only by a new decision.

- **The index.** Its visible name is "All Software" and its URL is `/all`. It lists every entry exactly once, in the global tile order (`compareRecency` across all kinds), and each row resolves to the entry's canonical URL. It reads `entries` through the existing query layer, does not wait on ingestion, and renders no Storage-backed image.
- **Search.** `/all?q=<words>`, answered by the server from an ordinary GET form. Matching is case-insensitive. The query is split on whitespace and every non-empty word must match — AND across words — anywhere in the searched text, so part of a word matches. The searched fields are `title`, `subtitle` and `summary` and nothing else: not the body, and not tags in this row. There is no fuzzy matching, no ranking, no reordering of results, no highlighting, no persistence of a search and no external search service. Search exists on `/all`, not on section pages. A `q` over 100 characters, or a repeated `q`, is refused with a 404.
- **Canonical and sitemap.** The bare `/all` has its own canonical URL and is in the sitemap. `/all?q=…` canonicalises to `/all` and is never listed separately. That Recruiter mode does not link to `/all` does not take it out of the sitemap: mode is presentation state, not a URL dimension.
- **Presentation.** `data-mode="explorer"` on `<html>` is the only Explorer selector. In Recruiter mode and with no mode, `/` is visually unchanged: the link to the index is in the server's markup and stays hidden and unfocusable outside Explorer mode. The home row stays the six top-level section tiles. In Explorer mode `/all` is the grid, over the same entries and the same canonical URLs — no second URL tree and no second dataset.
- **Motion.** A hovered or focused tile scales to `--scale-zoom` (1.06) and its neighbours recede to `--scale-recede` (0.97), on the existing `--duration-fast` and `--ease-glide`. Smooth scrolling in Explorer mode is the browser's own, and route changes stay instant. Zoom and smooth scrolling are both off under `prefers-reduced-motion`. No motion library.
- **CI coverage.** `lighthouserc.json` audits the bare `/all` beside the five URLs it already audited, under the same assertions and the same 250,000 B script cap. `/all?q=…` is not audited separately, because a search ships no client bundle of its own.

**Who originates the shell's frame** (owner, 2026-10-03; recorded by `chore/shell-tile-grid-contract`; adds no sub-branch, and gives an existing row scope that no row held). Brief §2.1 lists a bottom utility rail and a top status bar among the borrowed grammar, and no row named either. Both now belong to `feat/shell-settings-notifications`: it originates the desktop utility-rail container and the top status bar, beside the settings, notification rail and hold-HOME overlay it already owned. `feat/shell-gamepad` may later add its Controllers affordance to that rail, and `feat/shell-mobile` may adapt the shell to small screens; neither originates the rail or the bar. The circular All Software button that `feat/shell-tile-grid` shipped uses the rail's visual grammar and is not the rail: no utility rail and no status bar exists yet, and no row before `feat/shell-settings-notifications` builds one.

**`lane/admin`** — CRUD · media upload with enforced alt text · relation editor · manual ingestion trigger · reaction moderation · Supabase Auth guard, single user
Sub-branches: `feat/admin-auth`, `feat/admin-crud`, `feat/admin-media`, `feat/admin-relations`, `feat/admin-controls`

### Pair 3 — `lane/reactions` + `lane/content`

**`lane/reactions`** — anonymous emoji only · fixed server-side allowlist · salted `ip_hash`, never raw IP · edge rate limiting · RLS permitting anon `insert` and aggregate `select` only · optimistic UI with server reconciliation · console-style toast · stretch: meta-trophy at N reactions

**`lane/content`** — populate remaining entries beyond BTT · hobbies, interests, followed teams as `tags` with `category = 'team'` · media with alt text

---

## 6. Phase 3 — Hardening (serial, solo)

Branch: `lane/hardening`.
axe scan · manual keyboard pass · screen reader pass · performance budget enforcement · error boundaries · `/privacy` · README · MIT license · full security audit against the §7 security block across all merged lanes.

Two of these do not simply wait for this phase. **`/privacy`:** `feat/ingest-steam` may not ship before it is posted (§5, §9), so it moves ahead of Phase 3 if Steam needs it first; which branch delivers it is an open §8 row. **Performance budget enforcement** takes the LCP diagnostic's findings (§5.2) as its input and presumes no remediation.

---

## 7. Acceptance checklist template

Copy into every lane → main PR. Unticked items block the merge.

**Function**

- [ ] Lane scope complete against the brief section it implements
- [ ] Every new entity resolves to a real, shareable URL
- [ ] Deep links land correctly in both modes

**Accessibility**

- [ ] Full keyboard operation, no trap, visible focus at all times
- [ ] Semantic HTML beneath any shell; landmarks and labels correct
- [ ] `prefers-reduced-motion` honored by anything animated in this lane
- [ ] Touch targets ≥44px where touch applies
- [ ] Contrast AA in both themes

**Security** *(every lane, no exceptions)*

- [ ] No secrets committed; all in Actions or Vercel secret storage
- [ ] RLS policies reviewed for any table this lane touches
- [ ] All input validated with Zod at the boundary
- [ ] No raw IP, no fingerprinting, no session replay, no identity tracking introduced
- [ ] Any new public endpoint is rate limited
- [ ] Dependencies added this lane reviewed for known advisories

**IP**

- [ ] Zero Nintendo or third-party assets in repo or bundle
- [ ] No prohibited term or mark in UI copy, metadata, filenames, or alt text

**Ops**

- [ ] Green CI including the database job (migrations + RLS tests on a fresh database per run); preview deploy live. Supabase Branching is not used (Free plan); previews share the hosted project.
- [ ] Upstream failure cannot break a page render

---

## 8. Blocked on owner

Ordered by when they block work.

| Needed by    | Item                                                                         |
| ------------ | ---------------------------------------------------------------------------- |
| Phase 0a end | Pick one of the three proposed identities                                    |
| Phase 0b     | Boot chime: commissioned, composed by agent, or omitted                      |
| Phase S3     | LinkedIn export file (Settings → Data Privacy → Get a copy of your data)   |
| Phase S3 end | Edit the normalized BTT record for accuracy                                  |
| `feat/ingest-steam` | Steam profile set to public. ~~or Steam ingestion is dropped~~ — Steam ingestion is required (owner, 2026-10-01), so dropping it is no longer an option |
| ~~Pair 1~~   | ~~Domain name and registrar~~ — **settled:** `kerwynjean.dev` (Porkbun). Canonical origin `https://kerwynjean.dev`; lands as `metadataBase` in `feat/recruiter-seo`. Vercel domain attach, DNS, auto-renew and 2FA remain the owner's to do. |
| ~~Pair 1~~   | ~~Resume contact block: the values `feat/recruiter-resume-print` prints~~ — **settled 2026-08-29:** email `kerwynjean123@gmail.com`, LinkedIn `https://www.linkedin.com/in/kerwynjean/`, GitHub `https://github.com/kjean230`, location New York, NY. Those four only — no phone, no street address, no personal-site URL. They ship in public HTML and the email is scrapable; the owner was told and chose to include it. This row was missing until the post-gate close-out, so an agent reaching it would have halted on §2.1's *ambiguity* trigger rather than this table. |
| ~~Pair 1~~   | ~~Vercel domain attach and DNS for `kerwynjean.dev`~~ — **settled 2026-08-30**, born settled: measured live, not reported. Apex `A` → `216.198.79.1`; certificate `CN=kerwynjean.dev` **issued by Let's Encrypt (`C=US, O=Let's Encrypt, CN=YR2`)** under Vercel's management, valid 2026-08-30 → 2026-11-28 — Vercel provisions it, Let's Encrypt signs it, so "issued by Vercel" is the wrong description. `https://kerwynjean.dev/` serves the real site (`<title>Kerwyn Jean</title>`). **Deployment Protection is off for Production:** `/nonexistent-path-check` returns a genuine **404** rendered by `app/not-found.tsx`, which Vercel SSO — 200 with `<title>Login – Vercel</title>` on every path — cannot produce. Protection is a separate setting and stays the owner's to keep off or re-enable; re-enabling it takes the public site down again. Still the owner's: `www` has **no DNS record** (apex only), plus registrar auto-renew and 2FA. |
| `lane/console-shell` | Merge the LCP diagnostic's PR (§5.2). Its handoff on `main` is the whole gate and opens the lane. Whether to schedule a remediation is a separate decision, made after reading the findings — it is **not** a condition for cutting `lane/console-shell` |
| `feat/ingest-spotify` | A storage design that complies with Spotify's Developer Terms (§9) — the accumulated-history design in brief §6 cannot be built. Spotify ingestion is required (owner, 2026-10-01), so dropping it is not one of the options |
| `feat/ingest-steam` | How the Valve Brand & Links clause is honoured (`handoff/chore-verify-terms.md`, open question 2). It puts a third party's name on a page of this site, and brief §2.1 makes that the owner's call |
| `feat/ingest-steam` | Which branch delivers `/privacy` ahead of Phase 3. Steam's terms require a posted policy naming the Steam data stored and the country it is stored in (§9) before that data ships; `/privacy` is an app route, and `lane/ingestion` owns none |
| `feat/shell-play-activity` | Assign the owner and location of the application read/query layer over `ingest_spotify_*` and `ingest_steam_*` — which lane and sub-branch writes it, and where it lives. The app reads only through `lib/content/queries.ts`, and no row assigns the ingest reads. Settle before the sub-branch begins (§5) |
| Pair 3       | Full entry inventory: orgs, dates, roles, links, which projects attach where |
| Pair 3       | Sports teams and interests for Hobbies                                       |

---

## 9. Verify before relying on

Free-tier terms and API policies change. Confirm at build time, not from memory:

- ~~Vercel Hobby non-commercial terms~~ — **settled 2026-08-30:** this site qualifies. Fair Use Guidelines (`https://vercel.com/docs/limits/fair-use-guidelines`, last updated 2026-07-29): "**Hobby teams** are restricted to non-commercial personal use only," where "Commercial usage is defined as any Deployment that is used for the purpose of financial gain of **anyone** involved in **any part of the production** of the project, including a paid employee or consultant writing the code." The five enumerated examples are payment collection, advertising a product or service for sale, being paid to build or host the site, affiliate linking as the site's primary purpose, and advertisements — **and donations count as commercial**. None applies. Job-seeking is not an enumerated example; Vercel's stated remedy for doubt is to contact support. Also read: the ToS (`https://vercel.com/legal/terms`, last updated 2026-06-01) §4 — "You shall only use the Services under a Hobby plan for your personal or non-commercial use" — and Vercel "may shut down and terminate projects or deployments on the Hobby plan without notice for any reason or no reason." Do not add a donate link, ads, or affiliate links to this domain.
- ~~Supabase free-tier pause behavior and the keep-warm assumption~~ — **settled 2026-08-30:** `https://supabase.com/docs/guides/platform/free-project-pausing`. "A Free plan project is considered inactive if it does not receive sufficient user database activity over the past week." Prevention: "Typically a few user requests to the database each day over the previous week is enough to keep the project from being paused," and "Generate a sufficient amount of activity by making API calls to your project" — so `keep-warm.yml`'s PostgREST read is qualifying activity **in kind**. **It is one request per day against a documented threshold of "a few," so it is thinner than the docs describe; the assumption is directionally right and not quantitatively proven.** A warning email arrives roughly a week before a pause, and a paused project is restorable for **1 year** (not the 90 days older troubleshooting pages state). The delete-when-ingestion-cron-lands plan still holds — that cron is a strictly larger daily read.
- ~~Spotify, Steam, and IGDB current API access terms~~ — **settled 2026-08-30**, and **Spotify's terms conflict with §6's architecture.** Spotify (`https://developer.spotify.com/terms`, effective 2025-05-15): "you may not store, aggregate or create compilations or databases of Spotify Content, other than as strictly necessary to operate your SDA," and caching is "limited to the *temporary* caching of: (1) metadata and cover art." §6's accumulated multi-month listening history in Postgres is precisely a database of Spotify Content and is not temporary — **`feat/ingest-spotify` cannot be built as specified**; rate limits are a rolling 30-second window, 429 + `Retry-After`, with new apps defaulting to development mode. Steam (`https://steamcommunity.com/dev/apiterms`) permits the shape and imposes duties: "You are limited to one hundred thousand (100,000) calls to the Steam Web API per day," "You will only retrieve Steam Data about a Steam end user as requested by the end user," and — binding on `/privacy` — "You will post a privacy policy regarding the use of nonpublic end user data" and "you will store the Steam Data in a country (or countries) identified in your privacy policy." IGDB (`https://api-docs.igdb.com/`): free for non-commercial use under the Twitch Developer Services Agreement, Twitch client ID + secret, 4 requests/second and 8 concurrent, and its FAQ says "Am I allowed to store/cache the data locally? Yes. In fact, we prefer if you store and serve the data to your end users."
- ~~IGDB cover-art usage rights before displaying box art~~ — **settled 2026-08-30: do not display box art.** No source read grants the right. The IGDB API docs contain no rights, copyright or terms-of-service text at all, and name the Twitch Developer Services Agreement (`https://legal.twitch.com/en/legal/developer-agreement/`, last modified 2024-12-04) as governing — which says "Do not store copies of Twitch Content or Program Materials, unless you: (a) obtain prior written authorization from Twitch …; (b) control the rights associated with such content; or (c) cache such information for only a twenty-four hour time period without further sharing it with third parties. Re-syndication and re-distribution of Program Materials or data as available from a Twitch API is prohibited." That flatly contradicts the IGDB FAQ's "we prefer if you store and serve the data," and **neither document states that IGDB or Twitch holds the right to sublicense a publisher's cover art to a downstream site.** `https://www.igdb.com/content-policy` and `https://www.igdb.com/api` are behind a Cloudflare challenge and returned 403 to every non-browser client, so IGDB's image policy could not be read. Unclear rights plus brief §2.1 being non-negotiable resolves one way: **metadata (titles, genres, dates, ids) only; no cover art, no box art, no screenshots**, until someone obtains written permission. `feat/ingest-igdb`'s "box art" wording in brief §6 is superseded by this line.
