# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo state

Pre-code. The repository currently holds two planning documents, an MIT license, and a Python-template `.gitignore`. There is no `package.json`, no build/lint/test tooling, and no application code yet.

- **Commands:** none exist yet. They arrive with spine sub-branch S1 (`feat/spine-ci`: Next.js App Router + TypeScript scaffold, lint, typecheck, test runner, Lighthouse CI). When that lands, replace this section with the real package scripts, including how to run a single test.
- The `.gitignore` is a Python template; it does not ignore `node_modules/`, `.next/`, `.vercel/`, or `.env*.local`. Extend it when scaffolding.

## Authority documents — read before doing anything

| File | Authoritative on |
|---|---|
| `BUILD_BRIEF.md` | *What*: scope, constraints, requirements, data model, stack |
| `BUILD_PLAN.md` | *When / where*: phase order, branch names, merge gates, acceptance checklist |

Where they disagree on order, branching, or lane composition, the plan wins. Scope decisions are settled — do not relitigate them. Brief §8 is superseded by plan §3–6; do not follow its ordering. Flag genuine blockers; ask before inventing content (entries, dates, orgs, team names). Items the owner must supply, and which phase each blocks, are tabulated in plan §8.

**`REFERENCES.md` — local only, never committed.** A working file that records where the interaction grammar in brief §2.1 and §5 was observed, annotated against the sub-branches each source informs. It is authoritative for interaction-grammar questions in Phase 0 and `lane/console-shell`. It is git-ignored by design: committing a list of source URLs would turn `DESIGN.md` from a provenance document into a side-by-side comparison exhibit, which undercuts the borrowed-grammar argument the IP posture rests on. Expect it to be **absent in a fresh clone** — that absence is normal, is not a blocker, and is not a reason to re-derive the references. It also carries a caution worth repeating here: the illustrative-use rationale that ticoverse.com applies to third-party console logos and box art **does not transfer to this project**. Brief §2.1 governs assets without exception.

## Architecture (as specified)

**Two renderers, one dataset, same URLs.**
- *Recruiter mode* — SSR, semantic HTML, works with JS disabled, canonical for SEO, default for `/`. A plain `/resume` route is reachable in one action from anywhere.
- *Explorer mode* — handheld-console shell (tile row, D-pad/keyboard/gamepad navigation, trophy case, play-activity charts, toasts). An enhancement over the working site, never the only way in.
- Both bind to a **shared route table** (spine S5) written before either renderer exists. Every tile resolves to a real, shareable URL; no state-only navigation.
- Ownership: the shell lives in `app/(explorer)`, admin in `app/admin`. Shared-component changes are raised before editing.

**Polymorphic `entries` table** (`kind` × `facet`) is the core; new section types must cost zero migrations. Zod schemas keyed on `kind` recover type safety at the app layer. `entry_relations` (`part_of` / `certifies` / `produced_by` / `related_to`) give multi-placement: the Break Through Tech AI worked example (brief §4.1) is one `experience` record that surfaces in Experience, Projects, and the trophy case with zero duplication — every consumer of the data must handle this. `status` (`unlocked` / `in_progress` / `archived`) drives trophy states. Facet-chip counts come from the query, never hardcoded.

**Ingestion is scheduled, not live-proxied.** GitHub Actions cron workers (Spotify, Steam, IGDB) normalize into Postgres; the site only ever reads its own DB and serves last-known-good on upstream failure. Workers are idempotent upserts with retry/backoff and structured logging, and fail loudly as Actions failures. The LinkedIn import is a one-shot pre-spine importer (S3), not a scheduled worker — there is no LinkedIn API, and scraping is off the table.

**Auth is admin-only** (Supabase Auth, one user, guards `/admin`). **Reactions are anonymous emoji only:** fixed server-side allowlist, salted `ip_hash` (never raw IP), edge rate limit, RLS allowing anon `insert` + aggregate `select` only.

**Stack** (decided, brief §3): Next.js App Router + TypeScript · Vercel Hobby · Supabase Postgres / Auth / Storage · GitHub Actions cron (not Vercel Cron) · Zod at every boundary · cookie-free analytics. Cost target $0 + domain. Never commit binaries; tile art and screenshots go to Supabase Storage.

## Non-negotiable constraints

- **IP (brief §2.1):** borrow interaction grammar only. No Nintendo / Disney / Capcom / Square Enix assets, no Joy-Con silhouettes or red/blue pairing, no Switch wordmark, chime, or typefaces, no rendered console hardware, and the phrase "Nintendo Switch" nowhere in UI copy, metadata, filenames, or alt text. Original wordmark, palette (not red/blue), hand-drawn SVG icons, original chime. `DESIGN.md` must record the borrowed-grammar vs. protected-expression distinction.
- **Accessibility (brief §2.2):** full keyboard operation (arrows navigate, Enter = A, Escape = B, roving `tabindex`, visible focus ring, no traps), semantic HTML beneath the shell, `prefers-reduced-motion` disables boot / zoom / parallax, sound off by default, WCAG 2.2 AA in both themes, touch targets ≥44px.
- **Privacy (brief §2.3):** no visitor accounts, no email collection, no fingerprinting, no session replay, no IP-to-company enrichment. Ship `/privacy`.

## Workflow

**Branching (plan §2):** `main` is protected. `lane/<name>` is long-lived, one per lane, rebased on `main` after every `main` merge. `feat/<lane>-<slice>` is a stacked sub-branch that merges into its lane. Sub-branch → lane auto-merges on green CI with no human step; lane → `main` needs green CI **and** the owner-signed acceptance checklist (plan §7, including its security and IP blocks) — that is the only human merge gate. One agent per lane; never two agents on one lane branch. Every PR body links the lane checklist.

**Stopping:** stop when the PR opens — see `BUILD_PLAN.md` §2.1, which is canonical for stopping behavior and is not summarized here.

**Phase order (plan §3–6):** Phase 0 identity (0a proposes three complete identities → **hard stop for the owner's pick** → 0b tokens, icons, wordmark, chime, `DESIGN.md`) → Phase S spine (S1–S8, serial, on `lane/spine`) → Phase 1 lane pairs, two concurrent maximum, paired for file disjointness (recruiter + ingestion → console-shell + admin → reactions + content) → Phase 3 hardening. Nothing visual starts until 0b merges.

**Verify at build time, not from memory (plan §9):** Vercel Hobby non-commercial terms, Supabase free-tier pause behavior and the nightly keep-warm assumption, Spotify / Steam / IGDB API access terms, IGDB cover-art usage rights.
