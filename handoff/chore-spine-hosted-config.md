# Handoff — chore/spine-hosted-config

**Merged into:** `lane/spine`
**Plan row:** none — closes the loose ends left by `chore/spine-hosted-apply` (PR #8). No plan row, no app code, no schema change.

## Shipped
- **`config push` fixed (2026-08-25).** Diagnosis: `supabase/config.toml` omitted `[storage]`, so the CLI's own default `[storage.vector] enabled = true` was pushed and the platform answered `402: upgrade the project to a paid tier to enable vector buckets`. (`config push` has no `--dry-run`; the CLI rejects the flag.) Fix: an explicit `[storage]` block pinning `[storage.vector] enabled = false` and `[storage.analytics] enabled = false`, with a comment naming the cause; the `[auth]` values S2 set are untouched. `npx supabase@latest config push --yes` now reports API, DB, Auth and Storage **up to date**.
- **Hosted auth verified** via the Management API, projected to an allowlist of keys: `disable_signup` true · `password_min_length` 12 · `mailer_autoconfirm` false (confirmations on) · anonymous sign-ins off · manual linking off · `site_url` `http://127.0.0.1:3000` (left as-is — no domain supplied). Storage: `vectorBuckets.enabled` false, `imageTransformation.enabled` false, `fileSizeLimit` 50 MiB. `/postgrest` was **not** read.
- **Vercel environment variables (2026-08-25).** CLI logged in as `kjean230`, project already linked (`.vercel/`, ignored). The project had no variables. `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` added to **Production** and **Preview** from `.env` — both public values. Gotcha for the record: the CLI defaults `NEXT_PUBLIC_*` values to *secret* visibility, which Vercel rejects on Production/Preview (`invalid_visibility`); `vercel env add <name> <target> --value … --yes --no-sensitive` is the working form. Nothing else was added.
- **Secret re-scan clean.** `git grep` over `origin/lane/spine` found nothing; the filesystem grep (every file outside `node_modules`/`.next`/`.git` opened, `.env` excluded) matched only the git-ignored `.env.local` (new, holds credentials) and `supabase/.temp/pooler-url`. No secret value exists in any tracked or unignored file.
- **`.gitignore`:** the owner's uncommitted `.env.local` line (found in the working tree on `lane/spine`) is committed here. It is redundant — `.env*` on the line above already ignores `.env.local` (`git check-ignore -v` resolves to the later line only because later rules win) — but explicit is harmless and keeps the owner's intent visible.
- **Docs:** `handoff/chore-spine-hosted-apply.md` Deferred/Open questions annotated (JWT secret revoked and legacy keys disabled by the owner; config push resolved; Vercel done; migration path = GitHub integration on `main`). CLAUDE.md Database bullet corrected: hosted migrations arrive via the integration on merge to `main`, not by hand; `config push` is the settings path.

## Deviated from plan
- None. Against the task list: step 1 asked for `config push --dry-run`; the flag does not exist, so the edit was pushed directly and verified after (the push is idempotent and reported every service up to date).

## Deferred
- `[auth] site_url` and `additional_redirect_urls` still point at `127.0.0.1:3000`. Set them when the domain exists (plan §8, Pair 1) — one `config.toml` edit + `config push`, with the admin lane (`feat/admin-auth`), which is the first consumer.
- Keep-warm workflow — **proposed, not added** (owner's call; see Open questions 1).

## Open questions for owner
1. **Keep-warm before Pair 1?** Project created 2026-08-24; Free projects pause after ~7 days of low database activity, restorable for a year with one click. Until the deployed site or the ingestion cron queries the database, expect a pause around 2026-08-31. If you want to prevent it, the smallest workflow is one file, `.github/workflows/keep-warm.yml`: `on: schedule: - cron: "17 9 * * *"` (daily) + `workflow_dispatch`, one job with a single step: `curl --fail -s "$SUPABASE_URL/rest/v1/reaction_counts?select=entry_id&limit=1" -H "apikey: $SUPABASE_KEY" -H "Authorization: Bearer $SUPABASE_KEY"`, with `SUPABASE_URL` and `SUPABASE_KEY` from **repository variables** (`vars.NEXT_PUBLIC_SUPABASE_URL`, `vars.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — public, not secrets). It reads the aggregate view as `anon`, which the S2 grants allow, and touches nothing else. Pair 1's ingestion cron makes it redundant; drop it then. Say the word and it goes in as its own chore.
2. Proposed BUILD_PLAN §7 Ops wording (still unapplied; owner's file): replace "Green CI, preview deploy live on an isolated database branch" with "Green CI including the database job (migrations + RLS tests on a fresh database per run); preview deploy live. Supabase Branching is not used (Free plan); previews share the hosted project." Matching brief §9: "Preview deploy per PR; database isolation is the CI database job."

## Next
S3 — `feat/spine-linkedin-import` on `lane/spine`. Not started; the LinkedIn export was not touched in this session. **Done 2026-08-25 (PR #10), see `handoff/feat-spine-linkedin-import.md`.**
