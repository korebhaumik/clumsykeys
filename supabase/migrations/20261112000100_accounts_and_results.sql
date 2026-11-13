-- Additive application schema. Auth is managed by Supabase.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (length(display_name) <= 50),
  created_at timestamptz not null default now()
);
create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 16384),
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);
create table public.practice_results (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('prose', 'code-snippets', 'code-keywords')),
  language text not null check (length(language) between 1 and 40),
  settings jsonb not null check (jsonb_typeof(settings) = 'object'),
  correct integer not null check (correct >= 0),
  incorrect integer not null check (incorrect >= 0),
  extra integer not null check (extra >= 0),
  elapsed_seconds double precision not null check (elapsed_seconds > 0 and elapsed_seconds <= 86400),
  wpm double precision not null check (wpm >= 0 and wpm < 'Infinity'::float8),
  raw double precision not null check (raw >= 0 and raw < 'Infinity'::float8),
  accuracy double precision not null check (accuracy between 0 and 100),
  deviation double precision not null check (deviation >= 0 and deviation < 'Infinity'::float8),
  metric_version integer not null default 1 check (metric_version = 1),
  created_at timestamptz not null default now()
);
create index practice_results_owner_time on public.practice_results(user_id, created_at desc, id);
create table public.practice_result_details (
  result_id uuid primary key references public.practice_results(id) on delete cascade,
  samples jsonb not null check (jsonb_typeof(samples) = 'array' and jsonb_array_length(samples) <= 86400),
  history jsonb not null check (jsonb_typeof(history) = 'array' and jsonb_array_length(history) <= 10000)
);
create table public.race_rounds (
  id uuid primary key,
  room_id text not null check (length(room_id) between 1 and 100),
  settings jsonb not null check (jsonb_typeof(settings) = 'object'),
  started_at timestamptz not null,
  ended_at timestamptz not null check (ended_at >= started_at),
  outcome text not null check (outcome in ('completed', 'aborted'))
);
create table public.race_results (
  round_id uuid not null references public.race_rounds(id) on delete cascade,
  participant_id uuid not null,
  account_id uuid references auth.users(id) on delete set null,
  racer_id text not null,
  username text not null check (length(username) between 1 and 50),
  wpm double precision not null check (wpm >= 0 and wpm < 'Infinity'::float8),
  accuracy double precision not null check (accuracy between 0 and 100),
  typed_chars integer not null check (typed_chars >= 0),
  finish_seconds double precision check (finish_seconds > 0 and finish_seconds < 'Infinity'::float8),
  reason text not null check (reason in ('completed', 'time-limit', 'disconnected')),
  speed_history jsonb not null check (jsonb_typeof(speed_history) = 'array' and jsonb_array_length(speed_history) <= 600),
  created_at timestamptz not null default now(),
  primary key(round_id, participant_id)
);
create index race_results_owner_time on public.race_results(account_id, created_at desc, round_id);

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.practice_results enable row level security;
alter table public.practice_result_details enable row level security;
alter table public.race_rounds enable row level security;
alter table public.race_results enable row level security;

-- All writes pass through server validation. Users may read only their records.
revoke all on public.profiles, public.user_preferences, public.practice_results,
  public.practice_result_details, public.race_rounds, public.race_results from anon, authenticated;
grant select on public.profiles, public.user_preferences, public.practice_results,
  public.practice_result_details, public.race_rounds, public.race_results to authenticated;
grant all on public.profiles, public.user_preferences, public.practice_results,
  public.practice_result_details, public.race_rounds, public.race_results to service_role;

create policy profiles_owner on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy preferences_owner on public.user_preferences for select to authenticated using (user_id = (select auth.uid()));
create policy practice_owner on public.practice_results for select to authenticated using (user_id = (select auth.uid()));
create policy practice_details_owner on public.practice_result_details for select to authenticated using (
  exists (select 1 from public.practice_results r where r.id = result_id and r.user_id = (select auth.uid()))
);
create policy race_result_owner on public.race_results for select to authenticated using (account_id = (select auth.uid()));
create policy race_round_participant on public.race_rounds for select to authenticated using (
  exists (select 1 from public.race_results r where r.round_id = id and r.account_id = (select auth.uid()))
);

