# Build Brief — Interactive Portfolio with Console-Style UI

> **Sequencing authority:** `BUILD_PLAN.md`. Where §8 of this document and the plan disagree on *order, branching, or lane composition*, the plan wins. This document remains authoritative on *scope, constraints, and requirements*.

**Repo:** `git@github.com:kjean230/personal-website.git` · public · MIT
**Owner:** kjean230
**Role for you:** Plan, decompose across sub-agents, and execute. Scope decisions below are settled — do not relitigate them. Flag genuine blockers; ask before inventing content.

---

## 1. Product summary

A personal portfolio serving two audiences from one dataset, chosen at entry via a **profile-select screen** (console "select a user" pattern):

- **Recruiter mode** — plain, fast, semantic, scannable. Server-rendered, canonical for SEO, works with JS disabled. Default for `/`, crawlers, and anyone arriving from an application link.
- **Explorer mode** — a handheld-console shell: tile grid, D-pad/keyboard/gamepad navigation, trophy case, play-activity charts, notification toasts.

Same data, same URLs, two renderers. Explorer is an **enhancement over** a working site, never the only way in.

### Audiences

Recruiters and hiring managers (60-second scan), students, fellow data engineers and coworkers, and gaming-literate visitors who will recognize and enjoy the shell.

---

## 2. Hard constraints

### 2.1 Intellectual property — non-negotiable

The reference screenshots in the owner's possession contain Nintendo, Disney, Capcom, and Square Enix assets. **None of that ships.** What is being borrowed is *interaction grammar*, which is not protectable:

- Flat, high-contrast, no skeuomorphism
- Thick rounded-square tiles in a horizontal, recency-ordered row
- Bottom utility rail of circular icons
- Top status bar (avatar left; clock/status right)
- Corner button hints (`A Select` / `B Back` style)
- Near-instant transitions, minimal click/beep sound design

**Prohibited:** Joy-Con silhouettes or the red/blue Joy-Con pairing, the Switch wordmark or logotype, the Switch boot chime, Nintendo typefaces, any first-party character or box art, any rendered console hardware, the phrase "Nintendo Switch" as branding anywhere in the UI or metadata.

**Required:** an original console identity — own wordmark, own accent palette (do not default to red/blue), own icon set drawn from scratch, own boot chime. Ship a short `DESIGN.md` recording this distinction so the intent is legible to anyone reading the public repo.

### 2.2 Accessibility

The console shell must not degrade the site. Non-negotiable:

- Every tile resolves to a real, shareable URL (`/experience/guardian`) — no state-only navigation
- Full keyboard operation: arrows navigate, Enter = A, Escape = B, roving `tabindex`, visible focus ring. This is simultaneously the a11y story and the console-authenticity story.
- Semantic HTML beneath the shell; screen-reader-sane landmarks and labels
- `prefers-reduced-motion` disables boot sequence, zoom transitions, and parallax
- Sound off by default; opt-in toggle persisted
- WCAG 2.2 AA contrast in both themes
- A `/resume` route that is plain HTML and always reachable in one action from anywhere

### 2.3 Privacy

No visitor accounts, no email collection, no identity tracking. Reactions are anonymous. Analytics are cookie-free and aggregate-only. Ship a short `/privacy` page. Do not add IP-to-company enrichment, fingerprinting, or session replay.

---

## 3. Stack (decided)

| Layer      | Choice                                       | Notes                                                                          |
| ---------- | -------------------------------------------- | ------------------------------------------------------------------------------ |
| Framework  | Next.js (App Router), TypeScript             |                                                                                |
| Hosting    | Vercel                                       | Hobby tier; personal, non-commercial                                           |
| Database   | Supabase Postgres                            | Already linked to owner's GitHub                                               |
| Auth       | Supabase Auth                                | **Admin only** — single user, owner                                     |
| Storage    | Supabase Storage                             | Tile art, screenshots. Never commit binaries to git.                           |
| Ingestion  | **GitHub Actions cron**                | Not Vercel Cron — public repo means unlimited minutes and arbitrary schedules |
| CI/CD      | GitHub Actions + Vercel previews             | Supabase branch-per-PR                                                         |
| Validation | Zod at every boundary                        |                                                                                |
| Analytics  | Vercel Analytics or Cloudflare Web Analytics | Cookie-free                                                                    |

**Cost target: $0 plus domain (~$10–15/yr).** Verify every provider's current free-tier terms before relying on them; they revise frequently. Two known gotchas: Supabase free projects pause after ~1 week of inactivity (the nightly ingestion job deliberately keeps it warm), and Vercel Hobby prohibits commercial use (no checkout, no paid services on this domain).

---

## 4. Data model

**Polymorphic single-table core.** New section types must cost zero migrations, and the tile grid, search, filtering, and grouping must all fall out of one query shape.

