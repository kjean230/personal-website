# Handoff — feat-shell-detail-panel

**Merged into:** `lane/console-shell` (PR target; not merged in this session).
**Plan row:** BUILD_PLAN §5, `feat/shell-detail-panel`.

## Shipped

- Recovered the owner's nine modified tracked files and six untracked detail files from `feat/shell-detail-panel@61a9776`; reconciled that existing work onto lane `ab6ed514`. No detail implementation was rebuilt. The original checkout remained evidence only, with its 195-record preservation digest unchanged: `178fc71aef6964a60e56a71aadaf6d3332b2a1801e133afd9c18f827a47ef036`.
- Kept one canonical `/<section>/<slug>` route, one existing data result and one shared server-rendered semantic article. Retained dates, body, typed metadata, links, categorized tags and related entries; no media, query-layer changes or dependency changes.
- Reproduced the content loss in a recovered production build: the new detail sidebar reused the home utility `.rail`, whose base rule hides it outside Explorer. Renamed the sidebar to `detailRail`; Recruiter/default/JS-off content is complete again.
- Bounded panel presentation and enhanced detail keyboard rows to actual, marked entry openers and matching history-entry keys. Reload, direct navigation, missing history support and stale provenance keep an ordinary canonical document. Provenance is one in-memory record, cleared by reload; no storage or URL state.
- Retained `/all` cards and section rows as the only morph origins. Related rows and resume entry links may establish actual non-morph provenance. Header and markdown links cannot create panel context. Back is a real section link with a contextual history enhancement; Escape follows the same validated context; physical B remains unbound.
- Retained the recovered React shared-boundary architecture (`default="none"`, `share="morph"`), capability/reduced-motion gating, 320 ms duration/glide tokens and computed timing guard. Reverse preparation uses the real Navigation API traversal destination before Next's restore; internal same-entry history bookkeeping must not clear the pair. The current Next runtime still restores history without starting a reverse View Transition: return navigation stays instant, with exact opener focus restoration. Forward click-to-detail morphs and the fail-closed return behavior are verified; no custom router or duplicate tree was introduced.
- Added focused canonical-record, provenance and morph-gate tests. Local verification includes the full 402-test unit suite, 71 disposable database/RLS tests, token validation, real typecheck, lint, production builds, production Chrome content/navigation/accessibility checks and unchanged Lighthouse assertions. Production Chrome assertions: 225 core + 29 metadata/profile checks, all passing. All 18 unchanged Lighthouse audits pass enforced assertions: performance 0.97–1.00, accessibility 1.00, scripts at most 155,823 B and total at most 288,473 B. Every LCP reading still exceeds 1,500 ms (1,658.170–2,641.921 ms). Detailed evidence is retained in the session report.

## Deviated from plan

- The owner's original dirty checkout was preserved rather than updated in place. A separate reconciliation branch starts at the verified lane head; the old branch was not switched, reset or committed.
- Auto-merge remains disabled for the requested review handoff. Live lane protection requires only `CI green`, with no approving-review condition; enabling auto-merge would authorize a lane mutation before a separate owner review. No merge, direct lane push or main mutation is part of this work.
- Runtime changes stay within the recovered fifteen-file set. The only additional files are three focused test files and this required handoff.

## Deferred

- Storage-backed detail media and icon assets: `feat/shell-album-news`, after admin media reaches main.
- Animated history-return morphs remain an instant fallback on this Next runtime. Any requirement to replace its synchronous restoration path needs architecture review; this row does not add a custom router.
- Physical gamepad behavior, other shell rows, ingestion, admin, analytics and content expansion remain outside this row.
- The 1,500 ms LCP target remains unresolved. Existing Lighthouse limits are unchanged; no LCP remediation or unrelated dependency/security maintenance was performed.

## Open questions for owner

- Review the detail-panel PR and its evidence before authorizing any merge. No new product or architecture decision is assumed.

## Next

Review this sub-branch first. The next roadmap row is `feat/shell-trophy-full`, in a separate session after this row is accepted; it was not started here.
