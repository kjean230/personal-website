# Handoff — chore/lcp-diagnostic

**Merged into:** `main` — opened as a PR and **left for the owner to merge**; `main-protection` requires a review GitHub will not let the author give, so it needs the owner's `--admin` path.
**Plan row:** `BUILD_PLAN.md` §5.2, the LCP diagnostic — the one chore the plan names (§2). Measurement only. One file: this handoff. No app code, no CSS, no config, no dependency, no CI job, no `lighthouserc.json` change, and no edit to any other document.

**No remediation was performed.** Nothing below authorises one. Every candidate in this file is a candidate.

## Shipped

### The answer, first

- **The LCP element is server-rendered text on all four pages, in every environment.** No image, so load delay and load duration are 0 everywhere.
- **CI's 1.8–2.8 s is a simulated number, not a measured paint.** `lighthouserc.json` uses Lighthouse's default simulated throttling. On the same CI runs the browser painted the LCP element at **62–121 ms** on most runs.
- **The simulation counts two things that do not block the paint: both preloaded fonts (87 kB) and the framework's script chunks (about 140 kB).** It includes every resource that *finished before the paint on the unthrottled run*. On localhost everything finishes before the paint, so everything is counted.
- **With throttling really applied, LCP equals first paint in 46 of 46 runs**, and first paint waits for exactly two things: the document, then the two render-blocking stylesheets. Fonts and scripts arrive afterwards.
- **Against brief §9's 1.5 s, under really-applied slow-4G throttling, production is on the line: 1,446–1,537 ms, median 1,486, 9 of 20 runs over.**
- **In a plain browser with no throttling, production paints the LCP element in 152–476 ms cold and 52–280 ms warm (80 loads, none over 1 s).**
- **`/experience` has a server cost the other three do not**, visible only on cold paths: 240–387 ms with an empty data cache locally, 238–538 ms on CI's first run, and one 1,864 ms first byte on production after hours idle.

### Starting state

- `origin/main` = `411d409` (`411d409d7a06ec1091863c7eac35c11f917fed30`), the squash of PR #50. `BUILD_PLAN.md` §5.1 and §5.2 and `handoff/chore-explorer-sequencing.md` are on it. This branch was cut from it.
- Working tree clean; no `chore/lcp-diagnostic` existed; no `lane/console-shell`, `lane/ingestion` or `lane/admin` exists.
- CI on `411d409`: all jobs green (run `36946943181`).
- Local build of `411d409`: `/` ○ · `/[section]` ƒ · `/[section]/[slug]` ● · `/resume` ○ `1h` — the route classes §5.2 names.

### Protocol

**Pages:** `/` · `/experience` · `/experience/break-through-tech` · `/resume`.

**Tools:** Lighthouse 12.6.1 (the copy `@lhci/cli` 0.15.1 installs) · Chrome 154.0.8037.93, `--headless=new` · `puppeteer-core` 24.43.1 · Node 22.20.0 · Next 16.3.3. Local machine: Apple M4, 10 cores, Lighthouse `benchmarkIndex` 4,019–4,212. CI runner: `ubuntu-latest`, `benchmarkIndex` 1,434–3,031.

**Conditions:**

| Name | What it is | Throttling | Form factor | Cache |
|---|---|---|---|---|
| Simulated | Lighthouse defaults — what `lhci autorun` runs in CI | None applied. Load is unthrottled, then *modelled* at 150 ms RTT, 1,638 kbps, CPU ×4 | Mobile, 412×823 @1.75 | Cold |
| Applied | `--throttling-method=devtools` | Really applied in the browser: 562.5 ms request latency, 1,475 kbps down, CPU ×4 | Mobile, same | Cold |
| Unthrottled | Plain page load, `PerformanceObserver` | None | Mobile 412×823 and desktop 1350×940 | Cold, then a reload for warm |

**Runs:**

| Environment | Simulated | Applied | Unthrottled |
|---|---|---|---|
| CI artifact, `main` | 3 per page (CI fixes the count) × 3 runs of `main` | — | — |
| Local, `next build && next start` | 5 per page | 5 per page, plus 6 more of `/` with traces | 5 per page × 2 viewports × cold and warm |
| Production, `https://kerwynjean.dev` | 5 per page | 5 per page | 5 per page × 2 viewports × cold and warm |

