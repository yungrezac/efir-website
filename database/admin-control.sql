-- Apply after admin-access, creator-landings-v4 and launcher-presence.
-- Existing content, access and subscription expiry dates are preserved.
begin;
alter table public.creator_landings add column if not exists is_disabled boolean not null default false;
alter table public.store_apps add column if not exists admin_revision integer not null default 0;
alter table public.trial_promos add column if not exists admin_revision integer not null default 0;
create or replace function public.landing_save_for(p_owner uuid,p_document jsonb,p_revision integer,p_action text default 'draft') returns jsonb language plpgsql security definer set search_path='' as $$
declare item jsonb; doc jsonb; photo text; current_revision integer; clean_items jsonb:='[]'; rules_text text; rules_enabled boolean; button_id text; layout jsonb; identity_layout jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended('landing:'||p_owner::text,0));
 if not public.is_efir_admin() and (p_owner is distinct from auth.uid() or not public.landing_allowed()) then raise exception 'LANDING_ACCESS_REQUIRED' using errcode='42501'; end if;
 select revision into current_revision from public.creator_landings where user_id=p_owner for update;
 if p_revision is distinct from coalesce(current_revision,0) then raise exception 'LANDING_CHANGED'; end if;
 if p_action is null or p_action not in ('draft','publish','unpublish') then raise exception 'INVALID_ACTION'; end if;
 if p_action='unpublish' then
  update public.creator_landings set published=null,revision=revision+1,updated_at=now() where user_id=p_owner;
  return (select jsonb_build_object('draft',draft,'published',published,'revision',revision,'is_disabled',is_disabled) from public.creator_landings where user_id=p_owner);
 end if;
 if jsonb_typeof(p_document) is distinct from 'object' or octet_length(p_document::text)>40000 then raise exception 'INVALID_DOCUMENT'; end if;
 if coalesce(p_document->>'nickname','') !~ '^.{1,32}$' or length(trim(p_document->>'nickname'))=0 then raise exception 'INVALID_NICKNAME'; end if;
 if coalesce(p_document->>'slug','') !~ '^[a-z0-9][a-z0-9_-]{2,39}$' then raise exception 'INVALID_SLUG'; end if;
 if exists(select 1 from public.landing_reserved_slugs where slug=p_document->>'slug')
  or exists(select 1 from public.landing_templates where slug=p_document->>'slug' and user_id is distinct from p_owner) then raise exception 'SLUG_RESERVED'; end if;
 layout:=coalesce(p_document->'layout','{}'::jsonb);
 if jsonb_typeof(layout) is distinct from 'object' then raise exception 'INVALID_LAYOUT'; end if;
 if layout ? 'panelOffset' then
  if jsonb_typeof(layout->'panelOffset') is distinct from 'number' then raise exception 'INVALID_LAYOUT'; end if;
  if (layout->>'panelOffset')::numeric not between -0.55 and 0.4 then raise exception 'INVALID_LAYOUT'; end if;
 end if;
 if layout ? 'identity' then
  identity_layout:=layout->'identity';
  if jsonb_typeof(identity_layout) is distinct from 'object'
   or jsonb_typeof(identity_layout->'x') is distinct from 'number'
   or jsonb_typeof(identity_layout->'y') is distinct from 'number'
   or jsonb_typeof(identity_layout->'scale') is distinct from 'number' then raise exception 'INVALID_LAYOUT'; end if;
  if (identity_layout->>'x')::numeric not between 0 and 1 or (identity_layout->>'y')::numeric not between 0 and 1.5
   or (identity_layout->>'scale')::numeric not between 0.5 and 2.5 then raise exception 'INVALID_LAYOUT'; end if;
  identity_layout:=jsonb_build_object('x',(identity_layout->>'x')::numeric,'y',(identity_layout->>'y')::numeric,'scale',(identity_layout->>'scale')::numeric);
 end if;
 layout:=case when layout ? 'panelOffset' then jsonb_build_object('panelOffset',(layout->>'panelOffset')::numeric) else '{}'::jsonb end;
 if identity_layout is not null then layout:=layout||jsonb_build_object('identity',identity_layout); end if;
 rules_text:=coalesce(p_document->>'rulesText','');
 if length(rules_text)>10000 or (p_document ? 'rulesEnabled' and jsonb_typeof(p_document->'rulesEnabled')<>'boolean') then raise exception 'INVALID_RULES'; end if;
 rules_enabled:=coalesce((p_document->>'rulesEnabled')::boolean,false);
 if rules_enabled and length(trim(rules_text))=0 then raise exception 'RULES_REQUIRED'; end if;
 if jsonb_typeof(p_document->'items') is distinct from 'array' then raise exception 'INVALID_BUTTONS'; end if;
 if jsonb_array_length(p_document->'items')>24 then raise exception 'TOO_MANY_BUTTONS'; end if;
 photo:=coalesce(p_document->>'photo','');
 if photo<>'' and photo !~ '\.png$' and not exists(select 1 from public.creator_landings where user_id=p_owner and (draft->>'photo'=photo or published->>'photo'=photo)) then raise exception 'INVALID_PHOTO'; end if;
 if photo<>'' and not exists(select 1 from public.landing_templates where user_id=p_owner and document->>'photo'=photo) and not exists(select 1 from public.creator_landings where user_id=p_owner and (draft->>'photo'=photo or published->>'photo'=photo)) then
  if (split_part(photo,'/',1)<>p_owner::text and not (public.is_efir_admin() and split_part(photo,'/',1)=auth.uid()::text)) or photo !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(png|jpg|webp)$'
   or not exists(select 1 from storage.objects where bucket_id='creator-portraits' and name=photo) then raise exception 'INVALID_PHOTO'; end if;
 end if;
 for item in select value from jsonb_array_elements(p_document->'items') loop
  if jsonb_typeof(item) is distinct from 'object' or coalesce(item->>'type','') not in ('link','copy')
   or length(trim(coalesce(item->>'title',''))) not between 1 and 80
   or length(coalesce(item->>'subtitle',''))>160 or length(trim(coalesce(item->>'value',''))) not between 1 and 2048
   then raise exception 'INVALID_BUTTON'; end if;
  if item->>'type'='link' and ((item->>'value') !~ '^https?://[^[:space:]/?#@]+([/?#][^[:space:]]*)?$') then raise exception 'INVALID_LINK'; end if;
  button_id:=item->>'id';
  if button_id is null then button_id:=md5((jsonb_array_length(clean_items)+1)::text||':'||(item->>'type')||':'||(item->>'value')); end if;
  if button_id !~ '^[a-f0-9]{32}$' or exists(select 1 from jsonb_array_elements(clean_items) x where x->>'id'=button_id) then raise exception 'INVALID_BUTTON'; end if;
  clean_items:=clean_items||jsonb_build_array(jsonb_build_object('id',button_id,'type',item->>'type','title',trim(item->>'title'),'subtitle',coalesce(item->>'subtitle',''),'value',trim(item->>'value')));
 end loop;
 doc:=jsonb_build_object('nickname',trim(p_document->>'nickname'),'slug',p_document->>'slug','photo',photo,'items',clean_items,'rulesEnabled',rules_enabled,'rulesText',rules_text,'layout',layout);
 if p_action='publish' and (photo='' or jsonb_array_length(clean_items)=0) then raise exception 'PHOTO_AND_BUTTON_REQUIRED'; end if;
 insert into public.creator_landings(user_id,draft,published) values(p_owner,doc,case when p_action='publish' then doc end)
 on conflict(user_id) do update set draft=doc,published=case when p_action='publish' then doc else creator_landings.published end,revision=creator_landings.revision+1,updated_at=now();
 return (select jsonb_build_object('draft',draft,'published',published,'revision',revision,'is_disabled',is_disabled) from public.creator_landings where user_id=p_owner);
