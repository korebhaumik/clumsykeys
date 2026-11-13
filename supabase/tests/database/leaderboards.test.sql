begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(14);
insert into auth.users(id, email, raw_user_meta_data)
select ('70000000-0000-4000-8000-' || lpad(g::text,12,'0'))::uuid, 'board' || g || '@test.local', '{"display_name":"Solo typist"}' from generate_series(1,12) g;
insert into public.practice_results(id,user_id,mode,language,settings,correct,incorrect,extra,elapsed_seconds,wpm,raw,accuracy,deviation,created_at)
select ('80000000-0000-4000-8000-' || lpad(g::text,12,'0'))::uuid, ('70000000-0000-4000-8000-' || lpad(g::text,12,'0'))::uuid,
'prose','english','{"timer":30}',100,0,0,30,130-g,130-g,100,0,now() - interval '2 days' from generate_series(1,12) g;
insert into public.practice_results(id,user_id,mode,language,settings,correct,incorrect,extra,elapsed_seconds,wpm,raw,accuracy,deviation)
values ('80000000-0000-4000-8000-000000000099','70000000-0000-4000-8000-000000000012','prose','english','{"timer":30}',100,0,0,30,50,50,100,0);
create temporary table board as select public.read_solo_leaderboard('{"mode":"prose","language":"english","test":"time","length":30,"range":"all","page":1}', '70000000-0000-4000-8000-000000000012') as data;
select is((select (data->>'total')::int from board),12,'one best per player');
select is((select jsonb_array_length(data->'rows') from board),10,'bounded page');
select is((select (data #>> '{currentUser,rank}')::int from board),12,'viewer outside page retains rank');
select is((select (data #>> '{currentUser,wpm}')::int from board),118,'best selected before paging');
select is((select data #>> '{rows,0,username}' from board),'Solo typist','display name joined');
select ok(not (select (data #> '{rows,0}') ? 'settings' from board),'private settings excluded');
select isnt((select data #>> '{currentUser,userId}' from board),'70000000-0000-4000-8000-000000000012','account UUID not exposed');
select is((public.read_solo_leaderboard('{"mode":"prose","language":"english","test":"time","length":30,"range":"all","page":99}') ->> 'page')::int,2,'stale page clamped');
select is((public.read_solo_leaderboard('{"mode":"prose","language":"english","test":"time","length":30,"range":"day","page":1}') ->> 'total')::int,1,'time filter before personal best');
select ok(not has_function_privilege('anon','public.read_solo_leaderboard(jsonb,uuid)','execute'),'anonymous direct RPC denied');
select ok(not has_function_privilege('authenticated','public.read_solo_leaderboard(jsonb,uuid)','execute'),'browser cannot impersonate viewer');
select ok(has_function_privilege('service_role','public.read_solo_leaderboard(jsonb,uuid)','execute'),'backend can execute');
insert into public.practice_results(id,user_id,mode,language,settings,correct,incorrect,extra,elapsed_seconds,wpm,raw,accuracy,deviation)
values ('80000000-0000-4000-8000-000000000098','70000000-0000-4000-8000-000000000012','code-keywords','randomJs','{"limit":{"type":"words","value":25}}',100,0,0,30,50,50,100,0);
select is((public.read_solo_leaderboard('{"mode":"dev","language":"randomJs","test":"keywords-words","length":25,"range":"all","page":1}') ->> 'total')::int,1,'Dev language and keyword length selected');
select is((public.read_solo_leaderboard('{"mode":"dev","language":"randomPy","test":"keywords-words","length":25,"range":"all","page":1}') ->> 'total')::int,0,'other Dev languages excluded');
select * from finish();
rollback;
