# Handoff — chore-merge-queue

**Merged into:** `main`
**Plan row:** None. Both branches are chore branches with no parent lane and no BUILD_PLAN
sub-branch row. Per BUILD_PLAN §7, neither is a lane to main merge, so the lane acceptance
checklist does not gate them.

## Shipped

- `gh` v2.98.0 confirmed installed and authenticated as `kjean230` over SSH.
- `chore/docs-reconcile` opened as PR #1 and squash-merged into `main` as `25ff51e`, landing
  the two BUILD_PLAN cross-reference fixes, the reduced `PROMPTS.md` stop-rule section, and
  `handoff/chore-docs-reconcile.md`. `PROMPTS.md` is now tracked.
- `chore/references-note` rebased onto the updated `main` with no conflicts, as expected from
  the disjoint file sets: `.gitignore` and `CLAUDE.md` here versus `BUILD_PLAN.md` and
  `PROMPTS.md` there. Commit `9879100` replayed as `50f312a`.
- This handoff committed onto `chore/references-note` so the merge queue records itself
  without requiring a third branch.
- `chore/references-note` opened and squash-merged into `main`.
- Both chore branches deleted, remote and local.

## Deviated from plan

- The session brief listed installing `gh` as step 1. It was already installed between
  sessions, so only the auth check ran. Nothing was installed by this session.
- Merge order was followed exactly as specified: `chore/docs-reconcile` first, then the
  rebase, then `chore/references-note`. No force-push to `main` was required at any point,
  and `main`'s history was not rewritten.

## Deferred

- None. Both branches landed.

## Open questions for owner

Three contradictions remain recorded and unfixed. All three were explicitly out of scope for
this session and await an owner decision. Full detail is in `handoff/chore-docs-reconcile.md`.

1. **Phase 0 cannot satisfy §2.1's definition of done.** It requires green CI of every
   sub-branch, but CI does not exist until S1 (`feat/spine-ci`), and 0a and 0b run before
   Phase S. The same gap applies to auto-merge, which the S1 row is what enables on `lane/*`
   targets. The first two sessions runnable under the plan therefore have neither CI nor
   auto-merge. This is the one that blocks soonest: it lands on 0a, the next session.
2. **BUILD_PLAN §1 row 4** reads "Merge gate: green CI and a signed-off per-lane acceptance
   checklist" without naming which merge. Row 10 says sub-branch to lane auto-merges with no
   checklist. Row 4 predates row 10 and now reads as governing both.
3. **The BTT edit deadline is stated twice, differently.** §8 says `Phase S3 end`; the §4 S3
   row says `owner edits before S6`.

Two further contradictions are also recorded in `handoff/chore-docs-reconcile.md`: BUILD_BRIEF
§8 still lists CI/CD as a Phase 1 lane and still places the LinkedIn normalizer in the
ingestion lane, both contradicted by BUILD_PLAN §1. Both are contained by that section's
"Superseded" header.

## Next

Phase 0a, `feat/identity-proposals`, branched from `lane/identity` per BUILD_PLAN §3. Nothing
visual starts until 0b merges. Contradiction 1 above should be settled before 0a opens a PR,
since 0a cannot meet the §2.1 definition of done as currently written.