Totals: 45 CI reports · 46 local and 40 production Lighthouse runs, plus one local probe run not in the tables · 160 plain page loads. Measured 2026-10-02, 00:59–04:18 UTC.

**To rerun**, from the repo root, with reports written outside the repo:

```
npm run build && npm run start
# Simulated (CI's method); -GA also saves the trace and devtools log
node node_modules/lighthouse/cli/index.js <url> --output=json --output-path=<out>.json \
  --quiet --chrome-flags=--headless=new -GA=<out>.artifacts
# Applied
node node_modules/lighthouse/cli/index.js <url> --output=json --output-path=<out>.json \
  --quiet --chrome-flags=--headless=new --throttling-method=devtools --only-categories=performance
# CI artifact
gh run download <run-id> -n lighthouse-reports -D <dir>
```

Read from each report: `audits["largest-contentful-paint"]`, `audits["largest-contentful-paint-element"]` (the element and the four sub-parts), `audits.metrics.details.items[0]` (the `observed*` fields are what the browser really did), `audits["network-requests"]`, `configSettings`.

**To see what the simulation counted**, load a saved artifacts folder and ask Lighthouse for its own graphs:

```js
// run from the repo root; LH = node_modules/lighthouse/core
const { loadArtifacts } = await import(`${LH}/lib/asset-saver.js`);
const { LanternLargestContentfulPaint } = await import(`${LH}/computed/metrics/lantern-largest-contentful-paint.js`);
const a = loadArtifacts(dir), context = { computedCache: new Map(), settings: a.settings };
const lcp = await LanternLargestContentfulPaint.request({ trace: a.Trace, devtoolsLog: a.DevtoolsLog,
  gatherContext: a.GatherContext, settings: a.settings, URL: a.URL, SourceMaps: [], simulator: null }, context);
// lcp.timing = 0.5 * optimisticEstimate.timeInMs + 0.5 * pessimisticEstimate.timeInMs
// lcp.pessimisticEstimate.nodeTimings: every network and CPU node counted, with its simulated end time
```

The "what if" figures below re-simulate `lcp.pessimisticGraph.cloneWithRelationships(keep)` with `LoadSimulator`, dropping a class of node. They are model output, not measurements.

**Unthrottled loads:** a `puppeteer-core` script, one fresh browser context per run, that registers a `largest-contentful-paint` and a `paint` `PerformanceObserver` before navigation, waits for `load` plus 1.5 s, and reads every LCP entry, the navigation timing entry and resource timing. For text, sub-parts are: time to first byte = `responseStart`; load delay = 0; load duration = 0; render delay = LCP − `responseStart`.

Every driver script stayed outside the repo.

### The LCP element

Identical in CI, local and production, in every condition.

| Page | Mobile (412×823) | Desktop (1350×940) | Kind |
|---|---|---|---|
| `/` | `main#main > h1` — "Kerwyn Jean" | Same | Text |
| `/experience` | First entry's `p` summary — "Shipped a PySpark CDC utility…" | A later entry's `p` summary — "Designed a Neo4j graph schema…" | Text |
| `/experience/break-through-tech` | `article … > ul > li` — "Building LLM applications in Python…" | Same | Text |
| `/resume` | First row's `p` summary — "Shipped a PySpark CDC utility…" | "Designed a Neo4j graph schema…" | Text |

- Exactly **one LCP candidate in 160 of 160** plain loads: hydration and the font swap never produce a later, larger one.
- LCP equals first contentful paint in every run of every condition.

### Results — reported LCP, median [range], ms

| Page | CI simulated (n=3) | Local simulated (n=5) | Production simulated (n=5) | Local applied (n=5) | Production applied (n=5) |
|---|---|---|---|---|---|
| `/` | 1,972 [1,964–1,987] | 2,470 [2,316–2,479] | 2,069 [1,697–2,072] | 2,675 [1,370–2,679] | 1,494 [1,458–1,537] |
| `/experience` | 2,562 [1,970–2,563] | 2,471 [2,334–2,472] | 2,058 [2,054–2,232] | 1,366 [1,349–2,678] | 1,468 [1,446–1,522] |
| `/experience/break-through-tech` | 1,971 [1,967–2,560] | 2,468 [2,312–2,480] | 2,054 [1,986–2,135] | 1,359 [1,348–3,020] | 1,507 [1,466–1,522] |
| `/resume` | 2,563 [1,961–2,577] | 2,465 [2,316–2,467] | 2,030 [1,684–2,088] | 1,364 [1,358–2,676] | 1,477 [1,454–1,523] |

