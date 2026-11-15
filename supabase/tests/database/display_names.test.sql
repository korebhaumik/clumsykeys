begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(8);
insert into auth.users(id,email,raw_user_meta_data) values ('90000000-0000-4000-8000-000000000001','github@test.local','{"full_name":"GitHub typist","user_name":"github-handle"}');
select is((select display_name from public.profiles where id='90000000-0000-4000-8000-000000000001'), 'GitHub typist', 'OAuth signup uses provider name');
update auth.users set raw_user_meta_data = raw_user_meta_data || '{"display_name":"New name"}' where id='90000000-0000-4000-8000-000000000001';
select is((select display_name from public.profiles where id='90000000-0000-4000-8000-000000000001'), 'New name', 'Auth updates synchronize public profile');
insert into public.practice_results(id,user_id,mode,language,settings,correct,incorrect,extra,elapsed_seconds,wpm,raw,accuracy,deviation)
values ('91000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001','prose','english','{"timer":30}',100,0,0,30,50,50,100,0);
select is(public.read_solo_leaderboard('{"mode":"prose","language":"english","test":"time","length":30,"range":"all","page":1}', '90000000-0000-4000-8000-000000000001') #>> '{currentUser,username}', 'New name', 'rankings use edited profile name');
select is(public.account_display_name('{"display_name":"  ","user_name":"handle"}'), 'handle', 'blank values fall through');
select is(public.account_display_name('{"display_name":"private@example.com","name":"Public"}'), 'Public', 'email is not a public name');
select is(public.account_display_name('{"name":42}'), '', 'non-string metadata ignored');
select is(length(public.account_display_name(jsonb_build_object('name',repeat('a',80)))),50,'names bounded');
select ok(not has_function_privilege('authenticated','public.account_display_name(jsonb)','execute'),'helper unavailable to browser roles');
select * from finish();
rollback;
