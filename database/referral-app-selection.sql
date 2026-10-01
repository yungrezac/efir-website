-- Apply after referrals.sql and referral-catalog.sql. Visibility never grants launch access.
begin;
create table if not exists public.referral_partner_apps(
 partner_id uuid not null references public.referral_partners(user_id) on delete cascade,
 app_id text not null references public.store_apps(id) on delete cascade,
 primary key(partner_id,app_id)
);
alter table public.referral_partner_apps enable row level security;
revoke all on public.referral_partner_apps from public,anon,authenticated;
grant all on public.referral_partner_apps to service_role;
create or replace function public.referral_partner_default_apps() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.referral_partner_apps(partner_id,app_id) select new.user_id,id from public.store_apps where id in ('tiktimer','immwiget') on conflict do nothing;
 return new;
end $$;
revoke all on function public.referral_partner_default_apps() from public,anon,authenticated;
drop trigger if exists referral_partner_default_apps on public.referral_partners;
create trigger referral_partner_default_apps after insert on public.referral_partners for each row execute function public.referral_partner_default_apps();
do $$ begin
 insert into public.referral_catalog_rollouts(name) values('partner_app_selection') on conflict do nothing;
 if found then
  insert into public.referral_partner_apps(partner_id,app_id) select p.user_id,a.id from public.referral_partners p cross join public.store_apps a where a.id in ('tiktimer','immwiget') on conflict do nothing;
 end if;
end $$;
create or replace function public.referral_app_list(p_partner uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'name',a.name) order by a.name,a.id),'[]'::jsonb)
 from public.referral_partner_apps p join public.store_apps a on a.id=p.app_id
 where p.partner_id=p_partner and not a.is_disabled and (a.is_published or a.is_exclusive);
$$;
revoke all on function public.referral_app_list(uuid) from public,anon,authenticated;
create or replace function public.referral_code_info(p_code text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('code',c.published->>'slug','apps',public.referral_app_list(c.user_id))
 from public.creator_landings c where c.published->>'slug'=lower(trim(p_code)) and public.referral_partner_active(c.user_id);
$$;
revoke all on function public.referral_code_info(text) from public;
grant execute on function public.referral_code_info(text) to anon,authenticated,service_role;
create or replace function public.efir_referral_status(p_user uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('referral',(select jsonb_build_object('code',r.code,'creator_name',coalesce(c.published->>'nickname',c.draft->>'nickname',r.code),'created_at',r.created_at,'apps',public.referral_app_list(r.partner_id)) from public.referral_attributions r left join public.creator_landings c on c.user_id=r.partner_id where r.user_id=p_user));
$$;
create or replace function public.referral_catalog_visible(p_app_id text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (
  exists(select 1 from public.referral_attributions r join public.referral_partner_apps a on a.partner_id=r.partner_id where r.user_id=auth.uid() and a.app_id=p_app_id)
  or exists(select 1 from public.admin_users a where a.user_id=auth.uid())
  or exists(select 1 from public.app_access_grants g where g.user_id=auth.uid() and g.app_id=p_app_id)
  or exists(select 1 from public.exclusive_app_grants g where g.user_id=auth.uid() and g.app_id=p_app_id)
  or exists(select 1 from public.referral_catalog_legacy_access g where g.user_id=auth.uid() and g.app_id=p_app_id)
 );
$$;
drop policy if exists store_apps_visible on public.store_apps;
create policy store_apps_visible on public.store_apps for select to anon,authenticated using(
 (id in ('tiktimer','immwiget') and not is_disabled and (is_published or is_exclusive) and public.referral_catalog_visible(id))
 or (id not in ('tiktimer','immwiget') and (
  (is_published and not is_exclusive)
  or (is_exclusive and not is_disabled and public.referral_catalog_visible(id))
 ))
);
create or replace function public.admin_referral_apps(p_user_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_efir_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501';end if;
 return jsonb_build_object('selected',coalesce((select jsonb_agg(app_id order by app_id) from public.referral_partner_apps where partner_id=p_user_id),'[]'::jsonb),
 'options',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'disabled',is_disabled,'available',is_published or is_exclusive) order by name,id) from public.store_apps),'[]'::jsonb),
 'revision',(select revision from public.referral_partners where user_id=p_user_id));
end $$;
create or replace function public.admin_referral_apps_save(p_user_id uuid,p_apps text[],p_revision integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare old_revision integer; old_apps jsonb;
begin
 if not public.is_efir_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501';end if;
 if p_apps is null or cardinality(p_apps)>200 or exists(select 1 from unnest(p_apps) x where x is null or not exists(select 1 from public.store_apps where id=x)) then raise exception 'INVALID_APPS';end if;
 select revision into old_revision from public.referral_partners where user_id=p_user_id for update;
 if not found then raise exception 'NOT_FOUND';end if;
 if old_revision is distinct from p_revision then raise exception 'DATA_CHANGED';end if;
 select coalesce(jsonb_agg(app_id order by app_id),'[]'::jsonb) into old_apps from public.referral_partner_apps where partner_id=p_user_id;
 delete from public.referral_partner_apps where partner_id=p_user_id;
 insert into public.referral_partner_apps(partner_id,app_id) select p_user_id,x from (select distinct unnest(p_apps) x) chosen;
 update public.referral_partners set revision=revision+1 where user_id=p_user_id;
 insert into public.admin_audit_log(admin_user_id,target_user_id,action,details) values(auth.uid(),p_user_id,'referral_apps_save',jsonb_build_object('before',old_apps,'apps',p_apps));
 return public.admin_referral_apps(p_user_id);
end $$;
revoke all on function public.admin_referral_apps(uuid),public.admin_referral_apps_save(uuid,text[],integer) from public,anon;
grant execute on function public.admin_referral_apps(uuid),public.admin_referral_apps_save(uuid,text[],integer) to authenticated;
commit;
