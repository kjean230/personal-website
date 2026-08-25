-- S2 (feat/spine-schema) — grants and row-level security. BUILD_BRIEF §7.
--
-- Access model
--   anon           the public site. Reads every content table. On reactions:
--                  INSERT (entry_id, emoji, ip_hash) only — no SELECT on the
--                  table, aggregate counts via public.reaction_counts.
--   authenticated  a signed-in Supabase Auth user. Reads like anon. Gains
--                  writes on content tables and raw-row read + delete on
--                  reactions (moderation) ONLY when public.is_admin() —
--                  i.e. the JWT carries app_metadata.role = 'admin'.
--                  app_metadata is set by the service role / dashboard and
--                  can never be written by the user, unlike user_metadata.
--   service_role   bypasses RLS by definition (ingestion workers, admin API).
--
-- Grants are explicit on every object: the cloud default no longer exposes
-- new public objects to the Data API roles, and the local image still does,
-- so both are revoked first and re-granted to exactly the same shape.

-- ---------------------------------------------------------------------------
-- admin predicate
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb
       #>> '{app_metadata,role}') = 'admin',
    false
  );
$$;

comment on function public.is_admin() is
  'True when the request JWT carries app_metadata.role = ''admin''. Reads request.jwt.claims directly so it works on the hosted project and the local image alike.';

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

revoke all on function public.reaction_emoji_allowlist() from public;
grant execute on function public.reaction_emoji_allowlist() to anon, authenticated, service_role;

revoke all on function public.set_updated_at() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- content tables: public read, admin write
-- ---------------------------------------------------------------------------

alter table public.entries         enable row level security;
alter table public.tags            enable row level security;
alter table public.entry_tags      enable row level security;
alter table public.entry_relations enable row level security;
alter table public.media           enable row level security;
alter table public.links           enable row level security;

revoke all on table public.entries, public.tags, public.entry_tags,
                    public.entry_relations, public.media, public.links
  from anon, authenticated, service_role;

grant select on table public.entries, public.tags, public.entry_tags,
                     public.entry_relations, public.media, public.links
  to anon, authenticated;

grant insert, update, delete on table public.entries, public.tags, public.entry_tags,
                                   public.entry_relations, public.media, public.links
  to authenticated;

grant all on table public.entries, public.tags, public.entry_tags,
                  public.entry_relations, public.media, public.links
  to service_role;

create policy entries_public_read on public.entries
  for select to anon, authenticated using (true);
create policy entries_admin_write on public.entries
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy tags_public_read on public.tags
  for select to anon, authenticated using (true);
create policy tags_admin_write on public.tags
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy entry_tags_public_read on public.entry_tags
  for select to anon, authenticated using (true);
create policy entry_tags_admin_write on public.entry_tags
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy entry_relations_public_read on public.entry_relations
  for select to anon, authenticated using (true);
create policy entry_relations_admin_write on public.entry_relations
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy media_public_read on public.media
  for select to anon, authenticated using (true);
create policy media_admin_write on public.media
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy links_public_read on public.links
  for select to anon, authenticated using (true);
create policy links_admin_write on public.links
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- reactions: anon insert, aggregate read only, admin moderation
-- ---------------------------------------------------------------------------

alter table public.reactions enable row level security;

revoke all on table public.reactions from anon, authenticated, service_role;

-- Column-level INSERT: the client supplies exactly the three brief columns;
-- id and created_at come from their defaults and cannot be set by a caller.
grant insert (entry_id, emoji, ip_hash) on table public.reactions to anon, authenticated;
-- Raw-row read and delete exist only for moderation and are gated by policy.
grant select, delete on table public.reactions to authenticated;
grant all on table public.reactions to service_role;
-- No UPDATE for anyone below service_role: a reaction is immutable.

create policy reactions_public_insert on public.reactions
  for insert to anon, authenticated with check (true);
create policy reactions_admin_read on public.reactions
  for select to authenticated using ((select public.is_admin()));
create policy reactions_admin_delete on public.reactions
  for delete to authenticated using ((select public.is_admin()));

-- Aggregate counts are the only public read path. This view deliberately runs
-- with the owner's privileges (security_invoker = false) so it can see the
-- rows RLS hides from anon; it projects nothing but (entry_id, emoji, count),
-- so no raw row — no id, ip_hash, or timestamp — can leave the table this way.
-- Supabase's advisor flags definer views in `public`; this one is intended.
create view public.reaction_counts
  with (security_invoker = false)
as
  select entry_id, emoji, count(*)::integer as count
  from public.reactions
  group by entry_id, emoji;

comment on view public.reaction_counts is
  'Public aggregate of reactions: (entry_id, emoji, count). The only way anon reads reactions (brief §7).';

revoke all on table public.reaction_counts from anon, authenticated, service_role;
grant select on table public.reaction_counts to anon, authenticated, service_role;
