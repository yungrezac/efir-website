-- Apply after referrals.sql and the existing access migrations.
-- A creator code changes visibility only. has_app_access remains unchanged.
begin;

-- Preserve accounts that already had paid/trial/license access when this feature
-- was introduced. Future purchases require a creator code for these cards.
create table if not exists public.referral_catalog_legacy_access(
  user_id uuid not null references auth.users(id) on delete cascade,
  app_id text not null check(app_id in ('tiktimer','immwiget')),
  created_at timestamptz not null default now(),
  primary key(user_id,app_id)
);
create table if not exists public.referral_catalog_rollouts(
  name text primary key,created_at timestamptz not null default now()
);
alter table public.referral_catalog_legacy_access enable row level security;
alter table public.referral_catalog_rollouts enable row level security;
revoke all on public.referral_catalog_legacy_access,public.referral_catalog_rollouts from public,anon,authenticated;
do $$ begin
  insert into public.referral_catalog_rollouts(name) values('initial_entitlements') on conflict do nothing;
  if found then
    insert into public.referral_catalog_legacy_access(user_id,app_id)
    select u.id,app.id from auth.users u cross join (values('tiktimer'),('immwiget')) as app(id)
    where exists(select 1 from public.app_subscriptions s where s.user_id=u.id and s.expires_at>now() and s.app_id in ('all','tiktimer',app.id))
      or exists(select 1 from public.trial_redemptions t where t.user_id=u.id and t.expires_at>now())
      or exists(select 1 from public.app_licenses l where l.user_id=u.id and l.app_id in ('all',app.id) and l.is_active and (l.expires_at is null or l.expires_at>now()))
    on conflict do nothing;
  end if;
end $$;

create or replace function public.referral_catalog_visible(p_app_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and p_app_id in ('tiktimer','immwiget') and (
    exists(select 1 from public.referral_attributions r where r.user_id=auth.uid())
    or exists(select 1 from public.admin_users a where a.user_id=auth.uid())
    or exists(select 1 from public.app_access_grants g where g.user_id=auth.uid() and g.app_id=p_app_id)
    or exists(select 1 from public.exclusive_app_grants g where g.user_id=auth.uid() and g.app_id=p_app_id)
    or exists(select 1 from public.referral_catalog_legacy_access g where g.user_id=auth.uid() and g.app_id=p_app_id)
  );
$$;
revoke all on function public.referral_catalog_visible(text) from public;
grant execute on function public.referral_catalog_visible(text) to anon,authenticated;

drop policy if exists store_apps_read_published on public.store_apps;
drop policy if exists exclusive_apps_visibility on public.store_apps;
drop policy if exists store_apps_visible on public.store_apps;
create policy store_apps_visible on public.store_apps for select to anon,authenticated using (
  -- Exclusive cards intentionally remain unpublished to the general catalog.
  -- Unpublishing a normal card still removes it from referred accounts.
  (id in ('tiktimer','immwiget') and not is_disabled and (is_published or is_exclusive) and public.referral_catalog_visible(id))
  or (id not in ('tiktimer','immwiget') and (
    (is_published and not is_exclusive)
    or (is_exclusive and exists(select 1 from public.exclusive_app_grants g where g.app_id=store_apps.id and g.user_id=auth.uid()))
  ))
);
-- Remove earlier permissive media policies too; otherwise hidden cards leak through joins.
drop policy if exists store_media_read_published on public.store_media;
drop policy if exists store_media_read_visible on public.store_media;
create policy store_media_read_visible on public.store_media for select to anon,authenticated using (
  exists(select 1 from public.store_apps a where a.id=store_media.app_id)
);
commit;
