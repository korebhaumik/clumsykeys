begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(10);
insert into auth.users(id,email,raw_user_meta_data) values
('92000000-0000-4000-8000-000000000001','handle-a@test.local','{"display_name":"Alex"}'),
('92000000-0000-4000-8000-000000000002','handle-b@test.local','{"display_name":"Alex"}');
select is((select count(*)::int from public.profiles where display_name='Alex'),2,'duplicate display names allowed');
select is((select handle from public.profiles where id='92000000-0000-4000-8000-000000000001'),null,'accounts can choose a handle later');
select is(public.save_account_handle('92000000-0000-4000-8000-000000000001','  AlexKeys  '),'alexkeys','canonical lowercase handle');
select is(public.save_account_handle('92000000-0000-4000-8000-000000000001','ALEXKEYS'),'alexkeys','same-owner retry is safe');
select throws_ok($$select public.save_account_handle('92000000-0000-4000-8000-000000000002','AlexKeys')$$,'23505',null,'duplicate claim rejected');
select throws_ok($$select public.save_account_handle('92000000-0000-4000-8000-000000000002','@invalid')$$,'22023',null,'invalid format rejected');
select ok(not has_function_privilege('authenticated','public.save_account_handle(uuid,text)','execute'),'browser cannot claim as another owner');
select ok(not has_function_privilege('anon','public.save_account_handle(uuid,text)','execute'),'anonymous claim denied');
update auth.users set raw_user_meta_data='{"display_name":"Another Alex","handle":"stolen"}' where id='92000000-0000-4000-8000-000000000001';
select is((select handle from public.profiles where id='92000000-0000-4000-8000-000000000001'),'alexkeys','metadata edits cannot replace the claimed handle');
select ok(has_function_privilege('service_role','public.save_account_handle(uuid,text)','execute'),'backend may claim verified-owner handle');
select * from finish();
rollback;
