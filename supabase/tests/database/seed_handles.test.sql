begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(8);
insert into auth.users(id,email,raw_user_meta_data) values
('93000000-0000-4000-8000-000000000001','seed1@test.local','{"display_name":"Seed Example"}'),
('93000000-0000-4000-8000-000000000002','seed2@test.local','{"display_name":"Seed Example"}'),
('93000000-0000-4000-8000-000000000003','seed3@test.local','{"display_name":"Seed Example"}'),
('93000000-0000-4000-8000-000000000004','seed4@test.local','{"display_name":"GitHub Name","user_name":"github_seed_handle"}'),
('93000000-0000-4000-8000-000000000005','seed5@test.local','{"display_name":"private@example.com"}');
select public.save_account_handle('93000000-0000-4000-8000-000000000001','seed_example');
select public.seed_existing_account_handles();
select is((select handle from public.profiles where id='93000000-0000-4000-8000-000000000001'),'seed_example','claimed handle preserved');
select is((select handle from public.profiles where id='93000000-0000-4000-8000-000000000002'),'seed_example_2','collision gets suffix');
select is((select handle from public.profiles where id='93000000-0000-4000-8000-000000000003'),'seed_example_3','duplicate names get distinct handles');
select is((select handle from public.profiles where id='93000000-0000-4000-8000-000000000004'),'github_seed_handle','OAuth username preferred');
select ok((select handle ~ '^typist(_[0-9]+)?$' from public.profiles where id='93000000-0000-4000-8000-000000000005'),'email never used as a public handle');
select public.seed_existing_account_handles();
select is((select handle from public.profiles where id='93000000-0000-4000-8000-000000000003'),'seed_example_3','rerun leaves seeded handles alone');
select ok(not has_function_privilege('authenticated','public.seed_existing_account_handles()','execute'),'browser cannot bulk seed profiles');
select ok(not has_function_privilege('service_role','public.seed_existing_account_handles()','execute'),'backend API role cannot bulk seed profiles');
select * from finish();
rollback;
