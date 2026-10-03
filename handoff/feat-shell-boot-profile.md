# Handoff — feat/shell-boot-profile

**Merged into:** `lane/console-shell` — PR opened with auto-merge enabled. The merge record is the close-out's to add.
**Plan row:** `BUILD_PLAN.md` §5, `lane/console-shell`, first row — "`feat/shell-boot-profile` (≈1.2s boot, skippable, once per session; profile select)". Brief §5: "Boot sequence — ~1.2s original logo + chime, skippable, once per session" and "Profile select — Recruiter mode vs Explorer mode".

This is the first sub-branch of the lane, and the session that cut the lane.

## Shipped

### The answer, first

- The first load of `/` in a browser session now opens with a 1.2 s boot — the KJ badge landing like a stamp — followed by a profile select with two choices, Recruiter mode and Explorer mode.
- Every other URL is unchanged and never boots.
- A choice is remembered for the session and exposed as `data-mode` on `<html>`. Nothing reads it yet, so both choices land on the home page exactly as it rendered before.
- The boot is silent. The chime is not wired.
- With JavaScript disabled, nothing appears and the recruiter site is as it was.
- No LCP remediation was performed.

### Starting state, verified before any branch existed

- `origin/main` = `3c281104d8112b2d196a012ab3bce5d5ccaa8693`, the squash of PR #51, CI green on it. `411d409..3c28110` adds one file, `handoff/chore-lcp-diagnostic.md`.
- PR #50 and PR #51 merged. `BUILD_PLAN.md` §5.1 step 2a: the diagnostic's handoff on `main` opens the lane.
- No `lane/console-shell`, `feat/shell-boot-profile`, `lane/ingestion` or `lane/admin`, locally or on the remote.
- Working tree clean. `.git/info/exclude` empty. The git-ignored `REFERENCES.md` is present and says the boot motion "has no reference here and is `feat/shell-boot-profile`'s to compose".
- `lane/console-shell` was cut from `origin/main` at `3c28110` and pushed; `feat/shell-boot-profile` was branched from it at the same commit.

### Four owner decisions, taken before any code

Preflight passed, and the session then stopped under `BUILD_PLAN.md` §2.1's ambiguity trigger. The repository did not settle how brief §1's "chosen at entry via a profile-select screen" and "Recruiter mode — default for `/`, crawlers, and anyone arriving from an application link" fit together, or how "boot = logo + chime" fits "sound off by default; opt-in toggle persisted". Four questions were put to the owner and answered in the session:

| # | Question | Owner's answer |
|---|---|---|
| 1 | Where does the boot and profile select appear? | **Home page only.** The first load of `/` in a session. Every other URL renders the recruiter page directly |
| 2 | How long is the chosen mode remembered? | **This session only.** `sessionStorage`, beside the once-per-session boot flag |
| 3 | What does a choice change in this sub-branch? | **Record it only.** Stored, and exposed as one attribute on `<html>` for later rows. Nothing S6 or S7 shipped changes |
| 4 | What happens to the chime? | **Silent boot, chime deferred** to `feat/shell-settings-notifications`, where the sound opt-in lands |

Four readings were stated alongside the questions and not objected to: no boot and no profile select with JavaScript off or for a crawler · under reduced motion the boot does not run and a due profile select appears at once · any key, click or tap during the boot jumps to the profile select, and Escape on the profile select means Recruiter · "once per session" is one browser-tab session.

### Boot behaviour, exactly

- **Where:** `/` only. The dialog's markup is rendered by `app/page.tsx` and no other page.
- **When:** the first load of `/` in a session, whether that is the session's first page or a later one. A session that begins on a deep link and then reaches `/` boots at that point.
- **How it opens:** an inline script straight after the dialog calls `showModal()` while the HTML is still being parsed, so the boot is the first thing painted. A soft navigation to `/` never runs an inline script, so the island makes the same claim in a layout effect, before the home page paints.
- **The sequence**, all on design tokens, measured in Chrome from the animations' own timing:
  - 0 → 320 ms (`--duration-slow`, `--ease-glide`): the badge fades in and settles downward by `--space-6`.
  - 320 → 500 ms (`--duration-fast`): its hard offset shadow, `--elevation-3`, lands under it.
  - 940 → 1,200 ms (`--duration-base`, ending at `--duration-boot`): the title, the two choices and the key hints fade in and settle upward by `--space-4`.
