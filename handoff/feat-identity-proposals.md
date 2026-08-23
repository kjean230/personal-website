# Handoff — feat/identity-proposals

**Merged into:** `lane/identity`
**Plan row:** BUILD_PLAN §3, 0a

## Shipped
- `design/identity-proposals/index.html` — one static, self-contained comparison page (inline CSS and SVG, no JS, no external requests, system font stack). Three complete, distinct identities side by side, each with its own column.
- **A · Warm & rounded** — teal primary, amber secondary, warm neutrals; KJ as one continuous rounded stroke (the K's lower leg runs into the J's hook); 2 px monoline icons, round caps; Spring-lite `cubic-bezier(0.34, 1.4, 0.64, 1)`, 120–220 ms; two ascending marimba notes.
- **B · Electric & crisp** — violet primary, lime secondary, cool neutrals; KJ on a 5×7 + 4×7 cell grid with 1-unit optical gaps and chamfered corners; filled chamfered icons; Hard-snap `cubic-bezier(0.2, 0, 0, 1)`, 80–140 ms; one square-wave blip with a downward tail.
- **C · Ink & paper** — ink/paper neutrals, saffron accent, slate secondary; KJ as heavy slab forms with stencil cuts; 3 px heavy-outline icons, square caps; Glide `cubic-bezier(0.16, 1, 0.3, 1)`, 180–320 ms; low sine thud plus a bright click. On paper every accent fill carries a 2 px ink outline; on ink, saffron stands alone.
- Per identity: the KJ mark bare and as a tile badge on both surfaces · palette with hexes (primary, on-primary, secondary, on-secondary, surface, surface-raised, text, text-muted, success, warning, error, info, on-state; C adds primary-text for light) in light and dark · trophy-state mapping locked / in_progress / unlocked · three sample icons drawn from scratch (trophy, settings gear, activity bars) on both surfaces · easing plot plus a CSS hover/focus demo that honours `prefers-reduced-motion` · one-line chime concept · a flat in-context strip in both themes (status bar with the mark top-left and clock right, tile row using brief §4.3 section names, circular utility rail, A Select / B Back hints — no device rendering).
- WCAG 2.2 AA contrast table per identity: 16 text-on-surface pairs × light and dark, **all pass 4.5:1**, plus two informative non-text rows (1.4.11, 3:1). One informative note: C's saffron fill on paper is 1.74:1 bare; C's rule that accent fills on paper always carry a 2 px ink outline is documented in a footnote, and text on that fill is ink at 9.27:1.
- Ratios, CSS custom properties, swatch markup and table rows were all generated from one palette source by a throwaway Python script using the WCAG relative-luminance formula, so the specimen colours and the reported numbers cannot disagree. The script is not committed.
- `BUILD_PLAN.md` §3 — one line recording that Phase 0 predates CI and auto-merge, its PRs are merged by hand by the owner, and CI items in §2.1 and §7 are N/A for this phase.
- `CLAUDE.md` — repo-state sentence made accurate; `design/` recorded as the home of static design artifacts; one clause in the Branching paragraph pointing at the Phase 0 carve-out in plan §3.

## Deviated from plan
- The PR is opened **without auto-merge** and will be merged by hand. The repo has `allow_auto_merge: false`, `main` is unprotected, and no CI exists until S1, so §2.1's green-CI item and auto-merge mechanism cannot be satisfied by 0a. The owner chose manual merge plus the one-line BUILD_PLAN §3 carve-out; that resolves contradiction #1 in `handoff/chore-merge-queue.md`. Contradictions #2 (§1 row 4 wording) and #3 (BTT edit deadline) were not touched.
- The wordmark is a **KJ monogram** in all three identities, geometrically distinct per identity, rather than three console names — owner decision this session (brief §10 item 4). The identities are labelled A / B / C with descriptive subtitles; no names were invented.
- The Session 1 block in `PROMPTS.md` adds to the §3 row: three sample icons per identity, a named easing with a duration range, and contrast results in both themes. All delivered; nothing beyond it.
- `lane/identity` did not exist on the remote. It was created from `main` @ `3d16837` and pushed before the sub-branch was cut, so the PR has a real base.

## Deferred
- None within 0a. Whether the page keeps all three identities after the pick or is pruned to the chosen one as provenance is 0b's call.

## Open questions for owner
- **The pick — resolved: owner chose C · Ink & paper** (in-session, 2026-08-22, after reviewing the page). 0b builds from C; A and B are not carried forward.
- Boot chime for 0b: commissioned, composed by the agent, or omitted (plan §8). The concept for C is words only — a low sine thud followed by a single bright click.
- Repo settings: auto-merge disabled and `main` unprotected until S1. Nothing for 0b to do; noted for S1.

## Next
0b — `feat/identity-tokens` on `lane/identity`, building **C · Ink & paper**: tokens (palette, type scale, spacing, radii, motion, elevation), contrast table per token pair in both themes, the icon set as SVG, the KJ mark as an asset, the chime asset (pending the §8 decision), and `DESIGN.md`. Start from this PR's page and handoff; the C column is the spec.
