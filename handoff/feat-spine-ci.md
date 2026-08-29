# Handoff — feat/spine-ci

**Merged into:** `lane/spine`
**Plan row:** BUILD_PLAN §4, S1

## Shipped
- Next.js 16.3.2 App Router + TypeScript scaffold at the repo root (create-next-app defaults: ESLint 9 flat config, no Tailwind, no `src/` — plan §5 owns `app/(explorer)` and `app/admin` at top level), package manager **npm** (owner decision this session). One placeholder route (`app/page.tsx`) proving the scaffold: KJ badge read at build time from `design/assets/mark/kj-badge.svg` (single source, no copy), name, "Under construction." — nothing invented. `app/icon.svg` is a copy of the badge serving as favicon (SVG text, no binary).
- `design/tokens/tokens.css` imported in `app/layout.tsx` as the global stylesheet. `app/app.css` is wiring only — token `var()` consumption plus the next/font bridge; `app/page.module.css` is all `var()`s. No design value is defined outside `design/tokens/`.
- Inter + JetBrains Mono via `next/font/google` (build-time self-hosting, zero committed binaries; Next 16 registers the real family names, so the token stacks match). OFL licence texts shipped at `public/fonts/OFL-Inter.txt` and `OFL-JetBrainsMono.txt`, served by the app.
- `lib/audio/boot-chime.ts` — typed port of the chime spec (`spec` + `play()`); deliberately imported nowhere. The `design/assets/chime/` copy stays authoritative. Six Vitest tests pin the spec's invariants and its verbatim numbers.
- Commands: `dev` / `build` / `start` / `lint` / `typecheck` (`next typegen && tsc --noEmit`) / `test` (`vitest run`; single file `npx vitest run lib/audio/boot-chime.test.ts`, single test add `-t "<name>"`) / `tokens:check` / `tokens:build`. CLAUDE.md's Commands section now records these.
- CI (`.github/workflows/ci.yml`): Lint · Typecheck · Test · Design tokens check (`build.mjs --check`, per the 0b deferral) · Build · Lighthouse budget (`lighthouserc.json`: a11y = 1.0 and perf/bp/seo ≥ 0.9 as errors, LCP ≤ 1500 ms as warn, script/total byte budgets; sized for the placeholder, tighten per-route later) · aggregate **`CI green`** job — the one required-status-check context.
- Repo policy via API: `allow_auto_merge` **on** (§2.1 now operable) · `delete_branch_on_merge` on · Dependabot alerts + security updates on · `.github/dependabot.yml` (npm + actions, weekly, minor/patch grouped) · secret scanning + push protection verified already enabled · new **`lane-protection`** ruleset (`refs/heads/lane/*`: deletion block + required check `CI green`; no review rule — auto-merge needs no human; no non-fast-forward rule — lanes rebase on main) · `main-protection` ruleset gains the same required check alongside its existing review/linear-history/squash rules.
- `.gitignore`: Node/Next block appended (`node_modules/`, `.next/`, `.vercel`, `.env*`, `.lighthouseci/`, etc.); the Python template's bare `lib/` entry **removed** because it silently ignored `lib/audio/`; `REFERENCES.md` and `launch.json` entries kept.
- Vercel: Hobby non-commercial terms verified at build time per plan §9 (fair-use guidelines: "non-commercial, personal use only" — this site qualifies; no checkout, no paid services). The owner had already linked the repo — `vercel[bot]` deployed `main` to Production before this PR opened, so PR preview deploys are automatic.

## Deviated from plan
- `typecheck` is `next typegen && tsc --noEmit`, not bare `tsc` — Next 16's generated route types (`LayoutProps`) don't exist until typegen runs.
- ESLint excludes `design/**` (self-contained Phase 0 artifacts; `build.mjs` is its own linter).
- Two small repo-setting additions beyond the row, both flagged in-session: `delete_branch_on_merge` (auto-merged `feat/*` branches would otherwise accumulate with no human in the loop) and Dependabot **security** updates (the row names Dependabot; alerts had to be enabled first).
- Lighthouse runs against the local production build in CI (filesystem reports, uploaded as an artifact), not against the Vercel preview — deterministic and secret-free. The Vercel check is deliberately **not** a required status check yet.

## Deferred
- Lighthouse budgets are placeholder-calibrated; tighten per-route (recruiter LCP < 1.5 s is a brief §9 acceptance target) once S6 renders real pages.
- Whether the Vercel preview check should become required on `lane/*`/`main` — decide once a few PRs have shown its flakiness profile.
- `next-env.d.ts` is gitignored per current create-next-app convention; revisit only if a clean clone's editor complains before `npm run dev`/`build` has run.
- The Python-template remainder in `.gitignore` is inert but noisy; prune opportunistically in a later chore, not worth a commit alone.

## Open questions for owner
- None blocking. FYI: the repo now auto-deletes merged PR head branches and has Dependabot version-update PRs targeting `main` weekly (they sit behind `CI green` + your required review).

## Next
S2 — `feat/spine-schema` on `lane/spine`: migrations for `entries`, `tags`, `entry_tags`, `entry_relations`, `media`, `links`, `reactions`, RLS policies, seed fixtures, local `docker-compose`, Supabase branch-per-PR wiring. Blocked-on-owner items: none for S2 itself (the LinkedIn export blocks S3, plan §8).