create function public.create_account_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 50));
  return new;
end;
$$;
revoke all on function public.create_account_profile() from public, anon, authenticated;
create trigger create_account_profile after insert on auth.users
for each row execute function public.create_account_profile();
insert into public.profiles(id, display_name)
select id, left(coalesce(raw_user_meta_data ->> 'display_name', ''), 50) from auth.users
on conflict (id) do nothing;

create function public.save_account_preferences(p_user_id uuid, p_data jsonb, p_revision integer)
returns integer language plpgsql set search_path = '' as $$
declare current_revision integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  select revision into current_revision from public.user_preferences where user_id = p_user_id;
  if coalesce(current_revision, 0) <> p_revision then
    raise exception 'Preferences changed on another device' using errcode = '40001';
  end if;
  insert into public.user_preferences(user_id, data, revision) values (p_user_id, p_data, 1)
  on conflict (user_id) do update set data = excluded.data,
    revision = public.user_preferences.revision + 1, updated_at = now()
  returning revision into current_revision;
  return current_revision;
end;
$$;

create function public.save_practice_result(p_user_id uuid, p_result jsonb)
returns uuid language plpgsql set search_path = '' as $$
declare result_id uuid := (p_result ->> 'id')::uuid;
declare s jsonb := p_result -> 'stats';
declare inserted_id uuid;
begin
  insert into public.practice_results(id, user_id, mode, language, settings, correct, incorrect, extra,
    elapsed_seconds, wpm, raw, accuracy, deviation)
  values (result_id, p_user_id, p_result ->> 'mode', p_result ->> 'language', p_result -> 'settings',
    (s ->> 'correct')::integer, (s ->> 'incorrect')::integer, (s ->> 'extra')::integer,
    (s ->> 'elapsedSeconds')::float8, (s ->> 'wpm')::float8, (s ->> 'raw')::float8,
    (s ->> 'accuracy')::float8, (s ->> 'deviation')::float8)
  on conflict (id) do nothing returning id into inserted_id;
  if inserted_id is null then
    if not exists (select 1 from public.practice_results where id = result_id and user_id = p_user_id) then
      raise exception 'Result identity conflict' using errcode = '23505';
    end if;
    return result_id;
  end if;
  insert into public.practice_result_details(result_id, samples, history)
  values (result_id, s -> 'samples', s -> 'history');
  return result_id;
end;
$$;

create function public.save_race_round(p_round jsonb)
returns uuid language plpgsql set search_path = '' as $$
declare round_id uuid := (p_round ->> 'id')::uuid;
declare inserted_id uuid;
declare r jsonb;
begin
  insert into public.race_rounds(id, room_id, settings, started_at, ended_at, outcome)
  values (round_id, p_round ->> 'roomId', p_round -> 'settings',
    (p_round ->> 'startedAt')::timestamptz, (p_round ->> 'endedAt')::timestamptz, p_round ->> 'outcome')
  on conflict (id) do nothing returning id into inserted_id;
  if inserted_id is null then return round_id; end if;
  for r in select value from jsonb_array_elements(p_round -> 'results') loop
    insert into public.race_results(round_id, participant_id, account_id, racer_id, username,
      wpm, accuracy, typed_chars, finish_seconds, reason, speed_history)
    values (round_id, (r ->> 'participantId')::uuid, (r ->> 'accountId')::uuid, r ->> 'userId', r ->> 'username',
      (r ->> 'wpm')::float8, (r ->> 'accuracy')::float8, (r ->> 'typedChars')::integer,
      (r ->> 'finishSeconds')::float8, r ->> 'reason', r -> 'speedHistory');
  end loop;
  return round_id;
end;
$$;

revoke all on function public.save_account_preferences(uuid, jsonb, integer),
  public.save_practice_result(uuid, jsonb), public.save_race_round(jsonb) from public, anon, authenticated;
grant execute on function public.save_account_preferences(uuid, jsonb, integer),
  public.save_practice_result(uuid, jsonb), public.save_race_round(jsonb) to service_role;
