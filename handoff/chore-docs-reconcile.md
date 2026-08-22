# Handoff — `chore/docs-reconcile`

Documentation reconciliation. No product code. Not a lane branch; no parent lane, so the
§2.1 sub-branch stop rule does not formally govern it — the session still stops at PR-open.

Base: `main` @ `f641756`.

Completed across two sessions on this branch: the initial reconciliation pass, then a
follow-up session that finished item 4 once `PROMPTS.md` was supplied. No new branch was
cut for the follow-up — it closes work already scoped here.

---

## State found on arrival

Items 1, 3, and 5 were **already applied** in `BUILD_PLAN.md` before this branch was cut.
This session verified them rather than authoring them:

- §2's last bullet already cited §7 (item 1).
- §1 row 10, the §2 bullet, §2.1, and the S1 row already specified auto-merge (item 3).
- §2.1 already carried the ambiguity trigger (item 5).

Confirmed with the owner that the auto-merge wording on disk is the intended resolution of
item 3's unfilled bracket. No mechanism was changed.

## Changes made

| Item | File | Change |
|---|---|---|
| 2 | `BUILD_PLAN.md` §3 / 0b | `see owner input §7.4` → `see owner input §8`. §7 is the checklist template and has no subsections; owner input is §8. |
| 2 | `BUILD_PLAN.md` §6 | `full security audit against §6 checklist` → `against the §7 security block`. §6 is Hardening itself — the reference pointed at its own section. |

Two lines changed in the first session. Nothing else was edited.

### Follow-up session — item 4 completed

`PROMPTS.md` was added to the repo root untracked and is now tracked on this branch.

| Item | Change |
|---|---|
| 1 | `## Stop rule` reduced to one load-bearing sentence plus a pointer to `BUILD_PLAN.md` §2.1, matching the `CLAUDE.md` treatment. The handoff-file format, the `/clear` between-sessions guidance, and the resume instructions were kept — they are `PROMPTS.md`-specific operational content, not duplicates of §2.1. |
| 1 | Dropped the `**Never in one session:**` paragraph — a second statement of the same rule, already covered by §2.1 and §2. |
| 3 | Two in-template pointers reading `the format in the Stop rule section below` → `the handoff format in the Stop rule section below`, so the pointer names what it actually resolves to now that the section is reduced. |
| 4 | The header line and both template blocks changed from reading the brief and plan "in Project knowledge" to reading them in the repo, and now state that the repo copy is authoritative. |

## Verified, no change needed

- **Item 1** — already correct (§7).
- **Item 3** — mechanism stated in §1 row 10 and §2; §2.1 adds "branch from `lane/<name>`,
  never from another `feat/` branch", which closes the S1/S2 ordering hole.
- **Item 4** — §2.1 is marked **Canonical**; `CLAUDE.md` carries one load-bearing sentence
  plus a pointer, not a copy. Re-verified in the follow-up session: it had landed as the
  first session described, so no rework was needed.
- **Item 5** — present in §2.1 as a distinct trigger, separated from §8 items by the
  known-gap vs unknown-gap distinction.
- **Cross-reference sweep** — every `§n` in `BUILD_PLAN.md`, `BUILD_BRIEF.md`,
  `CLAUDE.md`, `PROMPTS.md`, and this handoff resolves to a real section (76 refs checked). `DESIGN.md` is referenced in 6 places and does
  not exist; it is a Phase 0b deliverable, not a stale pointer.

## Item 6 — §8 deadlines vs phase ordering

Seven of eight rows match. One mismatch, **reported not fixed** (no new deadline invented):

> §8 row: `Phase S3 end | Edit the normalized BTT record for accuracy`
> §4 S3 row: `output committed as editable seed data · **owner edits before S6**`

Two different deadlines for the same owner action — S3 end vs. before S6. S6 is the later
and more permissive of the two. Owner should pick one.

## Left undone

None. `PROMPTS.md` — the only item the first session left open — was completed in the
follow-up session recorded above.

## Contradictions found, out of scope, not fixed

1. **`BUILD_BRIEF.md` §8 lists CI/CD as Phase 1 lane #4**; plan §1 derived consequences
   makes CI/CD the first spine sub-branch (S1). Contained by the "Superseded" header.
2. **`BUILD_BRIEF.md` §8 places the LinkedIn export normalizer inside the Ingestion lane**;
   plan §1 makes it pre-spine S3 and explicitly not part of that lane. Same header.
3. **`BUILD_PLAN.md` §1 row 4** reads "Merge gate: green CI **and** a signed-off per-lane
   acceptance checklist" without qualifying which merge. Row 10 says sub-branch → lane
   auto-merges with no checklist. Row 4 predates row 10 and now reads as applying to both.
   Fixing it would have meant rewriting a locked-decision row, which was out of scope.
4. **§2.1's definition of done cannot be met by Phase 0.** It requires "Green CI: lint,
   typecheck, tests" of *every* sub-branch, but CI does not exist until S1 (`feat/spine-ci`),
   and Phase 0's 0a and 0b run before Phase S. The same gap applies to auto-merge: §2.1 says
   to open every sub-branch PR with auto-merge enabled, yet the S1 row is what enables
   auto-merge on `lane/*` targets. 0a and 0b therefore have neither CI nor auto-merge.
   Found in the follow-up session; fixing it would change phase ordering, which is out of scope.
5. **`PROMPTS.md`'s template omits auto-merge.** Its `Then:` line says "open a PR into
   [parent lane branch]" where §2.1 says to open it "with auto-merge enabled". The template
   is not wrong, only silent, and it now points at §2.1 as canonical — but an agent pasting
   the block without following the pointer would open a PR that never merges. Template block
   contents were out of scope beyond the named cross-references.
