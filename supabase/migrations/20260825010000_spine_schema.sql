-- S2 (feat/spine-schema) — core schema. BUILD_BRIEF §4, columns verbatim.
--
-- Conventions
--   * Everything lives in `public`; every reference is schema-qualified.
--   * Sets the brief closes are CHECK constraints: entries.status,
--     entry_relations.relation_type, tags.category, links.kind, and the
--     reaction emoji allowlist (brief §7). `entries.kind` and `entries.facet`
--     are deliberately NOT enumerated here — brief §4 requires new section
--     types to cost zero migrations, so their allowed values live in the Zod
--     schemas keyed on `kind` (S4); the database only enforces a slug-like
--     shape. Every named constraint can be swapped with one `alter table`.
--   * No grants or policies in this file; RLS is the next migration.
--   * Local docker-compose and the hosted project run the same file.

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Row trigger: stamps updated_at on every update.';

-- Brief §7: "fixed server-side emoji allowlist — reject arbitrary codepoints".
-- The list is defined once, here, and enforced by a CHECK on reactions so it
-- holds for every writer, including anon inserts through the Data API. The
-- app reads the same function to render the buttons. Single-codepoint emoji
-- only, so no variation-selector ambiguity. lane/reactions may revise the
-- set; existing rows are not re-validated.
create or replace function public.reaction_emoji_allowlist()
returns text[]
language sql
immutable
parallel safe
set search_path = ''
as $$
  select array['👍', '🎉', '🔥', '👀', '🚀', '💡']::text[];
$$;

comment on function public.reaction_emoji_allowlist() is
  'The fixed set of emoji a reaction may carry (brief §7). Enforced by reactions_emoji_allowed.';

-- ---------------------------------------------------------------------------
-- entries — the polymorphic core (kind × facet)
-- ---------------------------------------------------------------------------

create table public.entries (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null,               -- experience | project | certification | education | hobby | interest | post  (open set, Zod-enforced)
  facet         text,                        -- corporate | research | volunteer | classroom | coursework | null            (open set, Zod-enforced)
  slug          text not null unique,
  title         text not null,
  subtitle      text,                        -- organization, issuer, team, league
  summary       text,                        -- one line, shown on tile hover/highlight
  body          text,                        -- markdown, detail page
  start_date    date,
  end_date      date,
  is_current    boolean not null default false,
  status        text not null default 'unlocked',  -- unlocked | in_progress | archived → trophy states
  icon_asset    text,                        -- Supabase Storage path
  accent_color  text,                        -- a design-token reference (e.g. "accent"), never a literal colour: design/tokens/tokens.css is the only place colours are defined
  featured      boolean not null default false,
  sort_weight   integer not null default 0,
  metadata      jsonb not null default '{}'::jsonb,  -- kind-specific fields, shaped by the Zod schema for `kind`
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint entries_kind_format        check (kind ~ '^[a-z][a-z0-9_]*$'),
  constraint entries_facet_format       check (facet is null or facet ~ '^[a-z][a-z0-9_]*$'),
  constraint entries_slug_format        check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint entries_title_nonblank     check (btrim(title) <> ''),
  constraint entries_status_allowed     check (status in ('unlocked', 'in_progress', 'archived')),
  constraint entries_dates_ordered      check (start_date is null or end_date is null or end_date >= start_date),
  constraint entries_current_has_no_end check (not is_current or end_date is null),
  constraint entries_metadata_is_object check (jsonb_typeof(metadata) = 'object')
);

comment on table public.entries is
  'Polymorphic single-table core (brief §4): one row per experience, project, certification, education, hobby, interest, or post. New kinds need no migration.';
comment on column public.entries.status is
  'Drives trophy states: unlocked | in_progress | archived (rendered as locked).';
comment on column public.entries.accent_color is
  'Design-token reference, not a literal colour.';

create index entries_kind_facet_idx on public.entries (kind, facet);
create index entries_status_idx     on public.entries (status);
create index entries_featured_idx   on public.entries (featured) where featured;
create index entries_recency_idx    on public.entries (kind, sort_weight desc, start_date desc nulls last);

create trigger entries_set_updated_at
  before update on public.entries
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- tags / entry_tags
-- ---------------------------------------------------------------------------

create table public.tags (
  id        uuid primary key default gen_random_uuid(),
  slug      text not null unique,
  label     text not null,
  category  text not null,                  -- skill | tool | domain | team  (team = followed-team cards, brief §4.3)

  constraint tags_slug_format      check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint tags_label_nonblank   check (btrim(label) <> ''),
  constraint tags_category_allowed check (category in ('skill', 'tool', 'domain', 'team'))
);

