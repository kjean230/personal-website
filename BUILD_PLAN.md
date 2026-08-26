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
lane/<name>                 long-lived; one per lane; rebased on main after every main merge
feat/<lane>-<slice>         stacked sub-branch; branched from and merged into its lane branch
```

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

### Pair 1 — `lane/recruiter` + `lane/ingestion`

Disjoint: app routes vs. `.github/workflows` and worker scripts.

**`lane/recruiter`** — all sections rendered semantically · print-friendly `/resume` · OG images · sitemap · structured data · facet chips with live counts from the query
Sub-branches: `feat/recruiter-sections`, `feat/recruiter-facets`, `feat/recruiter-resume-print`, `feat/recruiter-seo`

**`lane/ingestion`** — Spotify OAuth + recently-played + top tracks/artists · Steam Web API playtime and achievements · IGDB metadata · Actions cron schedules · secrets handling · idempotent upserts · retry with backoff · structured logging · last-known-good serving
Sub-branches: `feat/ingest-spotify`, `feat/ingest-steam`, `feat/ingest-igdb`, `feat/ingest-scheduling`

### Pair 2 — `lane/console-shell` + `lane/admin`

Runs after Pair 1 merges, because Play Activity depends on ingested data existing.
Overlap risk: shared components directory. Shell owns `app/(explorer)`, admin owns `app/admin`; any shared component change is raised before editing.

**`lane/console-shell`** — largest lane, most sub-branches:
`feat/shell-boot-profile` (≈1.2s boot, skippable, once per session; profile select) · `feat/shell-tile-grid` (tile row, All Software index, search) · `feat/shell-facets` · `feat/shell-detail-panel` · `feat/shell-trophy-full` · `feat/shell-play-activity` · `feat/shell-album-news` · `feat/shell-settings-notifications` (settings, notification rail, hold-HOME overlay) · `feat/shell-gamepad` · `feat/shell-mobile`

**`lane/admin`** — CRUD · media upload with enforced alt text · relation editor · manual ingestion trigger · reaction moderation · Supabase Auth guard, single user
Sub-branches: `feat/admin-auth`, `feat/admin-crud`, `feat/admin-media`, `feat/admin-relations`, `feat/admin-controls`

### Pair 3 — `lane/reactions` + `lane/content`

**`lane/reactions`** — anonymous emoji only · fixed server-side allowlist · salted `ip_hash`, never raw IP · edge rate limiting · RLS permitting anon `insert` and aggregate `select` only · optimistic UI with server reconciliation · console-style toast · stretch: meta-trophy at N reactions

**`lane/content`** — populate remaining entries beyond BTT · hobbies, interests, followed teams as `tags` with `category = 'team'` · media with alt text

---

## 6. Phase 3 — Hardening (serial, solo)

Branch: `lane/hardening`.
axe scan · manual keyboard pass · screen reader pass · performance budget enforcement · error boundaries · `/privacy` · README · MIT license · full security audit against the §7 security block across all merged lanes.

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
| Pair 1       | Steam profile set to public, or Steam ingestion is dropped                   |
| Pair 1       | Domain name and registrar                                                    |
| Pair 3       | Full entry inventory: orgs, dates, roles, links, which projects attach where |
| Pair 3       | Sports teams and interests for Hobbies                                       |

---

## 9. Verify before relying on

Free-tier terms and API policies change. Confirm at build time, not from memory: Vercel Hobby non-commercial terms · Supabase free-tier pause behavior and the keep-warm assumption · Spotify, Steam, and IGDB current API access terms · IGDB cover-art usage rights before displaying box art.
