# Handoff — chore/spine-s3-closeout

**Merged into:** `lane/spine`
**Plan row:** none — a chore closing S3 loose ends before S4. No plan row, no app code, no schema change, no new dependencies.

## Shipped
- **Merged S3 verified (2026-08-25).** `lane/spine` = `ad1dea6` (PR #10 squash-merge, CI green). On a fresh compose database: `npm run db:reset` applied both migrations, `seed.sql`, then `seed.content.sql`; `npm run db:test` 40/40 (31 RLS + 9 content); `npm test` 46/46; `npm run lint` 0 problems; `npm run typecheck` clean; `npm run tokens:check` ok.
- **`supabase/seed.content.sql` is byte-identical to PR #10** (`git diff ad1dea6 -- supabase/seed.content.sql` empty) — the owner has not edited it yet. Consequently: no CHECK-constraint findings to report, nothing was changed in the seed, and it was **not** loaded to the hosted project (still 0 content rows, by design).
- **Documentation consistency pass.** Every `npm run …` named in CLAUDE.md, PROMPTS.md, and the handoffs exists in `package.json` (15 scripts; the one `npm audit` mention is npm's own command). Every backticked file name resolves to a tracked path; the names that do not are all mentioned *as absent*: `.github/workflows/keep-warm.yml` (proposed, owner's call), `middleware.ts` / `proxy.ts` / `utils/supabase/` (recorded as not present), `Certifications.csv` (absent from the export), the five export CSVs (never in the repo), `src/` and `launch.json` (`.gitignore` entries), `.lighthouseci/` (ignored output). The three older handoffs' "Next" sections now carry **"Done 2026-08-25 (PR #10), see `handoff/feat-spine-linkedin-import.md`."** CLAUDE.md needed no change (S3 already updated it; it points at the brief and plan rather than restating them). `feat-spine-linkedin-import.md`'s Deferred list has nothing resolved yet, so nothing is struck through.
- **Secret / PII grep over `origin/lane/spine`, case-insensitive, reported in full:** `gmail` 0 files · `@glic` 0 · `@fordham.edu` 0 · `linkedin.com/in/` 0 · `nintendo` 7 files, every hit being the constraint itself or its enforcement — `BUILD_BRIEF.md` (lines 30, 39, 193, 258), `BUILD_PLAN.md` (89, 198), `CLAUDE.md` (59), `PROMPTS.md` (89–90), `design/tokens/build.mjs` (`PROHIBITED_TERMS`), `scripts/linkedin/import.mjs` (output guard), `scripts/linkedin/sql.test.ts` (assertion). Zero occurrences in UI copy, metadata, filenames, alt text, or seed content. (Once this handoff merges, the same grep will match this paragraph — the search terms themselves, not a value; exclude `handoff/chore-spine-s3-closeout.md` or read the hit.)
- **No loose files.** The tracked tree holds no `.env*`, `REFERENCES.md`, export CSV, `.zip`, scratch file, or `.DS_Store`. Present locally and git-ignored only: `.env`, `.env.local`, `.vercel/`, `.vscode/`, `REFERENCES.md`, `supabase/.temp/`, `supabase/.branches/` — none staged, none read.
- **Memory hygiene** (persistent memory for this project, outside the repo): the LinkedIn-export entry and its index line now give the real path (a directory whose name ends in `.zip`); the BTT-credential entry now records what S3 shipped (`links` row kind `profile` + `metadata.credential_url`, fields marked REVIEW); the commit-attribution rule was checked against the last three commits and left unchanged. No entries added.

## Deviated from plan
- None against the plan. Against the task text: its bracketed fields ("[edited / not yet edited]", item 5's "[Delete this item if you are not ready]") were left unfilled. Resolved from the repository instead of guessing: the seed is unchanged since PR #10, so it was treated as *not edited* and item 5 as deleted. If edits exist somewhere other than this working tree, they are not in the repo.

## Deferred
- Owner edits to `supabase/seed.content.sql` — all 12 items in `handoff/feat-spine-linkedin-import.md` "Open questions" remain open.
- One-time hosted load of the edited seed (`psql "$DATABASE_URL" -f supabase/seed.content.sql` with `DATABASE_URL` parsed from the git-ignored `.env`, then an allowlisted row-count check) — after the edits, before S6's preview. Not done here because the seed is unedited.
- Unchanged owner decisions: keep-warm workflow; BUILD_PLAN §7 Ops wording (`handoff/chore-spine-hosted-config.md` open questions 1–2).
- `links.kind` `credential` value (one-line migration, whoever needs it first); `Skills.csv` / `Courses.csv` / Profile content → `lane/content`.

## Open questions for owner
1. Edit the seed per the S3 handoff list, then say so — the hosted load is a one-command chore, or run it yourself as above. Until then the deployed site has no content rows, which S6 will make visible.
2. Nothing else new; the keep-warm and §7-wording decisions stand as recorded.

## Next
S4 — `feat/spine-api` on `lane/spine`: Zod schema per `kind`, query layer for tile row, detail, facet counts, relation traversal, caching and revalidation. **Done 2026-08-26 (PR #12), see `handoff/feat-spine-api.md`.**