comment on table public.tags is
  'Tag and facet browsing (brief §4). category = team renders as a followed-team card.';

create index tags_category_idx on public.tags (category);

create table public.entry_tags (
  entry_id  uuid not null references public.entries (id) on delete cascade,
  tag_id    uuid not null references public.tags (id) on delete cascade,
  primary key (entry_id, tag_id)
);

create index entry_tags_tag_id_idx on public.entry_tags (tag_id);

-- ---------------------------------------------------------------------------
-- entry_relations — multi-placement (brief §4.1)
-- ---------------------------------------------------------------------------
-- Read a row as "<from> <relation_type> <to>":
--   project        part_of      experience   (child project of a program/role)
--   certification  certifies    experience   (credential earned for it)
--   post|project   produced_by  experience|project
--   any            related_to   any          (undirected; store once)
-- The brief §4.1 shape — one experience, child projects via part_of, one
-- certification via certifies — is the fixture in supabase/seed.sql.

create table public.entry_relations (
  from_entry_id  uuid not null references public.entries (id) on delete cascade,
  to_entry_id    uuid not null references public.entries (id) on delete cascade,
  relation_type  text not null,             -- part_of | certifies | produced_by | related_to
  primary key (from_entry_id, to_entry_id, relation_type),

  constraint entry_relations_type_allowed check (relation_type in ('part_of', 'certifies', 'produced_by', 'related_to')),
  constraint entry_relations_no_self      check (from_entry_id <> to_entry_id)
);

comment on table public.entry_relations is
  'Directed relations between entries; "<from> <relation_type> <to>". Gives one record several placements with zero duplication.';

create index entry_relations_to_idx on public.entry_relations (to_entry_id, relation_type);

-- ---------------------------------------------------------------------------
-- media / links
-- ---------------------------------------------------------------------------

create table public.media (
  id            uuid primary key default gen_random_uuid(),
  entry_id      uuid not null references public.entries (id) on delete cascade,
  storage_path  text not null,              -- Supabase Storage object path; binaries never live in git
  caption       text,
  alt_text      text not null,              -- brief §2.2 / plan §5 admin lane: alt text is enforced, here at the data boundary
  sort          integer not null default 0,

  constraint media_storage_path_nonblank check (btrim(storage_path) <> ''),
  constraint media_alt_text_nonblank     check (btrim(alt_text) <> ''),
  constraint media_entry_path_unique     unique (entry_id, storage_path)
);

create index media_entry_id_idx on public.media (entry_id, sort);

create table public.links (
  id        uuid primary key default gen_random_uuid(),
  entry_id  uuid not null references public.entries (id) on delete cascade,
  label     text not null,
  url       text not null,
  kind      text not null,                  -- company | repo | paper | demo | profile

  constraint links_label_nonblank check (btrim(label) <> ''),
  constraint links_url_http       check (url ~ '^https?://'),
  constraint links_kind_allowed   check (kind in ('company', 'repo', 'paper', 'demo', 'profile'))
);

create index links_entry_id_idx on public.links (entry_id);

-- ---------------------------------------------------------------------------
-- reactions — anonymous emoji only (brief §7)
-- ---------------------------------------------------------------------------
-- Columns are the brief's; the constraints are the abuse guards that must
-- hold at the database because anon may insert here directly:
--   * emoji must be in public.reaction_emoji_allowlist()
--   * ip_hash must be a 64-char hex digest (sha-256 of salt + IP). A raw
--     IPv4/IPv6 string can never satisfy this, so a raw IP cannot be stored.
--   * one row per (entry, emoji, hash): an idempotent toggle target, and a
--     floor under the edge rate limit. `insert … on conflict do nothing`.
-- Salting, hashing, and the edge rate limit live in the app (lane/reactions).

create table public.reactions (
  id          uuid primary key default gen_random_uuid(),
  entry_id    uuid not null references public.entries (id) on delete cascade,
  emoji       text not null,
  created_at  timestamptz not null default now(),
  ip_hash     text not null,

  constraint reactions_emoji_allowed   check (emoji = any (public.reaction_emoji_allowlist())),
  constraint reactions_ip_hash_format  check (ip_hash ~ '^[0-9a-f]{64}$'),
  constraint reactions_one_per_visitor unique (entry_id, emoji, ip_hash)
);

comment on table public.reactions is
  'Anonymous emoji reactions (brief §7). Raw rows are admin-only; the public reads public.reaction_counts.';
comment on column public.reactions.ip_hash is
  'Salted sha-256 hex digest of the visitor IP. Never a raw IP; the format CHECK makes storing one impossible.';

create index reactions_entry_emoji_idx on public.reactions (entry_id, emoji);
create index reactions_created_at_idx  on public.reactions (created_at);