```
entries
  id            uuid pk
  kind          text    -- experience | project | certification | education
                        -- | hobby | interest | post
  facet         text    -- corporate | research | volunteer | classroom
                        -- | coursework | null
  slug          text unique
  title         text
  subtitle      text    -- organization, issuer, team, league
  summary       text    -- one line, shown on tile hover/highlight
  body          text    -- markdown, detail page
  start_date    date
  end_date      date
  is_current    boolean
  status        text    -- unlocked | in_progress | archived
  icon_asset    text    -- Supabase Storage path
  accent_color  text
  featured      boolean
  sort_weight   int
  metadata      jsonb   -- kind-specific fields
  created_at, updated_at

tags              id, slug, label, category(skill|tool|domain|team)
entry_tags        entry_id, tag_id
entry_relations   from_entry_id, to_entry_id, relation_type
                  -- part_of | certifies | produced_by | related_to
media             id, entry_id, storage_path, caption, alt_text, sort
links             id, entry_id, label, url, kind(company|repo|paper|demo|profile)
reactions         id, entry_id, emoji, created_at, ip_hash
ingest_spotify_*  see §6
ingest_steam_*    see §6
```

Type safety is recovered at the application layer with Zod schemas keyed on `kind`. `status` drives trophy states in the UI.

### 4.1 Worked example — Break Through Tech AI

This is the case that justifies the relational model; get it right and the rest follows.

- One `entry` of kind `experience`, facet `research`
- Child `entry` rows of kind `project` linked via `entry_relations(part_of)`
- One `entry` of kind `certification` (summer completion) linked via `entry_relations(certifies)`

Result: it surfaces under Experience, under Projects, and in the trophy case — one record, three placements, no duplication. Every consumer of the data must handle multi-placement correctly.

### 4.2 Faceted filtering

Filter chips in the console idiom — pill-shaped, with live counts, one active at a time, arrow-key traversable:

`All (n) · Corporate (n) · Research (n) · Volunteer (n) · Classroom (n)`

Counts come from the query, never hardcoded. The pattern generalizes: Projects, Certifications, and Hobbies each get their own facet set from the same component.

### 4.3 Top-level sections (tiles)

Experience · Projects · Certifications · Education · Hobbies & Interests · Now/News

Hobbies covers sports teams (basketball, soccer), music, games. Interests are `tags` with `category = 'team'` so they can be rendered as followed-team cards.

---

## 5. Console shell — element mapping

| Console element           | Site function                                                          |
| ------------------------- | ---------------------------------------------------------------------- |
| Boot sequence             | ~1.2s original logo + chime, skippable, once per session               |
| Profile select            | Recruiter mode vs Explorer mode                                        |
| Tile row                  | Top-level sections, recency-ordered                                    |
| "All Software" grid       | Full searchable index of every entry                                   |
| Groups                    | Tag and facet browsing                                                 |
| `+`/`−` options page | Detail panel — dates, stack, links, related entries, media            |
| **Trophy case**     | Certifications and awards, with locked / in-progress / unlocked states |
| Play Activity             | Ingested Spotify and Steam history, charted                            |
| Album                     | Project screenshots, event photos                                      |
| News                      | Updates, posts, "now" page                                             |
| Controllers               | Input settings, gamepad remap                                          |
| System Settings           | Theme, reduced motion, sound, mode switch                              |
| Sleep                     | Drops to Recruiter mode                                                |
| Notifications (left edge) | Session activity log                                                   |

Two notes worth preserving in implementation:

**Trophies.** The Switch never shipped system-level achievements — a long-standing platform complaint. Rendering certifications as trophies is both the joke and the correct UI for the content. Include in-progress states for credentials being pursued.

**Detail dive.** Selecting a tile opens the entity's full record: what it was, what was built, links out to the company or program, related projects, attached certification, media. This is the primary depth mechanism — invest here over animation.

### 5.1 Interaction

- **Gamepad API** — real controller navigation, ~40 lines, highest flex-per-effort feature in the project. Detect connect/disconnect; show a controller-paired toast.
- Hold-HOME quick-settings overlay: theme, brightness, sound, reduced motion
- Emoji reactions fire a console-style notification toast — **this is the thank-you mechanism**. No email, no popup, no infrastructure.
- Stretch: reacting to N projects unlocks a meta-trophy, turning acknowledgement into a mechanic.

### 5.2 Mobile

Explorer mode gets a simplified shell: vertical tile stack, swipe navigation, on-screen D-pad hint, no hold-HOME. Recruiter mode is the mobile default. Touch targets ≥44px.

---

## 6. Ingestion (scheduled, not live-proxied)

Workers run on GitHub Actions cron, normalize into Postgres. The site's API only ever reads from its own database — the site stays fast and up even if an upstream 500s, and accumulated history (listening trends, playtime over months) is more interesting than a now-playing widget. This is also the piece that reads as real ETL work to an engineer browsing the repo.

