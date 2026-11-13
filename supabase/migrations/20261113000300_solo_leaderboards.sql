-- Only the trusted backend can read the public projection; private table grants stay unchanged.
create index practice_results_leaderboard on public.practice_results(mode, language, wpm desc, accuracy desc, created_at, id);
create function public.read_solo_leaderboard(p_filters jsonb, p_viewer uuid default null)
returns jsonb language sql stable set search_path = '' as $$
with eligible as (
  select r.*, row_number() over (partition by r.user_id order by r.wpm desc, r.accuracy desc, r.created_at, r.id) as personal
  from public.practice_results r
  where r.mode = case when p_filters->>'mode' = 'prose' then 'prose'
    when p_filters->>'test' = 'snippets' then 'code-snippets' else 'code-keywords' end
    and (case when p_filters->>'test' = 'quotes' then 'english' else r.language end) = p_filters->>'language'
    and case p_filters->>'test'
      when 'time' then r.settings->>'timer' = p_filters->>'length'
      when 'words' then r.settings->>'words' = p_filters->>'length'
      when 'quotes' then r.settings->>'quotes' = 'Random Quotes'
      when 'snippets' then true
      when 'keywords-time' then r.settings->'limit'->>'type' = 'time' and r.settings->'limit'->>'value' = p_filters->>'length'
      when 'keywords-words' then r.settings->'limit'->>'type' = 'words' and r.settings->'limit'->>'value' = p_filters->>'length'
      else false end
    and r.created_at <= now()
    and (p_filters->>'range' = 'all' or r.created_at >= now() - case p_filters->>'range'
      when 'month' then interval '30 days' when 'week' then interval '7 days' else interval '1 day' end)
), ranked as (
  select e.*, row_number() over (order by e.wpm desc, e.accuracy desc, e.created_at, e.id) as rank
  from eligible e where personal = 1
), totals as (
  select count(*) as total, greatest(1, ceil(count(*) / 10.0)::integer) as pages from ranked
), bounds as (
  select *, least(greatest(1, (p_filters->>'page')::integer), pages) as page from totals
), projected as (
  select r.rank, r.user_id = p_viewer as own, jsonb_build_object(
    'id', r.id, 'userId', md5(r.user_id::text),
    'username', case when trim(coalesce(p.display_name, '')) = '' or p.display_name like '%@%' then 'Anonymous typist' else p.display_name end,
    'mode', p_filters->>'mode', 'language', p_filters->>'language', 'test', p_filters->>'test', 'length', (p_filters->>'length')::integer,
    'wpm', r.wpm, 'raw', r.raw, 'accuracy', r.accuracy, 'deviation', r.deviation,
    'correct', r.correct, 'incorrect', r.incorrect, 'extra', r.extra, 'date', r.created_at, 'rank', r.rank
  ) as score from ranked r left join public.profiles p on p.id = r.user_id
)
select jsonb_build_object('total', b.total, 'pages', b.pages, 'page', b.page,
  'rows', coalesce((select jsonb_agg(score order by rank) from projected where rank > (b.page-1)*10 and rank <= b.page*10), '[]'::jsonb),
  'currentUser', (select score from projected where own)) from bounds b;
$$;
revoke all on function public.read_solo_leaderboard(jsonb, uuid) from public, anon, authenticated;
grant execute on function public.read_solo_leaderboard(jsonb, uuid) to service_role;
