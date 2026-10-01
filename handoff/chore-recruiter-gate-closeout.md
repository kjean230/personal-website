# Handoff — chore/recruiter-gate-closeout

**Merged into:** `main` — opened as a PR and **left for the owner to merge**; see Deviated.
**Plan row:** none — a `chore/*` branch, cut from and targeting `main` per `BUILD_PLAN.md` §2, because no live lane holds the documents. This is the record of the `lane/recruiter` → `main` gate (`BUILD_PLAN.md` §7), written after the gate merged and after production was verified. Documentation only, and one file only: this handoff. No app code, no `lib/`, no schema, no migration, no seed, no dependency, and no edit to any other document.

## Shipped

### The gate

- **`lane/recruiter` → `main` merged 2026-10-01 18:10:33 UTC — PR #48, squash `bda8136`** (`bda8136a38625ac4e354e64e62854f119007ee73`).
- **Pre-gate SHAs, verified first-hand before the PR existed and again immediately before the merge:**
  - `main` = `2474032` (`2474032dd6b18053d13a67a4ea973555fac0735a`, #41's `sharp` 0.35.4);
  - `lane/recruiter` = `76b5c90` (`76b5c903579851c5ab429715036a3370cbaae61c`, #47's squash);
  - the lane was **0 behind / 4 ahead** (#38, #45, #46, #47), merge-base `2474032`;
  - neither branch had moved since `handoff/feat-recruiter-seo.md` was written, no lane → `main` PR existed in any state, and the only open PRs were the five Dependabot ones.
- **Merge method: squash, with `--admin`, pinned with `--match-head-commit 76b5c90…`.**
  - Squash is the only method `main-protection` allows (linear history).
  - `--admin` for the standing reason: `main-protection` requires one approving review, GitHub does not let anyone approve their own pull request, and the owner is the ruleset's sole bypass actor. The PR's only blocker was `REVIEW_REQUIRED`.
  - **No failing or pending check was bypassed.** `--admin` would skip status checks too, so the merge waited for the PR-triggered run to finish green first.
  - No force-push, no history rewrite, no `--delete-branch`, and no other PR touched.
- **The merged tree is the lane tree, exactly.** `git merge-tree` predicted `e5f4ed5f3255ab43443ec190d41785775f5dcebe` before the PR was opened; `main^{tree}` is that value after the merge, and `git diff origin/main origin/lane/recruiter` is empty.
  - Against `2474032`: **33 files, +1,513 / −45**.
  - Untouched: `package.json`, `package-lock.json`, `next.config.ts`, `.github/`, `lighthouserc.json`, `supabase/`, `app/(explorer)/`.
- **Attribution on `bda8136`:** `%(trailers)` empty; author the owner; committer GitHub's web-flow identity (the squash-merge exception). The message body is the four lane commits' own messages and credits no assistant, model or vendor.

### The checklist as signed

- **17 `[x]` and 1 `[ ]`** — the same shape PR #26 merged with.
- **The open box is "Upstream failure cannot break a page render", again a deliberate, signed exception deferred to Phase 3**, by the owner's decision at this gate. The lane adds no new failure path: the OG image and robots.txt read nothing, and the sitemap is prerendered and serves its last good copy when a revalidation fails. What remains predates the lane and is recorded in `handoff/chore-spine-loose-ends.md`: a failed first render of `/[section]/[slug]` returns a bare 500 that never reaches `app/error.tsx`, and with JavaScript off every 404 and 500 body is blank.
- **"Any new public endpoint is rate limited" is recorded as N/A, by the owner's correction.** There is no new dynamic or write endpoint. `/robots.txt`, `/opengraph-image` and `/sitemap.xml` are read-only, prerendered, CDN-served resources, and the sitemap revalidates at most hourly. **They are not rate limited, and the checklist line says so in those words.** N/A treatment has a basis in the plan and in precedent: `BUILD_PLAN.md` §3 records §7 items as N/A for Phase 0, and PR #4 — the first lane → `main` gate — rendered this same box as a ticked line labelled `N/A: no endpoints exist`. That rendering was reused, so the box is not left open under §7's "unticked items block the merge".
- Every other box carries one evidence line in the PR body; the evidence is summarised below.

### CI

All 8 jobs green on each of three runs — Lint, Typecheck, Test, Design tokens check, Build, Lighthouse budget, Database migrations & RLS, `CI green`:

| Run | Event | SHA | Result |
|---|---|---|---|
| `36893620732` | push to `lane/recruiter` | `76b5c90` | success |
| `36904289476` | pull request #48 | `76b5c90` | success |
| `36904872895` | push to `main` | `bda8136` | success |

- Read from the run logs, not from an earlier handoff: test **219 passed / 25 files** · database suite **64 passed / 4 files** · tokens **58 static, 19 themed, 68/68** contrast pairs.
- `Supabase Preview` on `bda8136`: success. The diff carries no migration, so "nothing to apply" is the expected result — and its output body is empty, as at every earlier gate, so that is **consistent with the check, not proven by it**.
- `Vercel` status on `bda8136`: "Deployment has completed".

### Local verification

- **Before the PR was opened, on the gate tree** (`e5f4ed5f…`): `npm ci` · lint **0** · typecheck clean · test **219 / 25** · tokens:check ok · build clean · the direct SEO check against `next start`, **70 / 70**.
- **After the merge, on `main` at `bda8136`:** lint 0 · typecheck clean · test 219 / 25 · tokens:check ok · build clean.
- **Route modes, both times and in all three CI builds:** `/` ○ · `/_not-found` ○ · `/[section]` ƒ · `/[section]/[slug]` ● · `/icon.svg` ○ · `/opengraph-image` ○ · `/resume` ○ `1h` · `/robots.txt` ○ · `/sitemap.xml` ○ `1h`.

### Production deployment

- **Production is READY on `bda8136`**: deployment created 2026-10-01 18:10:36 UTC, target `production`, aliased to `kerwynjean.dev`. Read from the Vercel API with the response projected to an allowlist of fields.
- **Before the gate**, production served `2474032`: `/robots.txt`, `/sitemap.xml` and `/opengraph-image` all returned 404, and the home page carried no canonical, no `og:image` and no JSON-LD.
- Production is public: no login wall on any page fetched, and `/bogus` is a genuine 404.

### Production SEO checks — observed, not inferred

Run over plain HTTPS against `https://kerwynjean.dev`, with no token and no authenticated request. The check script is the one `handoff/feat-recruiter-seo.md` describes, reused unmodified and still kept out of the repo.

- **`production_OG_origin_observed`.** On `/`, `/experience`, `/experience/break-through-tech`, `/resume` and `/experience?facet=corporate`, **both `og:image` and `twitter:image` are exactly `https://kerwynjean.dev/opengraph-image?05b1f338b91b929c`**. No `vercel.app` origin appears anywhere in any of those five `<head>`s. This closes the first item `feat-recruiter-seo.md` deferred: the behaviour it could only infer from Next's source is now seen on production.
- **Canonicals, as served:**

  | Page | Canonical |
  |---|---|
  | `/` | `https://kerwynjean.dev` |
  | `/experience` | `https://kerwynjean.dev/experience` |
  | `/experience/break-through-tech` | `https://kerwynjean.dev/experience/break-through-tech` |
  | `/resume` | `https://kerwynjean.dev/resume` |
  | `/experience?facet=corporate` | `https://kerwynjean.dev/experience` |

- **The full check: 70 / 70 on production** — all 27 sitemap URLs and all 7 live facet views, each with status 200, exactly one canonical in `<head>`, the complete Open Graph and twitter-card set, no `og:url`, and exactly one JSON-LD block that parses and contains no `<`.
- **The OG image:** 200, `image/png`, PNG signature, IHDR **1200×630**, 23,484 B. **Its SHA-256 (`dc6f0ac6…ff25`) is identical to the local build artifact's**, and the image was viewed: the KJ badge, centred on the paper ground.
- **`/robots.txt`:** 200, `text/plain`, body exactly `User-Agent: *` / `Allow: /` / blank / `Sitemap: https://kerwynjean.dev/sitemap.xml`. No `Disallow`, no reserved route.
- **`/sitemap.xml`:** 200, `application/xml`, **27 URLs**, every `<loc>` on `https://kerwynjean.dev`, none duplicated, no `?facet=`, no reserved route, `lastmod` on the 19 entries only, no other field. The URL set equals the route table as scraped from the live section pages.
- **JSON-LD by route class:** `WebSite` on `/` · `BreadcrumbList` on the section, entry and facet pages · `ProfilePage` → `Person` on `/resume`, with `sameAs` equal to the contact block's two profile links and no email or location.
- **Negative routes:** `/bogus`, `/experience/no-such-slug` and `/experience?facet=bogus` each return 404 with zero canonicals; `/projects/break-through-tech` 308s to `/experience/break-through-tech`.
- **No `x-robots-tag` on production.** Previews carry Vercel's `noindex`; production carries none on any page or metadata route fetched.
- **Cache headers, as observed.** The very first request after the deploy: robots and sitemap `x-vercel-cache: MISS`, the OG image `PRERENDER`. About 30 s later all three were `HIT`. `/`, the entry page and `/resume` were `HIT`; `/experience` and the facet view were `MISS`, as a per-request route is.

### Budgets

From `main`'s own Lighthouse artifact (run `36904872895`, 15 reports), not from a local run:

| Routes | Script | Total |
|---|---|---|
| `/`, `/resume` | **143,464 B** | 259,958–263,280 B |
| `/experience`, `/certifications`, the entry page | **144,508 B** | 257,285–265,097 B |

- Caps: script **250,000 B** (headroom **105,492 B**), total **500,000 B**.
- Accessibility **1.00**, SEO 1.00 and best-practices 1.00 on every run.
- Performance 0.97–1.00, apart from **one run of `/` at 0.72**; the same URL's other two runs were 0.97 and 0.99, and the assertion passed.
- LCP 1,820–2,824 ms. Warn-level, and above target — see Deferred.
- The script figures equal `feat-recruiter-seo.md`'s to the byte, so its **+1,356 B per route** attribution stands and was not re-examined.

### Security, IP and scope, checked independently before the gate

Over the 1,513 added lines of `git diff 2474032 76b5c90`, with the regexes read out of `design/tokens/build.mjs` rather than typed:

- `PROHIBITED_TERMS`: **0** matches in added lines and **0** in filenames. Brief §2.1's other names: 0, apart from one `git switch` command in a handoff.
- Secret shapes: **0**. GitHub secret scanning: 0 open alerts, push protection on. Actions holds 0 secrets and the 2 public variables.
- Tracking and identification: **0** — no analytics, no third-party script, no `headers()` or `cookies()` read.
- Contact literals outside `app/resume/`: **0**. The three hits on the looser markers are prose — `CLAUDE.md` naming the leak marker itself, and the print handoff naming the location and the absent `tel:` shape.
- No binary added, no dependency added, no new client component, nothing animated.
- **Dependabot alerts: 9 open, all development scope, 0 runtime** — unchanged.
- **Vercel: 0 protection-bypass entries**, before and after the gate. Deployment Protection unchanged (SSO `all_except_custom_domains`, no password, no trusted IPs), and no bypass variable among the project's environment variables.

## Deviated from plan

- **This handoff's own PR is opened and not merged by the session that wrote it**, by the owner's decision at the gate. Two consequences worth knowing: until it merges, `main` carries no record of the gate; and merging it triggers one more production deployment — of a docs-only change — that nothing above verified.
- **The rate-limit line is N/A rather than a plain tick** (Shipped, above). The sub-branch PRs (#38, #47) ticked it with a "no new endpoint" or "served from the CDN" note; at the gate the owner asked that it not read as a claim the routes are rate limited.
- **PR #48's required check was already satisfied when the PR opened.** Its head was the lane's own commit, which carried a green `CI green` from the lane's push run — the same thing `chore-recruiter-pre-seo.md` recorded for #45. The merge nonetheless waited for the PR-triggered run `36904289476`.
- **Pre-gate verification ran no local command that writes.** The gate candidate was assessed from the CI run on the exact SHA, the Lighthouse artifact, the diff, and a build already on disk whose `BUILD_ID` postdated the last source edit; the full local suite ran only after the owner approved, and before the PR was opened.
- **`.env.local` was not modified.** It still holds the expired `VERCEL_OIDC_TOKEN`. No preview was fetched this session, so no token was needed.
- **No subagents were used** (`PROMPTS.md` tooling posture). The Gemini second-gaze checkpoint was not run; it was not requested.

## Deferred

None of these blocked the gate; each was classified against `BUILD_PLAN.md` §7 before the PR was opened.

- **LCP is above brief §9's target.** 1,820–2,824 ms in CI's Lighthouse against "Recruiter mode: LCP < 1.5s". It is a warn-level assertion, it predates the lane (recorded since S5), and §7 has no box for it — but **the criterion names recruiter mode and is still unmet**. `BUILD_PLAN.md` §6 puts performance budget enforcement in Phase 3; the owner's direction on sequencing it is under Next.
- **The printed resume is four pages.** A content and ordering question, not a print-CSS one.
- **Print rendering has no CI check, and neither do the SEO artifacts.** Lighthouse's SEO category scored 1.00 before this lane and after it. Both checks would be new CI jobs.
- **Deliberately not built in the lane:** per-entry OG images · `og:url` · per-page descriptions · per-kind schema types · the plan row's optional polish (facet icons, an "Other" chip for `count.unfaceted`).
- **`lastModified` under-reports some edits:** `updated_at` moves on entry-row edits only, not on a link, tag or relation change.
- **`lane/recruiter` survives on origin at `76b5c90`** and cannot be deleted while `lane-protection`'s `deletion` rule has an empty bypass list. Because the gate was a squash it is **not an ancestor of `main`** (`1 4` divergence) — match it to PR #48 by `headRefName` and test that PR's `mergeCommit.oid` instead. `lane/spine` (`cb11f9f`) is in the same state.
- **No other document records the gate.** `CLAUDE.md`, `PROMPTS.md` and `BUILD_PLAN.md` were not edited by this chore, so `PROMPTS.md` has no dated gate section of the kind the spine gate got.
- **Stale `## Next` pointers, left as written** (the standing "record, do not rewrite" precedent): five handoffs still end "Not started." about work that has since moved — `chore-post-gate-closeout.md:57`, `chore-spine-loose-ends.md:64`, `chore-tooling-posture.md:50`, `chore-verify-terms.md:62`, `feat-recruiter-resume-print.md:56`.
- **The Dependabot PRs are untouched:** #31 (`typescript` 7), #32 (`eslint` 10), #42 (`js-yaml`), #43 (minor-and-patch group), #44 (`ip-address`).
- Unchanged from earlier handoffs: security headers, `/privacy` and `app/global-error.tsx` → Phase 3 · delete `keep-warm.yml` when an ingestion cron lands · `links.kind = 'credential'` migration · facet-count view · generated-types drift check in CI · media markup → `feat/admin-media` · `www` has no DNS record.

## Open questions for owner

1. **The four-page printed resume.** Leave it, cut what `/resume` includes, or cap entries per section. Unchanged from `feat-recruiter-resume-print.md`.
2. **Should the print check and the SEO artifact check become CI jobs?** Both are reproducible from their handoffs and neither is in the repo. `lane/hardening`'s call.
3. **Should `PROMPTS.md` record "never `vercel curl` against a protected deployment"?** CLI 61.1.0 creates a project-level bypass secret without asking. The working path is in `feat-recruiter-seo.md`.
4. **Remove or refresh the expired `VERCEL_OIDC_TOKEN` in `.env.local`?** Harmless at rest; it shadows a fresh token in any `vercel env run` started from the repo root.
5. **Should `BUILD_PLAN.md` §2 name merge-sync as an accepted way to bring `main` into a live lane?** The lane was synced by merge (#45) while the plan says "rebased". Unchanged from `chore-recruiter-pre-seo.md`.
6. **The last §7 box has now been a signed exception at two gates.** Whether Phase 3 closes it, and whether the JavaScript-off blank error body is accepted, re-tested after a Next upgrade or owned by hardening, is still undecided.
7. Carried forward, unchanged: the Supabase integration's first run is still unverified · `psql` is not installed on this machine · resume order is tile order, not a strict date sort · the `<dl>` keys on the entry page · bot protection is specified nowhere · registrar auto-renew and 2FA.

## Next

**A separate architecture and docs-planning session — not `lane/ingestion`, and not a build session.** By the owner's direction at this gate, the next session revises `BUILD_PLAN.md` so that only the Explorer features which consume ingested data depend on ingestion, and sequences the existing LCP diagnostic before substantial Explorer visual complexity is built.

That revision was **not** performed here: this chore changes no line of `BUILD_PLAN.md`. Two facts for whoever runs it:

- `BUILD_PLAN.md` §5 currently makes all of Pair 2 wait on Pair 1 ("Runs after Pair 1 merges, because Play Activity depends on ingested data existing"), and Pair 1's other half, `lane/ingestion`, has no session block and is not started. `handoff/feat-recruiter-resume-print.md` records that three of its four sub-branches now turn on owner decisions arising from `BUILD_PLAN.md` §9.
- Handoffs since S5 record the LCP warning, but **no document in the tree names an LCP diagnostic**. The phrase is the owner's; the planning session is where it gets written down.

No lane, sub-branch or feature was started after the gate.
