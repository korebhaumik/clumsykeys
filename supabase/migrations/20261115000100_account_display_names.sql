-- Keep Auth metadata and the public leaderboard profile in one transaction.
create function public.account_display_name(metadata jsonb) returns text
language sql immutable set search_path = '' as $$
  select coalesce((select left(btrim(metadata ->> key), 50)
    from unnest(array['display_name', 'full_name', 'name', 'user_name', 'preferred_username']) with ordinality as names(key, position)
    where jsonb_typeof(metadata -> key) = 'string'
      and btrim(metadata ->> key) <> '' and position('@' in metadata ->> key) = 0
    order by names.position limit 1), '');
$$;
revoke all on function public.account_display_name(jsonb) from public, anon, authenticated;

create or replace function public.create_account_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, public.account_display_name(new.raw_user_meta_data))
  on conflict (id) do update set display_name = excluded.display_name;
  return new;
end;
$$;
create trigger update_account_profile after update of raw_user_meta_data on auth.users
for each row when (old.raw_user_meta_data is distinct from new.raw_user_meta_data)
execute function public.create_account_profile();

-- Repair previously blank OAuth profiles without replacing authored names.
update public.profiles p set display_name = public.account_display_name(u.raw_user_meta_data)
from auth.users u where p.id = u.id and (btrim(p.display_name) = '' or p.display_name like '%@%');