- **The profile select is laid out from the first frame** and only hidden, so the badge does not move when it appears.
- **Skippable.** Enter, Space, Escape, Tab, an arrow key, any printable key, a click or a tap ends the boot at once and shows the profile select. A skip never selects a profile and never closes the dialog. Function keys, a bare modifier and every modified chord are left to the browser.
- **Once per session.** The claim is written to `sessionStorage` before the dialog opens, so a reload during the boot does not replay it.
- **No storage, no boot.** If `sessionStorage` is blocked, the boot cannot be remembered, so it never runs.

### Profile-select behaviour, exactly

- A native modal `<dialog>` named "Select a profile", holding two submit buttons in a `<form method="dialog">`: "Recruiter mode", then "Explorer mode".
- When the boot ends, focus moves to "Recruiter mode", the default.
- Left, Right, Up, Down, Home and End move between the two choices and wrap. Tab and Shift+Tab reach both; a further Tab moves on to the browser's own controls and Shift+Tab returns, so the modal holds focus without trapping it.
- Enter or Space on a choice, or a click or tap, closes the dialog and records that mode.
- Escape closes the dialog and records Recruiter. The hint row under the choices says so: "Enter Select · Esc Recruiter mode".
- The URL does not change. Neither choice is a link, there is no redirect, and mode is still not a URL dimension.
- After closing, the page is the home page as before: six tiles with the same six hrefs. Focus returns to where it was — the document on a full load, so the first Tab is the skip link.
- The page behind the dialog is inert while it is open.

### Session persistence, exactly

| Key | Where | Written | Meaning |
|---|---|---|---|
| `kj.booted` | `sessionStorage` | when the boot opens | this session has had its boot |
| `kj.mode` | `sessionStorage` | when the dialog closes | `recruiter` or `explorer` |
| `data-mode` | attribute on `<html>` | on close, and on every later page load by a script in `<head>` | the same value, for later rows' CSS and code |

- One session is one browser tab. A new tab or a later visit boots and asks again.
- No cookie, no `localStorage`, no URL parameter, nothing sent to a server. `/` is still a static route.
- A value outside the two modes is ignored on read, so a stale or hand-edited entry never reaches the attribute.
- No `data-mode` attribute means Recruiter. That is every session that has not chosen: a deep link, JavaScript off, a crawler, blocked storage.

### Reduced motion

- `tokens.css` already zeroes every `--duration-*` under `prefers-reduced-motion: reduce`, and the boot has no duration of its own.
- Measured with the media feature emulated: the three animations report an end time of 0 ms and are finished at `DOMContentLoaded`; the profile select is visible at once with focus on "Recruiter mode". The boot does not run.
- There is no `prefers-reduced-motion` media query and no JavaScript branch for it in this change.

### Audio and the chime

- Nothing plays. `lib/audio/boot-chime.ts` is still imported nowhere; a search of `app/` and `lib/` finds no importer.
- Its header comment was updated to say why and where the wiring goes. No code in it changed.

### What changed, file by file

| File | Change |
|---|---|
| `app/(explorer)/boot.ts` | New. Pure: modes, storage keys, `parseMode`, `claimBoot`, `recordMode`, and the two inline scripts as constants |
| `app/(explorer)/boot-profile.tsx` | New. The client island: the `<dialog>`, opening on soft navigation, skip, arrow keys, focus hand-over, recording the choice |
| `app/(explorer)/profile-select.tsx` | New. Server component: the badge, the title, the two choices, the hint row |
| `app/(explorer)/explorer.module.css` | Five classes and three keyframes for the dialog. The choices reuse the tile face |
| `app/(explorer)/keys.ts` | `isSkipKey` |
| `app/(explorer)/tiles.ts` | `PROFILE_ICON` |
| `app/page.tsx` | Renders `<ProfileSelect />` after `<main>` |
| `app/layout.tsx` | The mode script in `<head>`; `suppressHydrationWarning` on `<html>` |
| `lib/audio/boot-chime.ts` | Header comment only |
| `app/(explorer)/boot.test.ts`, `profile-select.test.tsx` | New tests |
| `app/(explorer)/keys.test.ts`, `tiles.test.ts` | Extended |
| `CLAUDE.md` | Repo state, three corrected statements, a new conventions block |
| `handoff/feat-shell-boot-profile.md` | New — this file |

