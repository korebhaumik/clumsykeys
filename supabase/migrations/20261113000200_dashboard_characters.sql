-- One private snapshot, computed over all saved solo tests rather than a history page.
create or replace function public.read_account_dashboard(p_user_id uuid)
returns jsonb language sql stable set search_path = '' as $$
  with owned as (
    select * from public.practice_results where user_id = p_user_id
  ), bests as (
    select distinct on (mode) * from owned
    order by mode, wpm desc, accuracy desc, created_at desc, id
  ), recent as (
    select * from owned order by created_at desc, id limit 5
  )
  select jsonb_build_object(
    'stats', jsonb_build_object(
      'tests', count(*), 'seconds', coalesce(sum(elapsed_seconds), 0),
      'characters', coalesce(sum(correct::bigint + incorrect + extra), 0),
      'averageWpm', coalesce(avg(wpm), 0), 'averageRaw', coalesce(avg(raw), 0),
      'averageAccuracy', coalesce(avg(accuracy), 0), 'bestWpm', coalesce(max(wpm), 0)
    ),
    'bests', coalesce((select jsonb_agg(to_jsonb(b) order by b.mode) from bests b), '[]'::jsonb),
    'recent', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc, r.id) from recent r), '[]'::jsonb)
  ) from owned;
$$;
-- Only the backend may choose an owner after authenticating the request.
revoke all on function public.read_account_dashboard(uuid) from public, anon, authenticated;
grant execute on function public.read_account_dashboard(uuid) to service_role;
