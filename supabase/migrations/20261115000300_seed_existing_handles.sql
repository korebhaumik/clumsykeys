-- One-time backfill for accounts that predate handles. Claimed handles are preserved.
create function public.seed_existing_account_handles() returns void
language plpgsql security definer set search_path = '' as $$
declare profile record; base text; candidate text; suffix text; attempt integer;
begin
  -- Keep the short backfill consistent with concurrent profile/handle updates.
  lock table public.profiles in share row exclusive mode;
  for profile in
    select p.id, p.display_name, u.raw_user_meta_data from public.profiles p
    join auth.users u on u.id = p.id where p.handle is null order by p.created_at, p.id
  loop
    base := public.account_display_name(jsonb_build_object(
      'display_name', profile.raw_user_meta_data ->> 'user_name',
      'full_name', profile.raw_user_meta_data ->> 'preferred_username',
      'name', profile.display_name));
    base := btrim(regexp_replace(lower(base), '[^a-z0-9_]+', '_', 'g'), '_');
    if length(base) < 3 then base := 'typist' || case when base = '' then '' else '_' || base end; end if;
    base := left(base, 24);
    candidate := base; attempt := 1;
    while exists (select 1 from public.profiles where handle = candidate) loop
      attempt := attempt + 1; suffix := '_' || attempt::text;
      candidate := left(base, 24 - length(suffix)) || suffix;
    end loop;
    update public.profiles set handle = candidate where id = profile.id and handle is null;
  end loop;
end;
$$;

-- Maintenance-only helper: no browser or backend API role may invoke a bulk seed.
revoke all on function public.seed_existing_account_handles() from public, anon, authenticated, service_role;
select public.seed_existing_account_handles();