exception when unique_violation then raise exception 'SLUG_TAKEN';
end $$;
revoke all on function public.landing_save_for(uuid,jsonb,integer,text) from public,anon,authenticated;
create or replace function public.landing_save(p_document jsonb,p_revision integer,p_action text default 'draft') returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not public.landing_allowed() then raise exception 'LANDING_ACCESS_REQUIRED' using errcode='42501'; end if;
 perform public.landing_save_for(auth.uid(),p_document,p_revision,p_action);
 return public.landing_get();
end $$;
create or replace function public.landing_public(p_slug text) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(
 (select case when c.is_disabled or not exists(select 1 from public.landing_access a where a.user_id=c.user_id) then jsonb_build_object('_disabled',true) else c.published end from public.creator_landings c where c.published->>'slug'=p_slug),
 (select jsonb_build_object('_legacy',true) from public.landing_templates where slug=p_slug and not claimed));
$$;
alter table public.store_apps add column if not exists is_disabled boolean not null default false;
create or replace function public.has_app_access(
  p_user_id uuid,
  p_app_id text,
  p_machine_id text
) returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select not exists(select 1 from public.store_apps where id=p_app_id and is_disabled) and (
    exists (
      select 1 from public.exclusive_app_grants g
      where g.user_id = p_user_id and g.app_id = p_app_id
    )
    or exists (
      select 1 from public.app_access_grants g
      where g.user_id = p_user_id and g.app_id = p_app_id
    )
    or exists (
      select 1 from public.app_licenses l
      where l.user_id = p_user_id
        and l.app_id in (p_app_id, 'all')
        and l.is_active
        and (l.expires_at is null or l.expires_at > now())
        and (l.machine_id is null or l.machine_id = '' or l.machine_id = '*' or l.machine_id = p_machine_id)
    )
    or exists (
      select 1 from public.app_subscriptions s
      where s.user_id = p_user_id
        and s.expires_at > now()
        and s.app_id in ('all', p_app_id, 'tiktimer')
    )
    or exists (
      select 1 from public.trial_redemptions t
      where t.user_id = p_user_id and t.expires_at > now()
    ));
