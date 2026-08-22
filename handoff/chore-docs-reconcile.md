# Handoff — `chore/docs-reconcile`

Documentation reconciliation. No product code. Not a lane branch; no parent lane, so the
§2.1 sub-branch stop rule does not formally govern it — the session still stops at PR-open.

Base: `main` @ `f641756`.

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

Two lines changed. Nothing else was edited.

## Verified, no change needed

- **Item 1** — already correct (§7).
- **Item 3** — mechanism stated in §1 row 10 and §2; §2.1 adds "branch from `lane/<name>`,
  never from another `feat/` branch", which closes the S1/S2 ordering hole.
- **Item 4** — §2.1 is marked **Canonical**; `CLAUDE.md` carries one load-bearing sentence
  plus a pointer, not a copy.
- **Item 5** — present in §2.1 as a distinct trigger, separated from §8 items by the
  known-gap vs unknown-gap distinction.
- **Cross-reference sweep** — every `§n` in `BUILD_PLAN.md`, `BUILD_BRIEF.md`, and
  `CLAUDE.md` resolves to a real section. `DESIGN.md` is referenced in 6 places and does
  not exist; it is a Phase 0b deliverable, not a stale pointer.

## Item 6 — §8 deadlines vs phase ordering

Seven of eight rows match. One mismatch, **reported not fixed** (no new deadline invented):

> §8 row: `Phase S3 end | Edit the normalized BTT record for accuracy`
> §4 S3 row: `output committed as editable seed data · **owner edits before S6**`

Two different deadlines for the same owner action — S3 end vs. before S6. S6 is the later
and more permissive of the two. Owner should pick one.

## Left undone

- **PROMPTS.md (item 4, second half).** The file does not exist in the repo, in git
  history, or anywhere under `~` to depth 4. Owner said it exists elsewhere and would
  supply the path; the path did not arrive this session. Its stop-rule copy is therefore
  **not** reduced to a pointer and remains a third copy that can drift from §2.1.

## Contradictions found, out of scope, not fixed

1. **`BUILD_BRIEF.md` §8 lists CI/CD as Phase 1 lane #4**; plan §1 derived consequences
   makes CI/CD the first spine sub-branch (S1). Contained by the "Superseded" header.
2. **`BUILD_BRIEF.md` §8 places the LinkedIn export normalizer inside the Ingestion lane**;
   plan §1 makes it pre-spine S3 and explicitly not part of that lane. Same header.
3. **`BUILD_PLAN.md` §1 row 4** reads "Merge gate: green CI **and** a signed-off per-lane
   acceptance checklist" without qualifying which merge. Row 10 says sub-branch → lane
   auto-merges with no checklist. Row 4 predates row 10 and now reads as applying to both.
   Fixing it would have meant rewriting a locked-decision row, which was out of scope.