No dependency, no token, no icon, no asset, no migration, no `next.config.ts`, `lighthouserc.json` or workflow change. `package.json` and `package-lock.json` are untouched.

### Verification: local gates

- `npm run lint`: 0 problems.
- `npm run typecheck`: clean.
- `npm test`: **257 passed, 27 files** (219 and 25 before this branch).
- `npm run tokens:check`: ok — 58 static and 19 themed tokens, 68 of 68 contrast measurements pass, 29 icons and 2 mark files.
- `npm run build`: ok, route table unchanged — `/` ○, `/_not-found` ○, `/[section]` ƒ, `/[section]/[slug]` ●, `/resume` ○ with a 1 h revalidate.
- `npm run db:test` was not run. Nothing it covers changed; CI runs it.

### Verification: a real browser

Headless Chrome driven by `puppeteer-core` from the `@lhci/cli` dev tree, against `next start` on the production build. The drivers stayed outside the repo. A fresh incognito context was used as a fresh session.

| # | Check | Result |
|---|---|---|
| 1 | Normal-motion boot | Dialog open and modal at `DOMContentLoaded`; animations end at 320, 500 and 1,200 ms; choices hidden until 940 ms |
| 2 | Filmstrip | Ten frames per theme, taken by pausing and seeking the animations, with computed opacity, transform and shadow recorded at each |
| 3 | First paint under applied slow-4G and 4× CPU | The first painted frames are the boot. The home page is never painted before it |
| 4 | Skip | Enter, Space, Escape, Tab, ArrowRight, `x` and a mouse click each end the boot with the dialog still open, no mode recorded, focus on "Recruiter mode". F6 and a bare Shift do not skip |
| 5 | Pointer skip on the spot where a choice will appear | Mouse and touch: the first press skips, the second chooses |
| 6 | Reduced motion | See above |
| 7 | First occurrence, repeat, new session | Boots once; a reload of `/`, a hard load of `/resume` and a soft navigation back to `/` do not boot; a second context boots again |
| 8 | Deep link first | `/experience/break-through-tech`, `/experience`, `/resume` and `/certifications` have no dialog, no boot flag and no mode. A soft navigation from there to `/` boots |
| 9 | Keyboard on the profile select | Tab, Shift+Tab, all four arrows, Home and End; `:focus-visible` and a 3 px solid outline at every step |
| 10 | Recruiter choice | Closed; `data-mode` and `kj.mode` are `recruiter`; URL `/`; first Tab afterwards is "Skip to content" |
| 11 | Explorer choice | Closed; both are `explorer`; URL `/`; six tiles, same hrefs; a hard load of `/experience` carries `data-mode="explorer"` |
| 12 | Escape on the profile select | Closed; Recruiter recorded |
| 13 | JavaScript disabled | Dialog not open, computed `display: none`, no visible button; six tiles, ten links, one `<h1>`, zero `tabindex` attributes; Tab order is skip link, site name, Resume, six tiles, Resume |
| 14 | Bundle blocked | With every script chunk request failed, the boot still runs out, a click on a choice closes the dialog and so does Escape. Nothing is recorded, so the session is Recruiter |
| 15 | Touch targets | Each choice is 250 × 97 px at 1280 wide and 312 × 97 px at 360 wide |
| 16 | Small screens | No horizontal scroll at 360 × 740 in either theme. At 320 × 300 the dialog scrolls and its top stays reachable |
| 17 | Accessibility tree with the dialog open | A modal dialog named "Select a profile", a heading, two buttons; the page behind is absent from the tree |
| 18 | Console | No error or warning in any scenario, on the production build or under `next dev` |

JavaScript was disabled with the browser's own setting rather than S6's script-stripping recipe. Both remove script execution; this one keeps the real URL.

**Only Chrome was driven.** Safari and Firefox were not tested.

### Verification: Lighthouse and the script budget

