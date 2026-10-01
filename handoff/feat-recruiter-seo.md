# Handoff — feat/recruiter-seo

**Merged into:** `lane/recruiter`
**Plan row:** `BUILD_PLAN.md` §5, Phase 1, Pair 1, `lane/recruiter` — the `feat/recruiter-seo` sub-branch, the lane's last. Session block: `PROMPTS.md` → `## Pair 1 — lane/recruiter`, Session B. Scope as run: sitemap · robots · Open Graph image · JSON-LD · `alternates.canonical` · `metadataBase = https://kerwynjean.dev`. Nothing else.

## Shipped

### Starting state and SHAs

- **Verified first-hand before any change:**
  - `origin/main` = `2474032` and `origin/lane/recruiter` = **`9af6ba4`** (0 behind, 3 ahead: #38, #45, #46). The local checkout was clean.
  - `.git/info/exclude` was stock.
  - `feat/recruiter-seo` existed neither locally nor on origin.
  - The only open PRs were the five Dependabot ones into `main`.
  - Lane CI was green on `9af6ba4`, `47ed7c5` and `25b82b3`.
  - The lane carried #38's contact block, print rules and `--color-ink-muted`.
- **Branch:** cut from `origin/lane/recruiter` at `9af6ba4`, with its upstream unset so a bare push could never reach the lane.
- **Implementation commit: `67f343d`** (`67f343ddf31de64a75f8faf4c183b9f22119393c`). It is the SHA every check below ran against. This handoff is a docs-only commit on top of it.
- **Baseline on `9af6ba4`, before anything moved:**
  - lint 0 · typecheck clean · test **191 / 19** · tokens:check ok (58 static, 19 themed, 68/68) · build clean;
  - route modes `/` ○ · `/_not-found` ○ · `/[section]` ƒ · `/[section]/[slug]` ● · `/icon.svg` ○ · `/resume` ○ `1h`;
  - client chunks: 13 files, 595,146 B of JS, SHA-256 list kept.
- **Production before:** `https://kerwynjean.dev` 404'd `/robots.txt`, `/sitemap.xml` and `/opengraph-image`.

### Files changed

22 files, +789 / −23, plus this handoff.

- **New:**
  - `app/sitemap.ts`, `app/robots.ts`
  - `app/opengraph-image.tsx`, `app/og-mark.ts`
  - `app/json-ld.tsx`, `lib/render/json-ld.ts`
  - six test files: `lib/site.test.ts`, `lib/render/json-ld.test.ts`, `app/json-ld.test.tsx`, `app/robots.test.ts`, `app/og-mark.test.ts`, `app/opengraph-image.test.tsx`
- **Edited:**
  - `lib/site.ts`, `lib/routes/table.ts`, `lib/routes/load.ts` (+ `load.test.ts`)
  - `app/layout.tsx`, `app/page.tsx`, `app/resume/page.tsx`
  - `app/[section]/page.tsx`, `app/[section]/[slug]/page.tsx`
  - `CLAUDE.md`
- **Untouched** (staged diff empty): `contact.tsx` and its test, `app/app.css`, `app/site.module.css`, `app/(explorer)/`, `design/`, `next.config.ts`, `package.json`, `package-lock.json`, `.github/`, `lighthouserc.json`, `supabase/`.
- **No new dependency.** `next/og` ships inside `next`.

### Metadata architecture

Each rule below was measured against Next 16.3.3's installed resolver (`node_modules/next/dist/lib/metadata/resolve-metadata.js`), not taken from memory.

- **`metadataBase` = `new URL(SITE_URL)`**, set once in `app/layout.tsx`. `SITE_URL = "https://kerwynjean.dev"` and `absoluteUrl(path)` live in `lib/site.ts`. `absoluteUrl` refuses anything not site-relative (`//host`, absolute URLs, bare words).
- **Canonical is never set in the layout.** Metadata merges shallowly, root first, so the 404 page would inherit it. Each page states its own as a route-table path.
- **No page sets `openGraph`.** `mergeMetadata` replaces `openGraph` wholesale, and `mergeStaticMetadata` merges the file-based image only at the segment holding the file. A page-level `openGraph` therefore silently drops the root image.
- **The layout sets only `openGraph: { type: "website", siteName }`.** `og:title` and `og:description` come from each page's title and the layout's description (`inheritFromMetadata`). `postProcessMetadata` fills `twitter:title`, `twitter:description` and `twitter:image` from OG, and `resolveTwitter` sets `card = summary_large_image`. No `twitter-image` route exists.
- **`og:url` is deliberately absent:** it would need a page-level `openGraph`.

### Canonical behaviour

| Route | Canonical |
|---|---|
| `/` | `https://kerwynjean.dev` (Next drops the root slash; the sitemap's `https://kerwynjean.dev/` is the same URL) |
| `/resume` | `/resume` |
| `/<section>` | `sectionHref(section)` |
| `/<section>/<slug>` | the loader's own `href`, the same URL a wrong-section request 308s to |
| unknown section, missing slug, invalid `?facet=` | **none** (verified: every 404 carries zero canonicals) |

**Facets:** every `?facet=` view canonicalises to the **bare section URL**. It is a subset of the section's list, not a page of its own, and is never in the sitemap. The page code already parses `?facet=` in `generateMetadata` (to withhold the canonical from an invalid facet), so this adds no request-time work: `/[section]` was already ƒ.

### Sitemap

- `app/sitemap.ts` → `loadSitemap()` in `lib/routes/load.ts`.
- Order: `/`, `/resume`, then each `SECTIONS` section followed by its entries in tile order.
- Reads: one `listSection(kind, {})` per kind of every section, so all seven `KINDS` are covered through the route table and adding a section stays one `SECTIONS` entry.
- **27 URLs today:** `/`, `/resume`, 6 sections, 19 entries.
- **Never included:** a `?facet=` URL, `/privacy` or `/admin`.
- **`lastModified`:** entries only, from `updated_at` verbatim. The row trigger stamps it on every UPDATE, and `seed.content.sql` upserts only `where … is distinct from`, so re-seeding unchanged rows does not move it. Home, resume and section URLs carry none.
- **No `priority` or `changefreq`.** Nothing supports a value.
- **Mode:** ○ with a 1h revalidate, through the tagged fetch cache. It reads no file.

### Robots

`app/robots.ts` emits exactly:

```
User-Agent: *
Allow: /

Sitemap: https://kerwynjean.dev/sitemap.xml
```

- **No `Disallow`.** The reserved routes have no page, robots.txt is not access control, and a `Disallow: /admin` would only advertise the path. This follows Session B's "reserved routes belong in neither".
- **Mode:** static ○.

### JSON-LD

Every block comes from `lib/render/json-ld.ts` and is rendered only by `app/json-ld.tsx`.

**Serialiser:** `serializeJsonLd` = `JSON.stringify(value).replace(/</g, "\\u003c")`. **Every** `<` becomes `<` (a global regex), so no `</script` or `<!--` can close the element, and the data is unchanged for any JSON parser. `CLAUDE.md` now names this as the one exception to `markdown.ts` being the only raw-output point, as Session B required.

**Schemas, and why each:**

- **`/` → `WebSite {name, url}`.** The site's name and origin are the only facts the home page asserts.
- **`/<section>` → `BreadcrumbList`:** SITE_NAME → section label.
- **`/<section>/<slug>` → `BreadcrumbList`:** SITE_NAME → section label → entry title. These are route-table facts only; titles from the database pass through the `<` escape.
- **`/resume` → `ProfilePage { mainEntity: Person {name, url, sameAs} }`.**
  - `sameAs` is the LinkedIn and GitHub URLs, **imported from `CONTACT`**, never retyped. `contact.tsx` stays the only file holding the values and `/resume` the only page rendering them.
  - Email and location are **excluded**, by the owner's choice this session.
- **Deliberately not done:** no job title, description, image or employer. No per-kind schema types (credential, organisation): those would read meaning into `subtitle`, which the schema does not type.

### Open Graph image

- **One site-wide image:** `app/opengraph-image.tsx`, 1200×630 PNG, `alt = "KJ monogram"`. It is the KJ badge from `design/assets/mark/kj-badge.svg` (the single source, read by `og-mark.ts` with a literal path), centred on the light paper surface.
- **Mark only, no text.** `next/og` bundles only Geist (`node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf`); DESIGN.md's type is Inter, and the repo commits no fonts. Owner's choice this session.
- **Colours.** Satori and resvg cannot resolve CSS custom properties, so `resolveColorFallbacks` substitutes each `var(--color-*, #fallback)` with its fallback. `build.mjs` guarantees each fallback is the light token. The background is `tokens.json` `themes.light["--color-surface"]`, read and never edited. `og-mark.test.ts` pins every substituted hex to its token.
- **The image was viewed, not just measured:** paper ground, saffron tile, ink outline and stencil.
- **Build-time, not request-time.** It uses no request-time API and no fetch:
  - the build table shows `○ /opengraph-image`;
  - `prerender-manifest.json` has `initialRevalidateSeconds: false`;
  - `.next/server/app/opengraph-image.body` is a 23,484 B PNG with IHDR 1200×630, hash suffix `?05b1f338b91b929c`.
- **No `runtime` export.** Node.js is the default and `'edge'` is deprecated.

### File tracing

- **The OG route's own trace lists the badge.** The emitted artifact is `.next/server/app/opengraph-image/route.js.nft.json`: 242 files, including `design/assets/mark/kj-badge.svg` plus next/og's `resvg.wasm`, `yoga.wasm` and `Geist-Regular.ttf`.
- **`outputFileTracingIncludes` is not merged into per-route `.nft.json` in this Turbopack build.** It sits only in `.next/required-server-files.json` (unchanged: `/[section]` and `/[section]/[slug]` → `./design/assets/icons/**`).
- **Turbopack's traces are coarse.** The OG, sitemap and pre-existing `icon.svg` traces all list every one of the 29 icons, which none of them reads. The over-inclusion is harmless and is a tracer property, not something this branch does.
- **Decision under the approved rule: no `next.config.ts` change.** The route is a build-time prerender, nothing in the codebase can re-render it at runtime (revalidation is tag-only and this route has no tagged fetch), and the badge is traced anyway.

### Preview deployment verification

- **Deployment:** the push of `67f343d` deployed `personal-website-657npohk7-kjean.vercel.app` (target `preview`, Ready, created 2026-09-30 00:30:47 UTC). Alias: `personal-website-git-feat-recruiter-seo-kjean.vercel.app`. Previews are SSO-gated: an unauthenticated request gets 302 → `vercel.com/sso-api`.
- **Final access path: a short-lived development OIDC token** sent as `x-vercel-trusted-oidc-idp-token`, the method in the Vercel `access-protected-vercel-deployment` skill.
  - The token was obtained by `vercel env run --cwd <empty scratch dir> --project personal-website`.
  - Claims: `environment=development`, `project=personal-website`, issued 2026-09-30 21:34:41 UTC, expiring 2026-10-01 09:34:41 UTC. The token was never printed.
  - The first single request (`/robots.txt`) returned 200, and the project was re-checked before anything else (0 bypass entries, protection unchanged).
  - The scratch directory stayed empty throughout.
  - How we got here, including the abandoned first attempt, is under Deviated.
- **The direct-check script** is kept out of the repo, like the print driver. It assumes nothing about the sitemap: section pages are scraped for entry links, and the contact `<address>` for `sameAs`.
- **Result: 70/70 pass on the preview; 70/70 pass locally against `next start`:**
  - robots.txt: exact body, `text/plain`.
  - **Sitemap URL set = the route table, entry by entry:** 27 URLs, none missing, none extra, no duplicates, all absolute on `kerwynjean.dev`, no `?`, no reserved route, `lastmod` on entries only, no other fields.
  - **Every one of the 27 URLs, plus all 7 live facet views**:
    - status 200;
    - exactly **one** `<link rel="canonical">`, inside `<head>`, equal to the expected `kerwynjean.dev` URL (facet → bare section);
    - `og:image` with width 1200, height 630, alt and `image/png`;
    - `og:title` = `<title>`, `og:type` `website`, `og:site_name`, and `og:description` = the description;
    - no `og:url`;
    - `twitter:card` `summary_large_image`, with twitter image and title equal to OG's;
    - exactly one JSON-LD block, containing no `<`, which `JSON.parse` accepts.
  - **JSON-LD shape per route class:**
    - `/`: exact `WebSite`;
    - section and entry pages: `BreadcrumbList` with exact positions, names (from the rendered `<h1>` and section label) and absolute items;
    - `/resume`: `ProfilePage`/`Person` with exactly the expected keys, and `sameAs` equal to the contact block's two `https` links, in order, with no email, `mailto` or location.
  - Canonical and `og:image` are in `<head>` for browser, Googlebot and facebookexternalhit UAs on `/`, `/experience`, an entry, `/resume` and a facet view.
  - `/bogus`, `/experience/no-such-slug` and `/experience?facet=bogus` → **404 with zero canonicals**. `/projects/break-through-tech` → **308** to `/experience/break-through-tech`.
  - `/opengraph-image?05b1f338b91b929c`: 200, `image/png`, PNG signature, IHDR 1200×630, 23,484 B. **The preview PNG is byte-identical (SHA-256) to the local build's.**
- **Cache evidence on the preview** (also the §7 rate-limit answer):
  - OG image: `x-vercel-cache: PRERENDER`, `x-matched-path: /opengraph-image`;
  - robots and sitemap: `x-vercel-cache: HIT` (ages 127 s and 93 s);
  - all three carry `x-robots-tag: noindex`, Vercel's own preview header.
- **Function list (`vercel inspect --json`).** The deployment includes a function bundle for `opengraph-image` (λ, 10,497,691 B). Every App Router route gets one, including the static ○ `index` and `resume`; it backs the prerender. Requests are answered from the prerender (`PRERENDER` above), and the bundle's trace includes the badge.
- **Preview social images use `VERCEL_BRANCH_URL` — framework behaviour, accepted.**
  - On the preview, every `og:image` and `twitter:image` is `https://personal-website-git-feat-recruiter-seo-kjean.vercel.app/opengraph-image?05b1f338b91b929c`, not the canonical origin.
  - Next 16.3.3 does this **only when `VERCEL_ENV === "preview"`**. `resolve-opengraph.js:86-87` routes the `opengraph-image` file convention (`isStaticMetadataRouteFile`) through `getSocialImageMetadataBaseFallback(metadataBase)` even when `metadataBase` is set. `resolve-url.js:58-69` returns `VERCEL_BRANCH_URL || VERCEL_URL` when `NODE_ENV === 'production' && VERCEL_ENV === 'preview'`, otherwise `metadataBase`.
  - **A local production-mode build** (no `VERCEL_ENV`) **emits `https://kerwynjean.dev/opengraph-image?…`**, verified 70/70.
  - **On production this is inferred from that source, not yet observed.** It is the first item under Deferred.
  - The preview run therefore pinned the check's social-image origin to the branch URL **for that run only**, through an explicit `OG_ORIGIN`. Every other assertion was unchanged, canonicals on `kerwynjean.dev` included, and the local run was re-done with the default origin (70/70) to show the parameter weakened nothing.
  - **The owner accepted this behaviour; the implementation was not changed for it.** Forcing the canonical origin into previews would mean declaring OG images by hand, which reintroduces the page-level `openGraph` trap and points preview cards at an image production does not yet serve.

### Tests and local verification

- **28 new tests, 6 new files.** `npm test` **191 → 219 passed**, **19 → 25 files**. No config change; every new module uses relative imports (the Vitest no-alias idiom).
  - `lib/site.test.ts`: the origin pinned literally; `absoluteUrl` resolves route paths and refuses `//evil.test`, absolute URLs, bare words and `""`.
  - `lib/render/json-ld.test.ts`: no `<` survives; every `<` is replaced, not only the first; a `</script><script>…` title round-trips through `JSON.parse`; `&` survives; exact builder shapes; `sameAs` is copied, not aliased.
  - `app/json-ld.test.tsx`: React's real server output is exactly one `application/ld+json` script, whose body parses back and holds no `<`.
  - `lib/routes/load.test.ts`, 6 new tests for `loadSitemap`:
    - the exact order;
    - exactly the route table's URL set, with no duplicates;
    - no facet or reserved URL;
    - one `listSection` per `KINDS` entry, with `{}` options;
    - `lastModified` = `updated_at` on entries only;
    - a query error rejects untouched.

    Its fixtures use synthetic `sample-*` slugs so no test reads as a claim about the owner.
  - `app/robots.test.ts`: the exact object; no `disallow`; neither reserved route.
  - `app/og-mark.test.ts`: a base64 SVG data URI; no `var(` left in any attribute; every substituted hex equals its light token; background = `--color-surface`; the resolver touches only `--color-*` references.
  - `app/opengraph-image.test.tsx`: `next/og` **does** run under Vitest's node environment, so this renders the real image. It checks the PNG signature, IHDR 1200×630 and more than 2 KB, plus the `size`, `contentType` and `alt` exports.
  - **Page wiring is proved on the built HTML** by the script above, not by unit tests: the page files use `@/` imports, which Vitest cannot resolve. This covers canonical per route, the effect of `metadataBase`, and head placement.
- **Final local suite on `67f343d`:** lint **0** · typecheck clean · test **219 / 25** · tokens:check ok (58 static, 19 themed, 68/68, 29 icons, 2 mark files) · build clean.
- **Route modes:** the six existing routes are **unchanged**. Three metadata routes are new: **`/opengraph-image` ○**, **`/robots.txt` ○**, **`/sitemap.xml` ○ `1h`**.

### Client bytes and budgets

**Raw chunk bytes: not byte-identical, attributed.**
- The chunk set is still 13 files, but JS fell **595,146 → 582,108 B (−13,038)**.
- The `next/link` chunk (`1mpnoxox0-4cg.js`, 23,131 B) became `22i43cg4l4-dq.js` (8,868 B). It had carried **15 Next framework modules duplicated** from the unchanged chunk `3fntmmi971322.js` (`ClientPageRoot`, `ClientSegmentRoot`, `HTTPAccessFallbackBoundary`, …).
- The 4 modules that survive in the Link chunk are identical apart from minifier-renamed locals (same byte length).
- The Turbopack runtime chunk changed with them.
- **None of this branch's code reached the client:** 0 chunks contain `ld+json`, `serializeJsonLd`, `BreadcrumbList`, `ProfilePage`, `kerwynjean.dev`, `opengraph`, `sitemap`, `u003c`, `resolveColorFallbacks` or `loadSitemap`.

**Bisect.** With only the three metadata routes set aside and everything else applied (`metadataBase`, canonicals, OG and twitter tags, JSON-LD), the chunks are **byte-identical to `9af6ba4`'s**. Builds are deterministic: a stash-rebuild of `9af6ba4` reproduced its hashes exactly.

**Script transfer: +1,356 B on every audited route**, against a **same-commit Lighthouse baseline** (`9af6ba4` stashed-rebuilt, 1 run per URL; script transfer is deterministic):

| Routes | Before → after |
|---|---|
| `/`, `/resume` | 142,108 → **143,464** |
| `/experience`, `/certifications`, `/experience/break-through-tech` | 143,152 → **144,508** |

The parts sum exactly:
- Link chunk 7,160 → 4,004 (−3,156);
- shared chunk `3fnt…` now fetched (+4,057);
- runtime 4,247 → 4,702 (+455).

Two smaller files compress worse than one larger one. Headroom against the **250,000 B** cap is **105,492 B** (was 106,848).

The figures `feat-recruiter-resume-print.md` recorded (142,100 / 143,144) came from an Aug-30 build whose chunk set differs by one file (`07660…` vs `3n1h…`). They are within 8 B, but they are not this tree's baseline.

**HTML document:** +531 to +748 B per route (head tags plus JSON-LD).

**Lighthouse** (`lhci autorun`, 3 runs × 5 URLs, this run's 15 reports only):
- **accessibility 1.00 on every run**;
- SEO 1.00, best-practices 1.00, performance 0.96–0.98;
- `canonical` and `robots-txt` audits 1;
- totals 256,693–265,846 B against **500,000 B**;
- **no assertion errors**; the only output is the warn-level LCP (~2.46 s) every sub-branch since S5 has recorded.

### Sweeps, scope and attribution

- **Sweeps, over the staged diff's added lines (789):**
  - `PROHIBITED_TERMS`, both regexes read programmatically out of `design/tokens/build.mjs` rather than typed here: **0 hits**, OG alt text and JSON-LD strings included. A manual pass for brief §2.1's other names (the console product word and the three other publishers): 0.
  - Contact leak, in `CLAUDE.md`'s shape (the three markers its Print bullet names, the domain one anchored) over the 772 added lines outside `app/resume/`: **0**. The 17 added lines inside `app/resume/` carry **no** contact literal either, because `CONTACT` is imported.
- **JS-off and print:** every SEO artifact above was checked on raw HTML with no JavaScript run. No page's markup changed apart from one `display: none` script element, and no client component was added. Print CSS is untouched (diff empty), so the print proof in `feat-recruiter-resume-print.md` stands; it was not re-run.
- **Attribution on `67f343d`:** `%(trailers)` empty; author = committer = the owner.

## Deviated from plan

- **Preview access needed three attempts; one created, and then revoked, a persistent secret.**
  - **What the plan said:** reach the preview with `vercel curl` "with your session, no bypass secret".
  - **What happened:** **Vercel CLI 61.1.0's `curl` (beta) generated a Protection Bypass for Automation secret on the project the first time it met the protected deployment.** Its own stderr said "Generating one now… Successfully generated deployment protection bypass token". The entry had `scope: automation-bypass`, `isEnvVar: true` (also exposed to deployments as `VERCEL_AUTOMATION_BYPASS_SECRET`), and was created 2026-09-30 03:46:11 UTC. **Exactly one request** went through it (`/robots.txt`: 200, exact body).
  - **Revocation, on the owner's instruction:** `PATCH /v1/projects/{id}/protection-bypass` with `{"revoke": {"secret": …, "regenerate": false}}`. The schema was read from the CLI's cached OpenAPI spec first, because an empty body **generates** a new secret. The secret passed only through a 0600 temp file, deleted immediately, and was never printed.
  - **After revocation:** **0 bypass entries**. Deployment Protection unchanged (SSO `all_except_custom_domains`, no password, no trusted IPs). Re-checked after every later step.
  - **First OIDC attempt** (`vercel env run` from the repo root) **failed with 302**. The git-ignored `.env.local` holds a single key, an expired `VERCEL_OIDC_TOKEN` (issued 2026-08-25 02:43 UTC, expired 14:43 UTC the same day), and it shadowed the freshly downloaded one. `.env.local` was **not** modified (mtime 2026-08-24).
  - **Second attempt,** from an empty scratch directory with `--project personal-website`, **succeeded**, as described above.
- **The preview's social-image origin differed from the plan's expectation.** The plan expected `og:image` on `kerwynjean.dev`; the preview uses the branch URL. The owner accepted it as Next's preview-environment behaviour (Shipped, above).
- **The plan expected byte-identical client chunks; they are not** (+1,356 B script per route). Attributed by bisect to the three metadata routes (Shipped, above).
- **The first preview run of the check script crashed at its final step.** It derived the OG fetch path by stripping `kerwynjean.dev` from a branch-origin URL. The pages had already been fetched, and that run's results were discarded.
- **CI on the branch.** The plan said "all 8 jobs on the branch, then on the PR", but `ci.yml` triggers only on pushes to `main` / `lane/**` and on PRs into them, so CI runs on the PR only.
- **No subagents were used** (`PROMPTS.md` tooling posture). **The Gemini second-gaze checkpoint was not run:** it is the owner's manual loop and was not requested this session.

## Deferred

- **Post-gate production verification (required, not optional).** After `lane/recruiter` → `main` reaches production, fetch representative pages from `https://kerwynjean.dev`: `/`, `/experience`, an entry page, `/resume` and a `?facet=` view. Verify:
  - `og:image` **and** `twitter:image` both begin with **`https://kerwynjean.dev/opengraph-image?`**;
  - that OG URL returns **200 `image/png`**, a 1200×630 PNG, matching the build artifact;
  - `/robots.txt` and `/sitemap.xml` serve the bodies above.

  Production has Deployment Protection off, so plain HTTPS works there and no authenticated request is needed. Until this runs, production social-image origin is **inferred from Next's source, not observed**.
- **These checks have no CI safety net.** Lighthouse SEO scored 1.00 before and after, as `PROMPTS.md` predicted. The check script lives outside the repo; it is described in Shipped and is reproducible from that description. Committing it as a CI job, against `next start` like the Lighthouse job, is a new job and therefore `lane/hardening`'s call, the same open question `feat-recruiter-resume-print.md` raised for print.
- **Not done, deliberately:**
  - per-entry OG images (request-time, and the tracing trap);
  - per-kind schema types;
  - `og:url`;
  - per-page `description`s (entry summaries would be the natural source — a content-surface decision);
  - Session B's optional polish (facet icons, an "Other" chip for `count.unfaceted`): **neither was done.**
- **`lastModified` under-reports some edits.** `updated_at` moves on entry-row edits only; a link, tag or relation change does not touch it.
- **`.env.local` still holds the expired OIDC token.** It shadows fresh tokens in any `vercel env run` started from the repo root. It is the owner's file and was left as found.
- Unchanged from earlier handoffs and not touched here:
  - security headers and `/privacy` (Phase 3);
  - LCP;
  - analytics;
  - the keep-warm workflow;
  - ingestion;
  - the four-page printed resume;
  - the Dependabot PRs (#31, #32, #42, #43, #44).

## Open questions for owner

1. **Should the repo record "never `vercel curl` against a protected deployment"?** As of CLI 61.1.0 it creates a project-level bypass secret without asking. The working path is `vercel env run --cwd <empty dir> --project personal-website` plus the `x-vercel-trusted-oidc-idp-token` header. `PROMPTS.md`'s tooling posture is the natural home; this sub-branch did not edit it.
2. **Remove or refresh the stale `VERCEL_OIDC_TOKEN` in `.env.local`?** Harmless at rest, but it silently defeats the documented `vercel env run` flow from the repo root.
3. **Should the SEO artifact checks become a CI job** (`lane/hardening`)? See Deferred.
4. Carried forward, unchanged: every open question in `handoff/feat-recruiter-resume-print.md` and `handoff/chore-recruiter-pre-seo.md`.

## Next

**The `lane/recruiter` → `main` gate** (`BUILD_PLAN.md` §7): the owner's signature, not a sub-branch. `feat/recruiter-seo` was the lane's last sub-branch. Immediately after the gate reaches production, run the **post-gate production verification** under Deferred. `lane/ingestion`, Pair 1's other half, is still unwritten on purpose, and Pair 2 runs only after Pair 1 merges.