| Source             | Status                        | Approach                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Spotify**  | Best supported                | OAuth once with owner's account, store refresh token in Actions secrets. Pull recently-played, top tracks/artists. Free.                                                                                                                                                                                                                                                                                |
| **Steam**    | Official, easy                | Web API key. Playtime, achievements, recently-played.                                                                                                                                                                                                                                                                                                                                                   |
| **IGDB**     | Metadata only                 | Twitch client ID, free. Box art and genres to decorate play data. Confirm asset-usage terms before displaying cover art.                                                                                                                                                                                                                                                                                |
| **LinkedIn** | **No API exists**       | No public profile API; partner programs closed to individuals; "Sign In with LinkedIn" returns only name/headline/photo/email. Scraping violates ToS and risks account restriction.**Approach:** owner exports profile data once (Settings → Data Privacy → Get a copy of your data); normalize into `entries`; treat LinkedIn as a link-out plus badge. The database is the source of truth. |
| Nintendo           | No API, official or otherwise | Manually curated JSON if desired                                                                                                                                                                                                                                                                                                                                                                        |
| Apple              | Out of scope                  | App Store Connect API only covers apps you publish; nothing exposes personal downloads                                                                                                                                                                                                                                                                                                                  |

Every worker: idempotent upserts, retry with backoff, structured logging, failure surfaced as a GitHub Actions failure. Never let a failed ingestion break a page render — serve last-known-good.

Verify current terms for all of these before building. API access policies shift.

---

## 7. Auth, reactions, abuse surface

**Auth is admin-only.** One user: the owner. Supabase Auth guards `/admin` — content CRUD, media upload, manual ingestion trigger, reaction moderation, analytics. Public site is fully open; nothing is gated.

**Reactions: anonymous emoji only.** No free text (moderation burden, one bad actor ruins it). No email collection.

Required guards:

- Rate limit per IP hash at the edge
- RLS: anon key may `insert` into `reactions` and `select` aggregate counts only; never read raw rows
- Store `ip_hash` (salted), never raw IP
- Fixed server-side emoji allowlist — reject arbitrary codepoints
- Optimistic UI with server reconciliation

**Attribution without tracking:** UTM params on links pasted into applications (`?src=recruiter-acme`) give per-outreach conversion data with zero code and zero PII.

---

## 8. Sub-agent decomposition

> Superseded by `BUILD_PLAN.md` §3–6. Retained for the lane definitions, which the plan reorganizes but does not discard. Do not follow this ordering.

**Phase 0 — blocking, do first, single agent**
Design tokens and the original console identity: palette, type scale, spacing, radii, motion curves, icon set, wordmark, sound assets. Everything downstream consumes these. Nothing visual starts until this lands.

**Phase 1 — parallel**

1. **Infra/DB** — Supabase project config, schema migrations, RLS policies, seed fixtures, local `docker-compose`, branch-per-PR wiring
2. **API** — Next.js route handlers, Zod schemas per `kind`, query layer for tiles/search/facets/relations, caching and revalidation
3. **Ingestion** — Actions workflows, Spotify/Steam/IGDB workers, LinkedIn export normalizer, secrets handling
4. **CI/CD** — lint, typecheck, test, Lighthouse CI budget, preview deploys, migration checks, Dependabot

**Phase 2 — parallel, depends on 1+2**
5. **Recruiter mode** — semantic, SSR, print-friendly `/resume`, OG images, sitemap, structured data
6. **Console shell** — largest lane. Boot, profile select, tile grid, detail panels, trophy case, settings, notifications, keyboard + Gamepad API
7. **Admin dashboard** — CRUD, media upload with alt-text enforcement, relation editor, ingestion controls

**Phase 3**
8. **Content** — populate real entries; Break Through Tech AI first as the model case
9. **Hardening** — a11y audit (axe + manual keyboard + screen reader), performance budget, error boundaries, `/privacy`, README, `DESIGN.md`, MIT license

Lanes 5 and 6 must agree on the URL contract before either starts; write it down as a shared route table.

---

## 9. Acceptance criteria

- [ ] Recruiter mode: LCP < 1.5s, Lighthouse a11y 100, fully functional with JS disabled
- [ ] Every Explorer tile has a real URL; deep links land correctly in either mode
- [ ] Full keyboard traversal, no mouse, no trap; visible focus at all times
- [ ] Gamepad navigates the shell end to end
- [ ] `prefers-reduced-motion` honored throughout
- [ ] Break Through Tech AI surfaces correctly in Experience, Projects, and trophy case from one record
- [ ] Facet chips show live counts
- [ ] Reactions rate-limited; raw reaction rows unreadable via anon key
- [ ] Ingestion runs on schedule, is idempotent, and fails loudly without breaking renders
- [ ] Zero Nintendo or third-party assets in the repo or bundle
- [ ] No secrets committed; all in Actions/Vercel secret storage
- [ ] Preview deploy per PR; database isolation is the CI database job.

---

## 10. Open items for the owner

Tracked with deadlines in `BUILD_PLAN.md` §8. Ask before assuming:

1. Domain name and registrar
2. Full inventory of entries — orgs, dates, roles, links, which projects attach where
3. Which sports teams and interests, for the Hobbies section
4. Console identity naming and palette preference
5. Steam profile visibility (must be public for the API to return data)
6. Whether an original boot chime should be commissioned, composed, or omitted
