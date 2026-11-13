-- Read-only metadata audit. Run with: supabase db query --read-only --remote=<ref> --file scripts/security-database.sql
-- Does not read application rows, user identities, vault contents or API credentials.
select jsonb_build_object(
  'tables', (select jsonb_agg(jsonb_build_object('schema', n.nspname, 'table', c.relname, 'rls', c.relrowsecurity,
    'anon_select', has_table_privilege('anon', c.oid, 'select'),
    'authenticated_write', has_table_privilege('authenticated', c.oid, 'insert,update,delete')))
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'graphql_public', 'storage') and c.relkind in ('r', 'p')),
  'policies', (select jsonb_agg(to_jsonb(p)) from pg_policies p where schemaname in ('public', 'graphql_public', 'storage')),
  'functions', (select jsonb_agg(jsonb_build_object('name', p.oid::regprocedure::text, 'security_definer', p.prosecdef,
    'settings', p.proconfig, 'anon_execute', has_function_privilege('anon', p.oid, 'execute'),
    'authenticated_execute', has_function_privilege('authenticated', p.oid, 'execute')))
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'),
  'buckets', (select jsonb_agg(jsonb_build_object('id', id, 'public', public, 'file_size_limit', file_size_limit, 'allowed_mime_types', allowed_mime_types)) from storage.buckets)
) as security_audit;
