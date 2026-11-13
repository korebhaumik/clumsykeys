create function public.anonymize_deleted_account_races() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.race_results set username = 'Deleted account', racer_id = participant_id::text
  where account_id = old.id;
  return old;
end;
$$;
revoke all on function public.anonymize_deleted_account_races() from public, anon, authenticated;
create trigger anonymize_deleted_account_races before delete on auth.users
for each row execute function public.anonymize_deleted_account_races();
