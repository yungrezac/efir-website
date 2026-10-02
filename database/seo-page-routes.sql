-- Reserve marketing routes before publishing the new website.
-- Existing creator pages and drafts are never overwritten.
begin;
lock table public.creator_landings in share row exclusive mode;
do $$ begin
  if exists(select 1 from public.creator_landings
    where draft->>'slug' in ('apps','guides') or published->>'slug' in ('apps','guides'))
    or exists(select 1 from public.landing_templates where slug in ('apps','guides')) then
    raise exception 'MARKETING_ROUTE_ALREADY_IN_USE';
  end if;
  insert into public.landing_reserved_slugs(slug) values ('apps'),('guides') on conflict do nothing;
end $$;
commit;