What the browser actually painted during the *simulated* runs (Lighthouse's `observedLargestContentfulPaint`):

| Page | CI | Local | Production |
|---|---|---|---|
| `/` | 76 [65–116] | 40 [37–48] | 230 [190–293] |
| `/experience` | 90 [86–670] | 45 [37–54] | 1,547 [236–1,558] |
| `/experience/break-through-tech` | 78 [74–78] | 42 [30–53] | 235 [192–1,547] |
| `/resume` | 77 [72–81] | 41 [28–48] | 245 [200–502] |

Unthrottled plain loads, both viewports pooled (n=10 per cell):

| Page | Local cold | Production cold | Production warm |
|---|---|---|---|
| `/` | 38 [28–52] | 204 [168–388] | 68 [56–212] |
| `/experience` | 46 [32–60] | 274 [208–412] | 126 [92–280] |
| `/experience/break-through-tech` | 48 [36–68] | 234 [188–476] | 82 [52–132] |
| `/resume` | 52 [32–60] | 246 [152–380] | 78 [52–108] |

### Sub-parts, median [range], ms

Load delay and load duration are **0 in every run**: the element is text.

| Environment and condition | Time to first byte | Render delay | Note |
|---|---|---|---|
| CI simulated | 456–457 [455–539] | 1,514–2,108 [1,506–2,120] | Both modelled |
| Local simulated | 452–453 [452–455] | 2,012–2,018 [1,860–2,027] | Both modelled |
| Production simulated | 634–637 [621–797] | 1,350–1,426 [1,050–1,500] | Both modelled |
| Local applied | 3–7 | 1,352–2,671 | **First-byte figure is not usable**: DevTools throttling delays delivery, not the recorded response start. The document finished at about 600 ms |
| Production applied | 74–96 | 1,372–1,407 | Same caveat; the document finished at about 645–780 ms |
| Local unthrottled, cold | 2–8 [2–17] | 34–50 [26–65] | Measured |
| Production unthrottled, cold | 82–116 [67–263] | 111–172 [80–285] | Measured |
| Production unthrottled, warm | 22 [20–198] | 38–102 | Measured |

### What is on the path to the paint

Read from the HTML and from traces, the same on all four pages:

- **Two render-blocking stylesheets**, external `<link rel="stylesheet">`, 2.3 kB and 2.6 kB. Nothing is inlined.
- **Two font preloads at High priority**: Inter (48.7 kB) and JetBrains Mono (40.8 kB). In `<head>` on the three static pages; in a `Link:` response header on `/experience`. All 13 `@font-face` rules are `font-display: swap`.
- **JetBrains Mono is preloaded on every page and no text in the first mobile viewport uses it** — 5 to 8 characters below the fold on three pages, none on `/resume`.
- **Nine or ten script chunks, 138–142 kB, all `async`** (plus one `noModule` file modern browsers skip).
- **Documents:** 4.5–7.3 kB compressed.
- **Unthrottled order of events (local traces):** layout at 16–20 ms → main-thread paint at 20–25 ms → framework script evaluation at 23–46 ms (about 15 ms for the largest chunk, the hydration) → paint mark at 40–45 ms. **The paint precedes script evaluation.**
- **Applied-throttling order (local, fast runs):** document done ≈600 ms → stylesheets done ≈1,232 ms → layout 1,336 ms → LCP 1,364 ms → fonts done 1,685–1,737 ms (text had already painted in the fallback) → scripts done 2,521 ms or later.
- **Production, applied:** document ≈660 ms → stylesheets ≈1,350 ms → LCP ≈1,486 ms → fonts ≈2,390 ms → scripts 2,510–4,540 ms.

### How Lighthouse arrives at the simulated figure

From its installed source (`@paulirish/trace_engine`, `lantern/metrics/LargestContentfulPaint.js` and `FirstContentfulPaint.js`):

- Simulated LCP = ½ optimistic + ½ pessimistic. **Both graphs keep every network request that had ended by the observed LCP timestamp**, except low-priority images; a script is dropped only if its evaluation started after that timestamp.
- So the figure is not "when the element could paint on slow 4G". It is "how long everything that had downloaded by the fast paint would take on slow 4G".

Recomputed from saved artifacts, all 20 local and all 20 production simulated runs:

- Both fonts (87 kB) are counted in **40 of 40** runs.
- Local: all script chunks (139–140 kB) counted in 20 of 20; the last node is always the framework chunk's evaluation.
- Production: 136–142 kB of script counted in 18 of 20. **The two runs where the 72 kB chunk had not finished before the paint are the two lowest results (1,684 and 1,697 ms).** That is the mechanism visibly producing a lower cluster.
- A local run, simulated timeline: document 0→603 ms · stylesheets →906 ms (the simulated first paint) · fonts →1,956 and 2,106 ms · scripts →2,108 and 2,408 ms · evaluation →2,470 ms.

What if, on Lighthouse's own simulator (median over 5 runs per page; a model, not a measurement):

| Counted | Local traces | Production traces |
|---|---|---|
| As measured | 2,465–2,471 | 2,030–2,069 |
| JetBrains Mono not counted | 2,314–2,318 | 1,837–1,905 |
| Neither font counted | 2,014–2,018 | 1,580–1,644 |
| Stylesheets not counted | 2,464–2,468 | 2,030–2,069 (no change) |
| Scripts not counted | 1,505–1,506 | 1,234–1,397 |
| Fonts and scripts not counted | 905–906 | 802–959 |

### `/experience`: server and data

| Measurement | Result |
|---|---|
| Local, warm, 20 requests | 5.2 ms median [3.6–30.1]; the three static pages 0.9 ms |
| Local, empty data cache, 5 restarts | **269 ms median [240–387]**, then 5–8 ms. Two data reads are cached |
| CI, first run of three, across three `main` runs | Server response 538, 238, 418 ms; later runs 10–18 ms |
| Production, warm, 10 loads | First byte 86 ms [75–160], always `x-vercel-cache: MISS` — the same as the CDN-served pages (82–116 ms) |
| Production, first request after hours idle | **1,864 ms** to first byte. One sample |
| Production, same request after 3 minutes idle | 180 ms |

- **The server cost does not move CI's reported LCP.** `/experience` at 538 ms server response reported 2,562 ms; at 12 ms it reported 2,563 ms.
- It does move the real paint: CI's observed LCP on those first runs was 323–670 ms against 73–103 ms afterwards.

### Dominant delay, per page

| Page | In CI's reported figure | With throttling really applied | Server |
|---|---|---|---|
| `/` | **Framework scripts and fonts, as modelled** — render delay 1,514 ms of 1,972 | **Network, then CSS** — document ≈44 %, stylesheets ≈46 %, layout and paint ≈10 % | Negligible: 0.9 ms local, CDN `HIT` |
| `/experience` | Same — 2,022 of 2,562 | Same split | **Server and data on cold paths only** — see above |
| `/experience/break-through-tech` | Same — 1,514 of 1,971 | Same split | Negligible warm; the first on-demand render took 431 ms locally (one sample) |
| `/resume` | Same — 2,108 of 2,563 | Same split | Negligible: CDN `HIT` or `STALE` |

- The four pages do not differ in what delays the paint. They differ only in server cost, and only `/experience` has one.
- **Client hydration is not a cause in any condition**: it runs after the paint and adds no LCP candidate.

### CI against local against production

- **Reproduced:** the mechanism, exactly. Local simulated runs report 2,312–2,480 ms while painting at 28–54 ms, the same shape as CI's 1,961–2,577 ms while painting at 65–116 ms.
- **Not reproduced: the values.** CI clusters near 1,965 and 2,560 ms; local clusters near 2,315 and 2,470 ms. Different conditions: the CI runner scores about 2,500 on Lighthouse's `benchmarkIndex` against about 4,100 locally, and the simulation depends on which requests and script evaluations beat the paint on that machine. The numbers were not normalised.
- **The earlier 1.82–2.82 s is that same range.** It is the minimum and maximum of run `36904872895` on `bda8136` (1,820 and 2,824 ms). Across the three `main` runs, 36 reports for the four pages: 1,820–2,824, median 2,530.
- **Production simulated is lower than local simulated** (2,030–2,069 against 2,465–2,471) although production really paints later (about 230 ms against 40 ms). Production serves over HTTP/2 and `next start` over HTTP/1.1; transfer sizes agree to within 1 %. The cause of the gap was not isolated. Either way, the simulated figure does not track the real one.

### Unexplained

1. **Why CI's two clusters sit where they do.** In all 15 reports of run `36946943181`, both fonts and all but one 1 kB script had finished before the paint, in both clusters. CI artifacts hold reports, not traces, so the cause cannot be read. The production runs show a missing 72 kB chunk producing a lower result; whether script-evaluation timing does the same on CI is a hypothesis, not a finding.
2. **A delayed first frame, inside Lighthouse runs only.** In 9 of 26 local applied runs and 4 of 20 production simulated runs, first paint landed about one second late (2,672–3,020 ms locally; 1,547–1,558 ms on production). Traces show the main thread had already laid out, painted and committed — at 1,678 ms in the local trace, 515–706 ms in the production ones — with no network or script work in the gap. It does not track script evaluation: 4 of 5 slow traced runs had a large chunk evaluated before the first paint, but so did 5 of 21 fast ones. It appeared in **0 of 160** plain loads and 0 of 20 production applied runs. Cause inside Chrome not established.
3. **How often the `/experience` function is cold on production.** One 1,864 ms sample; it could not be provoked again.

### Remediation candidates — none applied

Smallest first. Each is tied to a measured cause above.

| # | Candidate | Measured cause | Expected effect | Cost and uncertainty |
|---|---|---|---|---|
| 1 | **Decide what conditions brief §9's 1.5 s is judged under**, and whether the CI assertion should measure that | CI's figure is a model that counts non-blocking fonts and scripts; the real paint is 62–121 ms on the runner | No performance change. Under `throttlingMethod: "devtools"` CI would report the real throttled paint | A `lighthouserc.json` edit, which this chore may not make. The delayed-frame runs (9 of 26 locally) would make a hard assertion flaky |
| 2 | **Stop preloading JetBrains Mono** — the `preload` option on that `next/font` call in `app/layout.tsx` | 40.8 kB at High priority on every page, used by no first-viewport text | Model: about −150 ms local, −150 to −230 ms production. Real paint: unchanged, the font is not on the path | One option. Mono text would swap in later |
| 3 | **Stop preloading Inter as well** | Both fonts are counted in 40 of 40 simulated runs | Model: about −450 ms. **Still above 1.5 s** in the model (2,016 local, 1,580–1,644 production) | Body text swaps later; layout shift is 0 today and was not measured for this case |
| 4 | **Inline the two stylesheets** — Next's `experimental.inlineCss` | Under applied throttling the stylesheet round trip is about 635–700 ms of a 1,364–1,486 ms first paint | Real throttled paint: the stylesheet round trip goes; magnitude not measured. Model: **no change** to the simulated figure | An experimental flag affecting every page |
| 5 | **Render `/[section]` statically** | 240–387 ms cold data reads; one 1,864 ms cold function start | Removes both from `/experience` | Touches the URL contract: `?facet=` is what makes the route per-request (`handoff/feat-spine-routes.md`). Evidence for the cold start is one sample |
| 6 | **Ship less script before first paint** | Scripts are the larger half of the simulated figure: not counting them gives 1,505 ms local, 1,234–1,397 ms production | Model only; the real paint already precedes script evaluation | No single knob. Every client island `lane/console-shell` adds pushes the simulated figure the other way |

**No single candidate brings the simulated figure under 1.5 s.** In the model it takes both the fonts and the scripts out (802–959 ms), or scripts alone on production traces (1,234–1,397 ms).

### Files changed

| File | Change |
|---|---|
| `handoff/chore-lcp-diagnostic.md` | New — this file |

### Verification

- **Diff:** this one file against `origin/main`. `lighthouserc.json`, `package.json`, `package-lock.json`, `.github/`, `app/`, `lib/`, `design/` and every other handoff are unchanged.
- **No driver in the repo:** every script, report, trace and artifact was written to a scratch directory outside the working tree; `git status` stayed clean through all 87 Lighthouse runs and 160 page loads.
- **Local state touched, none of it tracked:** `.next/` was rebuilt, and `.next/cache/fetch-cache` was emptied five times for the cold-data samples. No tracked file and no configuration changed.
- **Added-line checks** over the staged diff, with the scanner the last chore used, kept out of the repo: prohibited terms with the two regexes read out of `design/tokens/build.mjs` — **0** · brief §2.1's other names — **0** · contact literals — **0** · the Supabase project ref — **0** · secret shapes — **0 real**, one false positive: the 40-hex pattern matches the full commit id of `main` quoted under Starting state, which is public. Every canary fired in the same run.
- **§5.2 acceptance:**
  - [x] The LCP element is identified on all four pages, in every environment measured
  - [x] Sub-part timings are reported with run count, median and range
  - [x] Each page's dominant delay is named with its evidence; the unexplained remainder is reported as unexplained
  - [x] The CI figure is reproduced locally in mechanism; the gap in values is reported
  - [x] The protocol is written so a second person can rerun it
  - [x] Remediation options are listed smallest first, each tied to a measured cause — and none is applied

## Deviated from plan

- **Production measurement tripped Vercel's automatic mitigation, once.** A burst of 80 `curl` requests (20 per route, 0.3 s apart) was answered normally 18 times and then with `403`, `x-vercel-mitigated: challenge` and the Security Checkpoint page. All requests stopped. It had cleared eleven minutes later, checked with one request every three minutes. **No attempt was made to get past the challenge**, and no Vercel setting was read or changed. Every later production run was paced (8–12 s between Lighthouse runs, 4 s between page loads), checked for the checkpoint, and none was challenged. The timing summary from that burst is not used; production first-byte figures come from the paced runs.
- **Two extra `main` CI artifacts were read** (`36925485112`, `36904872895`) beside the current one, because three runs per page is too few to see CI's clusters. The current run remains the primary evidence.
- **An extra condition was measured that §5.2 does not name: applied throttling.** Without it there is no measurement of the real throttled paint to hold against the simulated one.
- **Six extra applied runs of `/`** were taken with traces, to catch a slow run for inspection.
- **A "what if" analysis ran on Lighthouse's simulator.** It is model output and is labelled so wherever it appears.
- **`/certifications` was not measured.** §5.2 names four pages; CI audits it and its reports show the same pattern.
- **The session ran in an existing conversation**, not a new one, and was interrupted once by the harness's own API connection. No measurement was lost or repeated.
- **No subagents were used** (`PROMPTS.md` → Tooling posture).

## Deferred

- **Headed-browser and real-device measurement.** Everything here is headless Chrome on one machine. Whether the delayed first frame exists outside Lighthouse was answered only by 160 headless plain loads.
- **Field data.** The site has no real-user measurement and this chore added none.
- **Cold-function frequency for `/experience`** on production: one sample.
- **Layout shift if font preloads change.** Not measured.
- **Desktop Lighthouse runs.** Desktop was measured unthrottled only.
- Unchanged from earlier handoffs: no `PROMPTS.md` session block exists for this chore or for `feat/shell-boot-profile` · the local `.git/config` still sets `commit.template` to the literal `commit.gpgsign`; this chore committed with `-F`.

## Open questions for owner

1. **Under what conditions is brief §9's "LCP < 1.5s" judged?** This decides whether the criterion is met.
   - Simulated slow 4G, as CI runs today: **not met** — 1,684–2,824 ms everywhere.
   - Really-applied slow 4G: **borderline** — production 1,446–1,537 ms, 9 of 20 over.
   - A real browser, no throttling: **met by a wide margin** — production 152–476 ms cold.
2. **Is any remediation scheduled?** Per `BUILD_PLAN.md` §5.1 and §8 this is a separate decision and is not a condition for cutting `lane/console-shell`.
3. **Should the CI assertion change method** (candidate 1)? It is a `lighthouserc.json` edit and the delayed-frame runs would need handling first.
4. **Is one challenged burst worth a rule?** A written cap on request rate for any future session that measures production would have prevented it.
5. **Does `lane/console-shell` get a script-and-font ceiling for the simulated figure?** Every client island it adds raises the number CI reports, whatever happens to the real paint.

## Next

**`lane/console-shell` may be cut once this handoff is on `main`** — `BUILD_PLAN.md` §5.1, step 2a: "The LCP diagnostic's handoff is on `main`. Nothing else is required." It is cut from `main`, and its first sub-branch is `feat/shell-boot-profile`.

Merging this PR is the owner's step. Whether to schedule any candidate above is a separate decision that does not hold the lane.

`lane/ingestion` was never waiting on this and still waits only on its §8 owner items.

Not started. No lane, sub-branch or fix was begun in this session.
