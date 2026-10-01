-- Anonymous, approximate navigation analytics. Never used to bind an account or pay money.
begin;
create or replace function public.landing_referral_track(p_slug text,p_session uuid)
returns void language plpgsql security definer set search_path='' as $$
declare owner_id uuid; accepted uuid; today date:=(now() at time zone 'UTC')::date;
begin
  if p_session is null or p_slug is null or p_slug !~ '^[a-z0-9][a-z0-9_-]{2,39}$' then return; end if;
  select c.user_id into owner_id from public.creator_landings c join public.landing_access a using(user_id)
    where c.published->>'slug'=p_slug and not c.is_disabled;
  if owner_id is null then return; end if;
  insert into public.landing_event_sessions(user_id,day,session_id,button_id)
    values(owner_id,today,p_session,'__referral_home') on conflict do nothing returning user_id into accepted;
  if accepted is null then return; end if;
  insert into public.landing_daily_stats(user_id,day,button_id,title,hits)
    values(owner_id,today,'__referral_home','Переходы на сайт EFIR',1)
    on conflict(user_id,day,button_id) do update set hits=landing_daily_stats.hits+1;
  delete from public.landing_event_sessions where user_id=owner_id and day<today-1;
end $$;
revoke all on function public.landing_referral_track(text,uuid) from public;
grant execute on function public.landing_referral_track(text,uuid) to anon,authenticated;
commit;
