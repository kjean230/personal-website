# Handoff — `chore/references-note`

Documentation only. No product code. Not a lane branch; no parent lane.

Base: `main` @ `f641756`.

## Shipped

- `.gitignore` — added `REFERENCES.md` with a one-line comment pointing at `CLAUDE.md`.
  Verified with `git check-ignore -v`: matches at `.gitignore:221`. The file is untracked,
  unstaged, and was never tracked in history, so no unstage or `git rm --cached` was needed.
- `CLAUDE.md` — new paragraph after the authority-documents block recording that
  `REFERENCES.md` may be present locally, is authoritative for interaction-grammar
  questions in Phase 0 and `lane/console-shell`, is never committed, and is expected to be
  absent in a fresh clone — an absence that is neither a blocker nor a reason to re-derive
  the references. The paragraph also carries the ticoverse.com caution: its illustrative-use
  rationale for third-party console logos and box art does not transfer here, and
  `BUILD_BRIEF.md` §2.1 governs assets without exception.

## Deviated from plan

- None on substance. One process note: `gh` is not installed in this environment, so the PR
  could not be opened from the session. The branch is pushed and the compare URL was handed
  to the owner, matching how the PR step was handled on `chore/docs-reconcile`.

## Deferred

- None.

## Verification

- `git status` shows `REFERENCES.md` no longer listed — it is ignored, not merely untracked.
- The commit contains exactly two files: `.gitignore` and `CLAUDE.md`, plus this handoff.
  `REFERENCES.md` is not in the tree at any point.

## Open questions for owner

- None.

## Notes

`REFERENCES.md` was read locally to confirm the ticoverse.com caution exists and says what
the CLAUDE.md paragraph now attributes to it. Its contents — including source URLs — were
not copied into any committed file.

## Next

Not part of a lane sequence. `chore/docs-reconcile` remains open and unmerged; both chore
branches target `main` independently and do not conflict — they touch disjoint files except
`CLAUDE.md`, which `chore/docs-reconcile` does not modify.