$$;


drop policy if exists admin_creator_portrait_insert on storage.objects;
create policy admin_creator_portrait_insert on storage.objects for insert to authenticated with check (bucket_id='creator-portraits' and public.is_efir_admin() and split_part(name,'/',1)=auth.uid()::text and name ~ '\.png$');
-- Appended to admin-control.sql by the preparation script; not a standalone migration.
create or replace function public.admin_control_list(p_kind text,p_search text default '',p_offset integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; needle text:='%'||lower(trim(coalesce(p_search,'')))||'%';
begin
 if not public.is_efir_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
 if p_offset is null or p_offset<0 then raise exception 'INVALID_OFFSET'; end if;
 if p_kind='landings' then
  with rows as (select c.*,u.email,exists(select 1 from public.landing_access a where a.user_id=c.user_id) editor_access from public.creator_landings c join auth.users u on u.id=c.user_id where lower(coalesce(u.email,'')||' '||c.user_id::text||' '||coalesce(c.draft->>'nickname','')) like needle or lower(coalesce(c.published->>'slug','')||' '||coalesce(c.draft->>'slug','')) like needle)
  select jsonb_build_object('total',(select count(*) from rows),'items',coalesce((select jsonb_agg(r) from (select * from rows order by updated_at desc,user_id limit 50 offset p_offset) r),'[]')) into result;
 elsif p_kind='apps' then
  with rows as (select a.*,coalesce((select jsonb_agg(m order by m.position,m.id) from public.store_media m where m.app_id=a.id),'[]') media from public.store_apps a where lower(a.id||' '||a.name) like needle)
  select jsonb_build_object('total',(select count(*) from rows),'items',coalesce((select jsonb_agg(r) from (select * from rows order by name,id limit 50 offset p_offset) r),'[]')) into result;
 elsif p_kind='promos' then
  with rows as (select * from public.trial_promos where lower(code) like needle)
  select jsonb_build_object('total',(select count(*) from rows),'items',coalesce((select jsonb_agg(r) from (select * from rows order by created_at desc,code limit 50 offset p_offset) r),'[]')) into result;
 elsif p_kind='subscriptions' then
  with rows as (select u.id user_id,u.email,coalesce(u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'name','') name,
   (select max(expires_at) from public.app_subscriptions s where s.user_id=u.id) expires_at,
   coalesce((select jsonb_agg(s order by s.expires_at desc) from public.app_subscriptions s where s.user_id=u.id),'[]') subscriptions,
   (select to_jsonb(t) from public.trial_redemptions t where t.user_id=u.id) trial
   from auth.users u where lower(coalesce(u.email,'')||' '||u.id::text||' '||coalesce(u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'name','')) like needle)
  select jsonb_build_object('total',(select count(*) from rows),'items',coalesce((select jsonb_agg(r) from (select * from rows order by expires_at desc nulls last,user_id limit 50 offset p_offset) r),'[]')) into result;
 else raise exception 'INVALID_KIND'; end if;
 return result;
end $$;

create or replace function public.admin_control_landing(p_user_id uuid,p_revision integer,p_action text,p_document jsonb default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.creator_landings; result jsonb;
begin
 if not public.is_efir_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended('landing:'||p_user_id::text,0));
 select * into c from public.creator_landings where user_id=p_user_id for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if c.revision is distinct from p_revision then raise exception 'LANDING_CHANGED'; end if;
 if p_action in ('disable','enable') then
  update public.creator_landings set is_disabled=p_action='disable',revision=revision+1,updated_at=now() where user_id=p_user_id;
 elsif p_action in ('draft','publish','unpublish') then
  perform public.landing_save_for(p_user_id,p_document,p_revision,p_action);
 else raise exception 'INVALID_ACTION'; end if;
 insert into public.admin_audit_log(admin_user_id,target_user_id,action,details) values(auth.uid(),p_user_id,'landing_'||p_action,jsonb_build_object('before',to_jsonb(c),'document',p_document));
 select to_jsonb(l) into result from public.creator_landings l where user_id=p_user_id;
 return result;
end $$;

create or replace function public.admin_control_app(p_document jsonb,p_revision integer default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare old public.store_apps; saved public.store_apps; item jsonb; app text:=trim(p_document->>'id');
begin
 if not public.is_efir_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
 if jsonb_typeof(p_document) is distinct from 'object' or octet_length(p_document::text)>100000 or app is null or app !~ '^[a-z0-9][a-z0-9_-]{0,63}$' then raise exception 'INVALID_APP'; end if;
 perform pg_advisory_xact_lock(hashtextextended('admin-app:'||app,0));
 select * into old from public.store_apps where id=app for update;
 if (found and old.admin_revision is distinct from p_revision) or (not found and p_revision is not null) then raise exception 'DATA_CHANGED'; end if;
 if length(trim(coalesce(p_document->>'name',''))) not between 1 and 100
 or length(coalesce(p_document->>'description',''))>1000 or length(coalesce(p_document->>'long_description',''))>20000
 or coalesce(p_document->>'owner','') !~ '^[A-Za-z0-9][A-Za-z0-9-]{0,99}$'
 or coalesce(p_document->>'repo','') !~ '^[A-Za-z0-9_.-]{1,100}$'
 or coalesce(p_document->>'executable','') !~ '^[A-Za-z0-9А-Яа-яЁё _().-]{1,100}\.exe$'
 or length(coalesce(p_document->>'icon',''))>100
 or jsonb_typeof(p_document->'is_disabled') is distinct from 'boolean'
 or jsonb_typeof(p_document->'is_published') is distinct from 'boolean' or jsonb_typeof(p_document->'is_exclusive') is distinct from 'boolean'
 or jsonb_typeof(p_document->'media') is distinct from 'array' or jsonb_array_length(p_document->'media')>30 then raise exception 'INVALID_APP'; end if;
 for item in select to_jsonb(v) from unnest(array[p_document->>'icon_url',p_document->>'cover_url']) v loop
  if length(coalesce(item#>>'{}',''))>2048 or (coalesce(item#>>'{}','')<>'' and item#>>'{}' !~ '^https://[^[:space:]]+$') then raise exception 'INVALID_URL'; end if;
 end loop;
 for item in select value from jsonb_array_elements(p_document->'media') loop
  if coalesce(item->>'url','') !~ '^https://[^[:space:]]+$' or length(item->>'url')>2048 or coalesce(item->>'kind','') not in ('image','video') then raise exception 'INVALID_MEDIA'; end if;
 end loop;
 insert into public.store_apps(id,name,description,long_description,owner,repo,executable,icon,icon_url,cover_url,is_published,is_exclusive,is_disabled,admin_revision)
 values(app,trim(p_document->>'name'),coalesce(p_document->>'description',''),coalesce(p_document->>'long_description',''),p_document->>'owner',p_document->>'repo',p_document->>'executable',coalesce(p_document->>'icon',''),nullif(p_document->>'icon_url',''),nullif(p_document->>'cover_url',''),(p_document->>'is_published')::boolean,(p_document->>'is_exclusive')::boolean,(p_document->>'is_disabled')::boolean,coalesce(old.admin_revision,-1)+1)
 on conflict(id) do update set name=excluded.name,description=excluded.description,long_description=excluded.long_description,owner=excluded.owner,repo=excluded.repo,executable=excluded.executable,icon=excluded.icon,icon_url=excluded.icon_url,cover_url=excluded.cover_url,is_published=excluded.is_published,is_exclusive=excluded.is_exclusive,is_disabled=excluded.is_disabled,admin_revision=excluded.admin_revision returning * into saved;
 delete from public.store_media where app_id=app;
 insert into public.store_media(app_id,url,kind,position) select app,value->>'url',value->>'kind',ordinality-1 from jsonb_array_elements(p_document->'media') with ordinality;
 insert into public.admin_audit_log(admin_user_id,app_id,action,details) values(auth.uid(),app,'app_save',jsonb_build_object('before',to_jsonb(old),'after',to_jsonb(saved)));
 return to_jsonb(saved);
end $$;

create or replace function public.admin_control_promo(p_document jsonb,p_revision integer default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare old public.trial_promos; saved public.trial_promos; v_code text:=upper(trim(p_document->>'code')); days integer; maximum integer; expiry timestamptz;
begin
 if not public.is_efir_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
 if v_code is null or v_code !~ '^[A-Z0-9_-]{3,64}$' or jsonb_typeof(p_document->'is_active') is distinct from 'boolean' then raise exception 'INVALID_PROMO'; end if;
 days:=(p_document->>'days')::integer;maximum:=nullif(p_document->>'max_redemptions','')::integer;expiry:=nullif(p_document->>'expires_at','')::timestamptz;
 if days is null or days not between 1 and 365 or maximum<1 then raise exception 'INVALID_PROMO'; end if;
 perform pg_advisory_xact_lock(hashtextextended('admin-promo:'||v_code,0));
 select * into old from public.trial_promos p where p.code=v_code for update;
 if (found and old.admin_revision is distinct from p_revision) or (not found and p_revision is not null) then raise exception 'DATA_CHANGED'; end if;
 if maximum<coalesce(old.redemptions_count,0) then raise exception 'LIMIT_BELOW_USED'; end if;
 insert into public.trial_promos(code,days,is_active,expires_at,max_redemptions,admin_revision) values(v_code,days,(p_document->>'is_active')::boolean,expiry,maximum,coalesce(old.admin_revision,-1)+1)
 on conflict on constraint trial_promos_pkey do update set days=excluded.days,is_active=excluded.is_active,expires_at=excluded.expires_at,max_redemptions=excluded.max_redemptions,admin_revision=excluded.admin_revision returning * into saved;
 insert into public.admin_audit_log(admin_user_id,action,details) values(auth.uid(),'promo_save',jsonb_build_object('before',to_jsonb(old),'after',to_jsonb(saved)));
 return to_jsonb(saved);
end $$;

create or replace function public.admin_control_subscription(p_user_id uuid,p_days integer,p_expected timestamptz,p_kind text default 'subscription',p_scope text default 'all') returns jsonb language plpgsql security definer set search_path='' as $$
declare expiry timestamptz; next_expiry timestamptz;
begin
 if not public.is_efir_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
 if p_days is null or p_days=0 or abs(p_days::bigint)>36500 or p_kind not in ('subscription','trial') or p_kind is null or p_scope is null then raise exception 'INVALID_DAYS'; end if;
 if not exists(select 1 from auth.users where id=p_user_id) then raise exception 'NOT_FOUND'; end if;
 if p_kind='trial' then
  select expires_at into expiry from public.trial_redemptions where user_id=p_user_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
 else
  if p_scope<>'all' and not exists(select 1 from public.store_apps where id=p_scope) then raise exception 'INVALID_APP'; end if;
  -- Serialize with payment inserts as well as other administrator adjustments.
  lock table public.app_subscriptions in share row exclusive mode;
  select max(expires_at) into expiry from public.app_subscriptions where user_id=p_user_id and app_id=p_scope;
 end if;
 if expiry is distinct from p_expected then raise exception 'DATA_CHANGED'; end if;
 if p_days<0 and (expiry is null or expiry<=now()) then raise exception 'NO_ACTIVE_SUBSCRIPTION'; end if;
 next_expiry:=greatest(now(),coalesce(expiry,now()))+make_interval(days=>p_days);
 next_expiry:=greatest(now(),next_expiry);
 if p_kind='trial' then update public.trial_redemptions set expires_at=next_expiry where user_id=p_user_id;
 elsif p_days>0 then insert into public.app_subscriptions(user_id,app_id,starts_at,expires_at,source) values(p_user_id,p_scope,now(),next_expiry,'admin');
 else update public.app_subscriptions set expires_at=least(expires_at,next_expiry) where user_id=p_user_id and app_id=p_scope and expires_at>now(); end if;
 insert into public.admin_audit_log(admin_user_id,target_user_id,action,details) values(auth.uid(),p_user_id,'subscription_days',jsonb_build_object('kind',p_kind,'scope',p_scope,'days',p_days,'before',expiry,'after',next_expiry));
 return jsonb_build_object('expires_at',next_expiry);
end $$;
revoke all on function public.admin_control_list(text,text,integer),public.admin_control_landing(uuid,integer,text,jsonb),public.admin_control_app(jsonb,integer),public.admin_control_promo(jsonb,integer),public.admin_control_subscription(uuid,integer,timestamptz,text,text) from public,anon,authenticated;
grant execute on function public.admin_control_list(text,text,integer),public.admin_control_landing(uuid,integer,text,jsonb),public.admin_control_app(jsonb,integer),public.admin_control_promo(jsonb,integer),public.admin_control_subscription(uuid,integer,timestamptz,text,text) to authenticated;
commit;