`npx lhci autorun` with `lighthouserc.json` unchanged, three runs on each of the five audited URLs, run twice on this machine: once on the untouched tree at `3c28110`, once on this branch. Medians.

| URL | Script, before → after | Performance | Accessibility | LCP, before → after |
|---|---|---|---|---|
| `/` | 143,464 → 144,286 B (+822) | 0.98 → 0.98 | 1.00 → 1.00 | 2,469 → 2,470 ms |
| `/experience` | 144,508 → 145,398 B (+890) | 0.98 → 0.98 | 1.00 → 1.00 | 2,467 → 2,463 ms |
| `/experience/break-through-tech` | 144,508 → 145,398 B (+890) | 0.98 → 0.98 | 1.00 → 1.00 | 2,464 → 2,464 ms |
| `/certifications` | 144,508 → 145,398 B (+890) | 0.98 → 0.98 | 1.00 → 1.00 | 2,467 → 2,462 ms |
| `/resume` | 143,464 → 144,286 B (+822) | 0.98 → 0.98 | 1.00 → 1.00 | 2,462 → 2,316 ms |

- **Script budget:** the largest page is 145,398 B against the 250,000 B cap, leaving 104,602 B.
- Every error-level assertion passed on both runs. The five warn-level LCP notices are the same five as before.
- Stylesheet transfer grew by 321 B on every route. Document transfer grew by 877 B on `/` and by 150–208 B elsewhere. There are still two stylesheets per page.
- `/resume` grew by 822 B of script while mounting no island. That is the shared-chunk effect S7 recorded.
- `/resume`'s LCP median moved by 147 ms. Its three runs ranged 2,311–2,461 ms, and two other pages each had a run in the same low band. This is run-to-run variation in the simulation, not an effect of this change.
- Lighthouse audited `/` with the profile select open, since each run is a fresh session. Accessibility stayed 1.00.
- These are local figures. Do not compute a delta against CI's.

### What the LCP figure does and does not show

- Chrome reports the `<h1>` as `/`'s LCP element at first paint, before and after this change: 496–512 ms across five runs under applied slow-4G and 4× CPU. The dialog's own text is smaller and never replaces it.
- Chrome does not account for the dialog covering that `<h1>`. The reported figure is therefore unchanged, while what a first-time visitor to `/` sees at first paint is now the boot.
- This is measurement, recorded because `BUILD_PLAN.md` §5.2 gated the lane on exactly this question. Nothing was tuned in response.

### Prohibited-term, secret and contact sweep

Over every added line of the staged diff, with `PROHIBITED_TERMS` read out of `design/tokens/build.mjs` rather than retyped: both regexes **0**; brief §2.1's other names **0**; JWT shapes, key prefixes, the Supabase project reference, contact literals and credential assignments **0**. The 40-hex probe matches once, on the public commit id of `main` quoted under Starting state. Four canaries fired in the same run. No binary and no third-party asset was added.

## Deviated from plan

- **The row was built to four owner decisions the plan does not contain.** They are tabulated above and nowhere else in the repo.
- **The chime is not wired**, although brief §5 defines the boot as "logo + chime" and the plan's table says this row reads the chime. Owner decision 4.
- **`lane/console-shell` was cut after the four answers, not when preflight passed.** The `lane-protection` ruleset blocks deleting a pushed lane branch, so nothing was pushed until the work was certain to proceed.
- **`app/layout.tsx` was edited.** It serves every route. The mode attribute has to be set on every page, before first paint, and that is the only place it can be. `BUILD_PLAN.md` §5.1 gives app routes to this lane.
- **`lib/audio/boot-chime.ts` was edited**, comment only, because its header said the wiring belonged to this sub-branch.
- **Three statements in `CLAUDE.md` were corrected rather than left false:** "two client islands" is now three; "zero `catch` in `lib/` or `app/`" now names the storage guard as the one exception; the raw-output rule names the two inline scripts as a second exception.
- **Skip is bound to `click`, not `pointerdown`.** The first build used `pointerdown`. Driving a touch tap on the spot where a choice would appear selected that profile from a tap meant to skip. It was reproduced, fixed and re-run before anything was committed.
- **Both choices carry the same glyph**, `profile-select.svg`. No icon was drawn for either mode and none was drawn here.
- **The choices are not a roving-`tabindex` group.** Both stay ordinary tab stops and the arrows also move between them. With two controls in a modal, a roving `tabindex` would only remove one tab stop.
- **No subagents were used** (`PROMPTS.md` → Tooling posture). The second-gaze checkpoint in that section is a manual loop of the owner's and was not run.
- **Lighthouse was run locally twice**, which added 30 reports to `.lighthouseci/reports/`. That directory is never cleared; filter by filename timestamp.

