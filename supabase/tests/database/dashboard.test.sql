begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(14);
insert into auth.users(id, email, raw_user_meta_data) values
  ('50000000-0000-4000-8000-000000000001', 'dashboard-owner@test.local', '{}'),
  ('50000000-0000-4000-8000-000000000002', 'dashboard-other@test.local', '{}');
insert into public.practice_results(id, user_id, mode, language, settings, correct, incorrect, extra, elapsed_seconds, wpm, raw, accuracy, deviation, created_at)
select ('60000000-0000-4000-8000-' || lpad(g::text,12,'0'))::uuid,
  '50000000-0000-4000-8000-000000000001', 'prose', 'english', '{"timer":30}', 40, 3, 2, 10, g, g * 2, 90, 0, now() + g * interval '1 second'
from generate_series(1,25) g;
insert into public.practice_results(id, user_id, mode, language, settings, correct, incorrect, extra, elapsed_seconds, wpm, raw, accuracy, deviation)
values ('60000000-0000-4000-8000-000000000099', '50000000-0000-4000-8000-000000000002', 'prose', 'english', '{}', 40, 0, 0, 10, 999, 999, 100, 0);
create temporary table snapshot as select public.read_account_dashboard('50000000-0000-4000-8000-000000000001') as data;
select is((select (data #>> '{stats,tests}')::int from snapshot), 25, 'dashboard counts beyond the history page');
select is((select (data #>> '{stats,seconds}')::int from snapshot), 250, 'typing duration sums all owned tests');
select is((select (data #>> '{stats,averageWpm}')::numeric from snapshot), 13::numeric, 'average includes all owned tests');
select is((select (data #>> '{stats,averageRaw}')::numeric from snapshot), 26::numeric, 'raw average is correct');
select is((select (data #>> '{stats,averageAccuracy}')::numeric from snapshot), 90::numeric, 'accuracy average is correct');
select is((select (data #>> '{stats,bestWpm}')::int from snapshot), 25, 'other accounts cannot affect highest WPM');
select is((select jsonb_array_length(data -> 'recent') from snapshot), 5, 'only five recent rows returned');
select is((select (data #>> '{bests,0,wpm}')::int from snapshot), 25, 'best result is selected');
select is((public.read_account_dashboard('50000000-0000-4000-8000-000000000003') #>> '{stats,tests}')::int, 0, 'new account has zero tests');
select is((select (data #>> '{stats,characters}')::int from snapshot), 1125, 'character total includes correct, incorrect and extra input across all owned tests');
select is((public.read_account_dashboard('50000000-0000-4000-8000-000000000003') #>> '{stats,characters}')::int, 0, 'new account has zero typed characters');
select ok(not has_function_privilege('anon', 'public.read_account_dashboard(uuid)', 'execute'), 'anonymous roles cannot choose an owner');
select ok(not has_function_privilege('authenticated', 'public.read_account_dashboard(uuid)', 'execute'), 'browser roles cannot choose an owner');
select ok(has_function_privilege('service_role', 'public.read_account_dashboard(uuid)', 'execute'), 'backend can read a private snapshot');
select * from finish();
rollback;
