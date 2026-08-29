-- supabase/seed.sql — FIXTURE DATA ONLY.
--
-- Every row in this file is placeholder content for local development, CI,
-- and Supabase preview branches. Nothing here describes the owner's real
-- history; real entries arrive through the S3 LinkedIn import as editable
-- seed data. Every row carries metadata.fixture = true so it can always be
-- told apart (and deleted with one statement).
--
-- Where it runs: `npm run db:apply` / `supabase db reset` locally, and on
-- Supabase preview branches. Branching never merges seed data to production
-- and `supabase db push` does not run seeds, so this never reaches the live
-- site.
--
-- What it proves: the brief §4.1 shape. ONE experience record, two child
-- projects attached with `part_of`, one certification attached with
-- `certifies` — the record surfaces in Experience, in Projects, and in the
-- trophy case with zero duplication. supabase/tests/rls.test.ts asserts it.
-- The extra certifications cover all three trophy states.
--
-- Idempotent: every insert is `on conflict do nothing`. Fixed UUIDs so tests
-- can address rows directly.

-- entries ------------------------------------------------------------------

insert into public.entries
  (id, kind, facet, slug, title, subtitle, summary, body,
   start_date, end_date, is_current, status, icon_asset, accent_color,
   featured, sort_weight, metadata)
values
  -- §4.1: the one experience record
  ('00000000-0000-4000-8000-000000000101', 'experience', 'research',
   'fixture-program', 'Fixture program (placeholder)', 'Fixture organization',
   'Placeholder experience proving one record, three placements.',
   E'# Fixture program\n\nPlaceholder body. Replaced by the S3 import.',
   '2024-05-01', '2024-08-31', false, 'unlocked', null, 'accent',
   true, 100, '{"fixture": true}'),

  -- child projects (part_of → fixture-program)
  ('00000000-0000-4000-8000-000000000102', 'project', 'research',
   'fixture-project-alpha', 'Fixture project alpha (placeholder)', 'Fixture organization',
   'Placeholder child project A.', 'Placeholder body.',
   '2024-05-15', '2024-07-01', false, 'unlocked', null, null,
   false, 50, '{"fixture": true}'),
  ('00000000-0000-4000-8000-000000000103', 'project', 'research',
   'fixture-project-beta', 'Fixture project beta (placeholder)', 'Fixture organization',
   'Placeholder child project B.', 'Placeholder body.',
   '2024-07-01', '2024-08-31', false, 'unlocked', null, null,
   false, 40, '{"fixture": true}'),

  -- the certification that certifies the program (trophy: unlocked)
  ('00000000-0000-4000-8000-000000000104', 'certification', null,
   'fixture-certificate', 'Fixture certificate (placeholder)', 'Fixture issuer',
   'Placeholder credential earned for the fixture program.', null,
   '2024-08-31', null, false, 'unlocked', null, null,
   false, 30, '{"fixture": true}'),

  -- trophy states: in_progress and archived, so all three states exist locally.
  -- Each status is its own state: archived renders as "Archived", never "Locked"
  -- (S8 owner decision — an archived credential is one you earned that lapsed,
  -- not one you never achieved). app/(explorer)/trophy.tsx is the mapping.
  ('00000000-0000-4000-8000-000000000105', 'certification', null,
   'fixture-credential-pending', 'Fixture credential in progress (placeholder)', 'Fixture issuer',
   'Placeholder credential being pursued.', null,
   '2026-01-01', null, true, 'in_progress', null, null,
   false, 20, '{"fixture": true}'),
  ('00000000-0000-4000-8000-000000000106', 'certification', null,
   'fixture-certificate-retired', 'Fixture retired certificate (placeholder)', 'Fixture issuer',
   'Placeholder credential that has lapsed.', null,
   '2020-01-01', '2022-01-01', false, 'archived', null, null,
   false, 10, '{"fixture": true}'),

  -- one row of another kind, so kind filtering has something to exclude
  ('00000000-0000-4000-8000-000000000107', 'education', 'coursework',
   'fixture-school', 'Fixture school (placeholder)', 'Fixture institution',
   'Placeholder education entry.', null,
   '2021-09-01', null, true, 'unlocked', null, null,
   false, 0, '{"fixture": true}')
on conflict (id) do nothing;

-- tags ---------------------------------------------------------------------

insert into public.tags (id, slug, label, category) values
  ('00000000-0000-4000-8000-000000000201', 'fixture-skill',  'Fixture skill',  'skill'),
  ('00000000-0000-4000-8000-000000000202', 'fixture-tool',   'Fixture tool',   'tool'),
  ('00000000-0000-4000-8000-000000000203', 'fixture-domain', 'Fixture domain', 'domain'),
  ('00000000-0000-4000-8000-000000000204', 'fixture-team',   'Fixture team',   'team')
on conflict (id) do nothing;

insert into public.entry_tags (entry_id, tag_id) values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000203'),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000201'),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000202'),
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000201')
on conflict do nothing;

-- relations: "<from> <relation_type> <to>" ---------------------------------

insert into public.entry_relations (from_entry_id, to_entry_id, relation_type) values
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000101', 'part_of'),
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000101', 'part_of'),
  ('00000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000101', 'certifies'),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000103', 'related_to')
on conflict do nothing;

-- links / media ------------------------------------------------------------

insert into public.links (id, entry_id, label, url, kind) values
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000101',
   'Fixture organization', 'https://example.com/fixture-organization', 'company'),
  ('00000000-0000-4000-8000-000000000302', '00000000-0000-4000-8000-000000000102',
   'Fixture repository', 'https://example.com/fixture-project-alpha', 'repo')
on conflict (id) do nothing;

insert into public.media (id, entry_id, storage_path, caption, alt_text, sort) values
  ('00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000102',
   'fixtures/fixture-project-alpha/cover.svg', 'Fixture cover',
   'Placeholder cover image for fixture project alpha', 0)
on conflict (id) do nothing;

-- reactions: three fixture visitors, so reaction_counts has something to add up

insert into public.reactions (id, entry_id, emoji, ip_hash) values
  ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000102', '👍',
   encode(sha256('fixture-salt:fixture-visitor-1'::bytea), 'hex')),
  ('00000000-0000-4000-8000-000000000502', '00000000-0000-4000-8000-000000000102', '👍',
   encode(sha256('fixture-salt:fixture-visitor-2'::bytea), 'hex')),
  ('00000000-0000-4000-8000-000000000503', '00000000-0000-4000-8000-000000000102', '🎉',
   encode(sha256('fixture-salt:fixture-visitor-1'::bytea), 'hex'))
on conflict do nothing;
