-- Run after tribute-telegram-switch.sql. Detach only this Telegram's Tribute grants.
begin;
create or replace function public.efir_telegram_unlink(p_user uuid,p_telegram text) returns void language plpgsql security definer set search_path='' as $$
declare linked text;
begin
 perform pg_advisory_xact_lock(hashtextextended('telegram-user:'||p_user::text,82731));
 perform 1 from public.launcher_telegram_challenges where user_id=p_user for update;
 select telegram_id into linked from public.launcher_telegram_links where user_id=p_user for update;
 if linked is null then return;end if;
 if p_telegram is null or linked<>p_telegram then raise exception 'TELEGRAM_CHANGED';end if;
 perform pg_advisory_xact_lock(hashtextextended(linked,82731));
 update public.launcher_tribute_subscriptions t set access_expires_at=g.expires_at
 from public.app_subscriptions g where t.telegram_id=linked and t.grant_id=g.id and g.user_id=p_user;
 delete from public.app_subscriptions g using public.launcher_tribute_subscriptions t
 where t.telegram_id=linked and t.grant_id=g.id and g.user_id=p_user;
 delete from public.launcher_telegram_links where user_id=p_user and telegram_id=linked;
 update public.launcher_telegram_challenges set consumed=true where user_id=p_user;
end $$;
revoke all on function public.efir_telegram_unlink(uuid,text) from public,anon,authenticated;
grant execute on function public.efir_telegram_unlink(uuid,text) to service_role;
create or replace function public.efir_telegram_begin(p_user uuid,p_hash text)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('telegram-user:'||p_user::text,82731));
 if p_hash is null or p_hash !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_CHALLENGE'; end if;
 insert into public.launcher_telegram_challenges(user_id,token_hash,expires_at)
 values(p_user,p_hash,now()+interval '10 minutes')
 on conflict(user_id) do update set token_hash=excluded.token_hash,expires_at=excluded.expires_at,telegram_id=null,display_name=null,consumed=false;
end $$;

create or replace function public.efir_telegram_confirm(p_user uuid,p_hash text)
returns void language plpgsql security definer set search_path='' as $$
declare c public.launcher_telegram_challenges; s public.launcher_tribute_subscriptions;
 old_telegram text; lock_id text; new_grant uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended('telegram-user:'||p_user::text,82731));
 select * into c from public.launcher_telegram_challenges where user_id=p_user and token_hash=p_hash for update;
 if not found or c.consumed or c.expires_at<=now() or c.telegram_id is null then raise exception 'CHALLENGE_EXPIRED'; end if;
 select telegram_id into old_telegram from public.launcher_telegram_links where user_id=p_user for update;
 -- Consistent lock order, shared with payment webhooks, prevents grant races/deadlocks.
 for lock_id in select distinct x from unnest(array[old_telegram,c.telegram_id]) x where x is not null order by x loop
  perform pg_advisory_xact_lock(hashtextextended(lock_id,82731));
 end loop;
 if exists(select 1 from public.launcher_telegram_links where telegram_id=c.telegram_id and user_id<>p_user) then raise exception 'TELEGRAM_ALREADY_LINKED'; end if;
 if old_telegram is distinct from c.telegram_id then
  -- Preserve an administrator's expiry adjustment when detaching a paid period.
  update public.launcher_tribute_subscriptions t set access_expires_at=g.expires_at
  from public.app_subscriptions g where t.telegram_id=old_telegram and t.grant_id=g.id and g.user_id=p_user;
  delete from public.app_subscriptions g using public.launcher_tribute_subscriptions t
  where t.telegram_id=old_telegram and t.grant_id=g.id and g.user_id=p_user;
 end if;
 insert into public.launcher_telegram_links(user_id,telegram_id,display_name)
 values(p_user,c.telegram_id,c.display_name)
 on conflict(user_id) do update set telegram_id=excluded.telegram_id,display_name=excluded.display_name,linked_at=now();
 update public.launcher_telegram_challenges set consumed=true where user_id=p_user;
 for s in select * from public.launcher_tribute_subscriptions where telegram_id=c.telegram_id for update loop
  if s.grant_id is null then
   insert into public.app_subscriptions(user_id,app_id,expires_at,source)
   values(p_user,'all',coalesce(s.access_expires_at,s.expires_at),'tribute:'||s.subscription_id) returning id into new_grant;
   update public.launcher_tribute_subscriptions set grant_id=new_grant where telegram_id=s.telegram_id and subscription_id=s.subscription_id;
  end if;
 end loop;
end $$;


commit;