## Deferred

- **The chime** → `feat/shell-settings-notifications`, with the sound opt-in. That row also has to decide when it plays: a boot that starts on page load has no user gesture, and the audio file's own rule is to play only from one.
- **A way to change mode after choosing** → `feat/shell-settings-notifications` (brief §5, System Settings: mode) and the utility rail's Sleep ("drops to Recruiter mode"). Until then a session keeps the mode it chose; a new tab asks again.
- **Any rendering that differs by mode** → the rows that build Explorer-only furniture, starting with `feat/shell-tile-grid`. They key on `data-mode`.
- **Gamepad on the profile select** → `feat/shell-gamepad`.
- **An exit transition.** The dialog closes instantly. Transition conventions are `feat/shell-detail-panel`'s per the plan's motion mapping.
- **A nonce for the two inline scripts** when Phase 3 adds a Content Security Policy.
- **Safari, Firefox, a real device and a screen reader** → Phase 3's manual passes. Two things worth checking there first: that Escape during the boot skips rather than closes, and that the focus ring shows on "Recruiter mode" when the boot ends untouched.
- **`/privacy`** should name the two `sessionStorage` keys when it is written. They hold a display preference for one tab and are never transmitted.
- **`PROMPTS.md` has no session block for this sub-branch.** The prompt was pasted, not committed, as `handoff/chore-lcp-diagnostic.md` already noted.
- Unchanged from `handoff/chore-lcp-diagnostic.md` and earlier handoffs, and not restated here: the open ingestion items in `BUILD_PLAN.md` §8, the five Dependabot PRs, security headers and `app/global-error.tsx` → Phase 3, `keep-warm.yml`'s removal when an ingestion cron lands.

## Open questions for owner

1. **Does the boot feel right?** It was composed without a reference. In one sentence: the badge drops a short way and settles, its hard shadow lands a beat later, and the choices rise into place as the 1.2 s ends. Feel is the acceptance criterion and only `npm run dev` shows it.
2. **How is brief §9's "Recruiter mode: LCP < 1.5s" judged on `/` now?** The reported figure did not move, but a first-time visitor to `/` now sees the boot first and the recruiter page only after choosing. This adds to open question 1 in `handoff/chore-lcp-diagnostic.md`.
3. **Should each profile carry a one-line description?** Only the brief's two names are shown. Any description would be new copy, so none was written.
4. **In the dark theme the badge's shadow is saffron under a saffron badge.** That is what `--elevation-3` resolves to on ink, and a focused tile behaves the same way. It reads as a thicker edge rather than a shadow. Keep, or give the mark a different treatment on ink?
5. **Is `data-mode` the contract later rows should build on?** It is the one piece of this sub-branch every later row inherits.
6. **`next dev` appends a `nextjs-agent-rules` block to `CLAUDE.md` whenever an agent runs it** (Next 16.3.3, `node_modules/next/dist/server/lib/generate-agent-files.js`). It appeared during this session's dev-mode check and was reverted, not committed. Adopt it, or leave it out?
7. **`.git/config` on this machine still sets `commit.template` to the literal `commit.gpgsign`.** `CLAUDE.md` says the repo has no `commit.template`. It was not changed; this branch committed with `-F`.

## Next

**`feat/shell-tile-grid`** on `lane/console-shell` — "tile row, All Software index, search" (`BUILD_PLAN.md` §5). It reads `entries`, does not wait on ingestion, renders no Storage-backed image, and owns hover and focus zoom, smooth scrolling and the icon-display grammar per the plan's motion mapping. It is the first row that can make Explorer mode look different from Recruiter mode, and `data-mode` on `<html>` is what it keys on.

Start by pulling `origin/lane/console-shell` and branching from it, never from this branch.

Not started. No other sub-branch, lane or fix was begun in this session.
