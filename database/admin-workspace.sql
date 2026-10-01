-- Apply after admin-access.sql. Administrator notes are never exposed by public user APIs.
begin;

create table if not exists public.admin_user_notes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  note text not null default '' check (length(note) <= 10000),
  revision integer not null default 1 check (revision > 0),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.admin_user_notes enable row level security;
revoke all on public.admin_user_notes from public, anon, authenticated;

create index if not exists admin_audit_log_created_idx on public.admin_audit_log(created_at desc, id desc);
create index if not exists admin_audit_log_target_idx on public.admin_audit_log(target_user_id, created_at desc);

create or replace function public.admin_workspace_audit(p_search text default '', p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb; needle text := lower(trim(coalesce(p_search, '')));
begin
  if not public.is_efir_admin() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  if p_offset is null or p_offset < 0 or length(needle) > 200 then raise exception 'INVALID_FILTER'; end if;
  with rows as (
    select a.id, a.admin_user_id, a.target_user_id, a.app_id, a.action, a.created_at,
      actor.email admin_email, target.email target_email,
      -- Keep the log useful without returning complete landing documents or content snapshots.
      jsonb_strip_nulls(jsonb_build_object(
        'kind', a.details->'kind', 'enabled', a.details->'enabled',
        'days', a.details->'days', 'scope', a.details->'scope',
        'code', coalesce(a.details->'code', a.details->'after'->'code'), 'revision', a.details->'revision',
        'characters', a.details->'characters', 'partner_id', a.details->'partner_id',
        'amount', a.details->'amount', 'currency', a.details->'currency',
        'rate_bps', a.details->'rate_bps', 'slug', a.details->'slug',
        'before', case when jsonb_typeof(a.details->'before') = 'string' then a.details->'before' end,
        'after', case when jsonb_typeof(a.details->'after') = 'string' then a.details->'after' end
      )) details
    from public.admin_audit_log a
    left join auth.users actor on actor.id = a.admin_user_id
    left join auth.users target on target.id = a.target_user_id
    where needle = '' or strpos(lower(concat_ws(' ', a.action, a.app_id, actor.email, target.email,
      a.admin_user_id::text, a.target_user_id::text, coalesce(a.details->>'code', a.details->'after'->>'code'))), needle) > 0
  )
  select jsonb_build_object('total', (select count(*) from rows), 'items', coalesce(
    (select jsonb_agg(r order by r.created_at desc, r.id desc)
      from (select * from rows order by created_at desc, id desc limit 50 offset p_offset) r), '[]'::jsonb)) into result;
  return result;
end $$;

create or replace function public.admin_workspace_note_get(p_user_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if not public.is_efir_admin() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  if not exists(select 1 from auth.users where id = p_user_id) then raise exception 'NOT_FOUND'; end if;
  select jsonb_build_object('note', n.note, 'revision', n.revision, 'updated_at', n.updated_at,
    'updated_by', n.updated_by, 'updated_by_email', u.email) into result
  from public.admin_user_notes n left join auth.users u on u.id = n.updated_by where n.user_id = p_user_id;
  return coalesce(result, jsonb_build_object('note', '', 'revision', 0, 'updated_at', null,
    'updated_by', null, 'updated_by_email', null));
end $$;

create or replace function public.admin_workspace_note_save(p_user_id uuid, p_note text, p_revision integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare current_revision integer;
begin
  if not public.is_efir_admin() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  if p_note is null or length(p_note) > 10000 then raise exception 'INVALID_NOTE'; end if;
  if p_revision is null or p_revision < 0 then raise exception 'INVALID_REVISION'; end if;
  if not exists(select 1 from auth.users where id = p_user_id) then raise exception 'NOT_FOUND'; end if;
  perform pg_advisory_xact_lock(hashtextextended('admin-note:' || p_user_id::text, 0));
  select revision into current_revision from public.admin_user_notes where user_id = p_user_id for update;
  if p_revision is distinct from coalesce(current_revision, 0) then raise exception 'DATA_CHANGED'; end if;
  insert into public.admin_user_notes(user_id, note, revision, updated_by, updated_at)
    values(p_user_id, p_note, 1, auth.uid(), now())
  on conflict(user_id) do update set note = excluded.note, revision = admin_user_notes.revision + 1,
    updated_by = excluded.updated_by, updated_at = excluded.updated_at;
  insert into public.admin_audit_log(admin_user_id, target_user_id, action, details)
    values(auth.uid(), p_user_id, 'admin_note_saved',
      jsonb_build_object('revision', coalesce(current_revision, 0) + 1, 'characters', length(p_note)));
  return (select jsonb_build_object('note', n.note, 'revision', n.revision, 'updated_at', n.updated_at,
    'updated_by', n.updated_by, 'updated_by_email', u.email)
    from public.admin_user_notes n left join auth.users u on u.id = n.updated_by where n.user_id = p_user_id);
end $$;

revoke all on function public.admin_workspace_audit(text, integer),
  public.admin_workspace_note_get(uuid), public.admin_workspace_note_save(uuid, text, integer)
  from public, anon, authenticated;
grant execute on function public.admin_workspace_audit(text, integer),
  public.admin_workspace_note_get(uuid), public.admin_workspace_note_save(uuid, text, integer)
  to authenticated;
commit;
