alter table public.race_results
  drop constraint race_results_reason_check,
  add constraint race_results_reason_check
    check (reason in ('completed', 'time-limit', 'error-limit', 'disconnected'));
