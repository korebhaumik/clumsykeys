begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(32);

select has_table('public', 'profiles', 'profiles exist');
select has_table('public', 'user_preferences', 'preferences exist');
select has_table('public', 'practice_results', 'practice summaries exist');
select has_table('public', 'practice_result_details', 'practice details exist');
select has_table('public', 'race_rounds', 'race rounds exist');
select has_table('public', 'race_results', 'race results exist');

insert into auth.users(id, email, raw_user_meta_data) values
  ('10000000-0000-4000-8000-000000000001', 'owner@test.local', '{"display_name":"Owner"}'),
  ('10000000-0000-4000-8000-000000000002', 'other@test.local', '{}');
select is((select display_name from public.profiles where id = '10000000-0000-4000-8000-000000000001'), 'Owner', 'signup creates a profile');
select is(public.save_account_preferences('10000000-0000-4000-8000-000000000001', '{"version":1}', 0), 1, 'first preference save sets revision');
select throws_ok($$select public.save_account_preferences('10000000-0000-4000-8000-000000000001', '{"version":1}', 0)$$,
  '40001', 'Preferences changed on another device', 'stale preference revision is rejected');

create temporary table fixture_result as select '{
  "id":"20000000-0000-4000-8000-000000000001", "mode":"prose", "language":"english", "settings":{},
  "stats":{"correct":40,"incorrect":10,"extra":0,"elapsedSeconds":10,"wpm":60,"raw":75,"accuracy":80,"deviation":0,"samples":[],"history":[]}
}'::jsonb as data;
select is(public.save_practice_result('10000000-0000-4000-8000-000000000001', (select data from fixture_result)),
  '20000000-0000-4000-8000-000000000001'::uuid, 'atomic practice write succeeds');
select is(public.save_practice_result('10000000-0000-4000-8000-000000000001', (select data from fixture_result)),
  '20000000-0000-4000-8000-000000000001'::uuid, 'retry returns same result');
select is((select count(*)::integer from public.practice_results), 1, 'retry creates no duplicates');
select throws_ok($$select public.save_practice_result('10000000-0000-4000-8000-000000000002', (select data from fixture_result))$$,
  '23505', 'Result identity conflict', 'another account cannot claim an existing result');
select throws_ok($$select public.save_practice_result('10000000-0000-4000-8000-000000000001',
  jsonb_set(jsonb_set((select data from fixture_result), '{id}', '"20000000-0000-4000-8000-000000000002"'), '{stats,samples}', '{}'))$$,
  '23514', null, 'invalid detail payload rolls back transaction');
select is((select count(*)::integer from public.practice_results), 1, 'failed detail write leaves no partial summary');

create temporary table fixture_round as select '{
  "id":"30000000-0000-4000-8000-000000000001", "roomId":"sql-test", "settings":{},
  "startedAt":"2026-11-12T00:00:00Z", "endedAt":"2026-11-12T00:00:30Z", "outcome":"completed",
  "results":[
    {"participantId":"40000000-0000-4000-8000-000000000001","accountId":"10000000-0000-4000-8000-000000000001","userId":"legacy-owner","username":"Owner","wpm":60,"accuracy":100,"typedChars":40,"finishSeconds":10,"reason":"completed","speedHistory":[]},
    {"participantId":"40000000-0000-4000-8000-000000000002","accountId":null,"userId":"legacy-guest","username":"Guest","wpm":50,"accuracy":90,"typedChars":30,"finishSeconds":null,"reason":"error-limit","speedHistory":[]}
  ]
}'::jsonb as data;
select is(public.save_race_round((select data from fixture_round)), '30000000-0000-4000-8000-000000000001'::uuid, 'round and participant write succeeds');
select is(public.save_race_round((select data from fixture_round)), '30000000-0000-4000-8000-000000000001'::uuid, 'round retry is idempotent');
select is((select count(*)::integer from public.race_results), 2, 'guest and account participants persist once');
select throws_ok($$select public.save_race_round(jsonb_set(jsonb_set((select data from fixture_round), '{id}',
  '"30000000-0000-4000-8000-000000000002"'), '{results,0,accuracy}', '101'))$$,
  '23514', null, 'invalid participant rejects whole round transaction');
select is((select count(*)::integer from public.race_rounds), 1, 'invalid participant leaves no partial round');

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
select is((select count(*)::integer from public.practice_results), 1, 'owner reads own summary');
select is((select count(*)::integer from public.practice_result_details), 1, 'owner reads own details');
select is((select count(*)::integer from public.race_results), 1, 'participant reads only own race entry');
select is((select count(*)::integer from public.race_rounds), 1, 'participant reads associated round');
select throws_ok($$select public.save_account_preferences('10000000-0000-4000-8000-000000000002', '{}', 0)$$,
  '42501', null, 'authenticated callers cannot invoke server write functions');
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000002';
select is((select count(*)::integer from public.practice_results), 0, 'other account cannot read summary');
select is((select count(*)::integer from public.practice_result_details), 0, 'other account cannot read details');
select is((select count(*)::integer from public.race_results), 0, 'nonparticipant cannot read race entries');
select is((select count(*)::integer from public.race_rounds), 0, 'nonparticipant cannot read race rounds');
set local role anon;
select throws_ok('select * from public.practice_results', '42501', null, 'anonymous callers have no table grants');
reset role;
delete from auth.users where id = '10000000-0000-4000-8000-000000000001';
select is((select count(*)::integer from public.practice_results), 0, 'account deletion cascades private history');
select is((select username from public.race_results where participant_id = '40000000-0000-4000-8000-000000000001'), 'Deleted account', 'account deletion anonymizes shared race display names');
select * from finish();
rollback;
