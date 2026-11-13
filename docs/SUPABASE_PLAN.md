# Supabase integration plan

Status: implemented in the working tree; both migrations are applied to the
configured hosted project and verified with real JWTs and disposable users.
See [current setup and limitations](SUPABASE.md). The sections below retain the
original analysis and implementation sequence as a design record.

## Application before integration

| Area | Current behavior | Integration point |
| --- | --- | --- |
| Identity | `src/pages/Login.svelte` joins a room using a browser-generated UUID and display name; it does not authenticate | Add account flows separately; preserve `#/login` and guest joining |
| Practice | Prose and code components call `createPracticeSession().finish()`; results disappear when their component is destroyed | Capture one immutable result and the settings used at completion |
| Preferences | Theme uses local storage; code preferences use session storage; prose settings are an in-memory store | Add account synchronization around existing stores and preserve existing keys |
| Multiplayer | `backend/src/store.ts` holds rooms; `room.services.ts` holds tokens, timers, finish times, and sampled histories in Maps/WeakMaps | Persist round summaries outside the live event path |
| Rankings | `finalRanking` is an in-memory browser store; `#/leaderboard` displays the latest race rather than a global leaderboard | Hydrate completed results from the database; add private account history |
| Server | Express exposes `/health` and `/rooms`; Socket.IO handles gameplay | Compose authentication and persistence through `server.ts`, `http.ts`, and `socket.ts` |
| Environment | Vite reads root `.env`; backend scripts currently use only inherited process environment | Load root `.env` at process startup and retain deployment environment precedence |
| Deployment | Separate frontend and backend; backend Docker image runs one replica | Frontend receives public build variables; backend receives runtime secrets |

There is no existing database or historical result archive to migrate. Old solo
results and completed races cannot be reconstructed after their state is lost.

## Environment setup

Copy `.env.example` to root `.env` and populate:

| Variable | Value | Consumer |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Project URL, usually `https://<project-ref>.supabase.co` | Frontend |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable key, `sb_publishable_...` | Frontend |
| `SUPABASE_URL` | Same project URL | Express backend |
| `SUPABASE_SECRET_KEY` | Secret key, `sb_secret_...` | Express backend only |

The remaining active variables describe the existing local frontend/backend
connection. Change their origins for deployment. The template uses the current
publishable/secret key types; legacy key compatibility is not assumed.

Optional CLI configuration is commented out in the template. A personal access
token or saved CLI login supports migrations using a temporary database login
role; the database password is only an optional fallback. The project reference
can be derived from a standard project URL. These are not runtime inputs.
An API secret cannot substitute for CLI credentials. A direct Postgres
`DATABASE_URL`, JWT signing secret, and storage bucket are unnecessary for the
proposed runtime, which uses the Supabase Data API.

Supabase Auth dashboard setup is also required: enable email/password sign-in,
configure email confirmation and recovery templates, set the production Site URL,
and allow the exact local and production callback URLs. Email delivery settings
belong in Supabase. OAuth providers are outside the initial scope.

## Architecture and boundaries

- Supabase Postgres stores durable account data and completed results. Supabase
  Auth establishes account identity. Socket.IO continues to own live rooms,
  countdowns, progress broadcasts, reconnects, and race timing.
- Add a browser-only typed Supabase client under `src/lib/services/`, an auth
  feature under `src/lib/features/auth/`, and app-wide account state under
  `src/lib/state/`. Keep history behavior in a focused feature and compose it
  from page/router entries. Shared icons and charts remain presentational.
- Add backend configuration, Supabase client, repositories, and persistence
  services under `backend/src/`. Pass dependencies through
  `createApplication(...)` so tests can control failures without hosted secrets.
  Browser clients never import backend runtime modules or secret configuration.
- Keep versioned SQL and local configuration in `supabase/`; generate database
  types for each package from the same schema. Do not introduce an ORM or replace
  the existing pure browser-safe race-settings contract.
- Browser Auth and owner-scoped preferences/history use the publishable client
  with Row Level Security (RLS). New result writes go through Express validation;
  multiplayer results originate only in the server lifecycle. Secret-key paths
  must enforce authorization themselves because the key bypasses RLS.

## Proposed schema and access rules

| Table | Principal fields | Access |
| --- | --- | --- |
| `profiles` | `id` referencing `auth.users`, display name, timestamps | Owner reads/updates approved fields; no public email or auth data |
| `user_preferences` | `user_id`, versioned prose/code settings, theme, revision, timestamps | Owner reads/updates through RLS and validated shapes |
| `practice_results` | Result UUID, account UUID, mode/language, settings snapshot, elapsed time, correct/incorrect/extra counts, WPM/raw/accuracy/deviation, metric version, completion time | Owner reads; validated backend inserts; immutable results |
| `practice_result_details` | Result UUID, bounded speed/error samples and per-word metrics | Same owner as parent; loaded only when opening a result |
| `race_rounds` | Server round UUID, room label, settings snapshot, start/end times, completed/aborted outcome | Server writes; participants can read their round via constrained access |
| `race_results` | Round UUID, server participant UUID, nullable account UUID for guests, display-name snapshot, WPM/accuracy/typed characters, elapsed finish time, finish reason, bounded speed samples | Server writes; account owners read their entries; shared round response exposes only scoreboard fields |

Use foreign keys, finite/range checks, payload limits, timestamps, and indexes on
account plus completion time and round plus participant. A unique constraint on
practice result UUID and `(round_id, participant_id)` makes retries idempotent.
Store ordered chart/word arrays in JSONB with size validation; index searchable
summary columns. Do not create a row or database write for every keystroke.

Enable RLS and explicit grants in the migration, including detail tables. Reject
client changes to result ownership, round identity, and completion timestamps.
Public profile directories and global rankings are outside the initial release;
no broad anonymous read policy is needed. Account deletion should remove private
practice/preferences data and anonymize retained shared race entries.

## Implementation sequence

1. **Configuration and database foundation.** Add the supported Supabase JS SDK
   to the packages that use it, typed configuration, explicit root `.env` loading
   at backend startup, and actionable missing/partial configuration errors. Keep
   tests deterministic without real credentials. Add local Supabase config,
   migrations, generated types, RLS tests, and repository interfaces. Apply and
   verify migrations on a local or development database before hosted rollout.
   Document any existing hosted schema before applying additive migrations.

2. **Accounts with guest play.** Add registration, email/password sign-in,
   confirmation, recovery, sign-out, and session restoration. Keep `/login` as
   the room join route and add separate account routes. Use PKCE and process the
   callback query before mounting the hash router, so Auth callback parameters
   cannot conflict with `#/...` routes. Clean up auth subscriptions. Guest typing
   and room joining remain available without creating anonymous Auth users.

   Verify access tokens at the Express boundary using supported Supabase token
   verification; never trust a posted account UUID or decoded JWT alone. Pass an
   optional access token in Socket.IO handshake auth and bind a verified account
   to the server-owned racer session. Keep the existing racer ID and resume token
   contract separate from account identity. Refresh handshake credentials on
   reconnect and enforce an explicit expiry/re-authentication policy. Signing out
   or switching accounts leaves the authenticated room before a new join; it must
   never reassign an in-flight result. Invalid supplied credentials produce an
   auth error; an absent token permits a guest join.

3. **Account preferences.** Hydrate validated remote settings at startup or
   sign-in, then debounce saves outside typing. Apply incoming practice settings
   between sessions rather than regenerating an active passage. Use revisions
   to reject stale writes and prevent subscription echo loops. Remote settings
   win when an account already has preferences; otherwise offer the current
   local settings as initial values. Reset account-specific in-memory state on
   sign-out/account switch, retain current guest storage keys, and keep failures
   visible without interrupting practice.

4. **Solo result persistence.** Capture the result once in the prose/code
   completion handlers, with a stable UUID, account identity and settings frozen
   for that session. Keep `session.ts` pure. Validate input and recompute summary
   metrics from counts/time using the existing four-character WPM convention;
   preserve code/snippet and keyword distinctions. Save summary and details
   atomically using a restricted database function or equivalent transaction.
   Return saved/retryable status without delaying the results screen or replay.
   Bound any pending-save storage and bind each entry to its original account;
   never submit it under a different user's session. Guest solo results remain
   local. Do not silently upload earlier guest activity when someone signs in.

5. **Race persistence.** Copy the initial roster and immutable round metadata at
   start. Record completed racers, time-limit endings, disconnect expiry, and
   all-player abandonment before racers/WeakMap entries are removed. Freeze the
   final result snapshot synchronously before broadcasts can trigger
   `Ranking.svelte` to emit `resetGame`. Persist round plus participant results
   atomically, outside live broadcasts, with a server-created participant ID and
   retry-safe constraints. Cover finish, timer, leave, and reset paths through a
   shared finalization hook rather than saving from browser rankings.

   Track terminal outcomes separately from passage completion: time-limit
   endings must not fabricate `finishSeconds`; disconnected/aborted racers must
   not become winners. Keep existing Socket.IO event names and payload meanings.
   New private history endpoints require authentication and participant checks;
   room IDs and old browser UUIDs alone grant no access to private records.

6. **History and deployment.** Add paginated account history and result detail
   views. Hydrate the latest completed race for the existing results routes
   without changing `/leaderboard` into an unrelated global ranking. Use existing
   design tokens and chart components. Update README, architecture and deployment
   docs, Docker secret/environment handling, and CI checks. Apply migrations
   before deploying dependent backend code, then deploy the frontend. Verify both
   development and hosted environments with separate credentials.

## Failure handling and limits

- Database outages must not block guest typing or Socket.IO timing. Failed saves
  need bounded retries, structured logs without credentials, and visible pending
  or failed state. Do not report successful persistence before confirmation.
- An in-process retry queue can lose pending race results if the process dies.
  The first release must document that window; guaranteed delivery would require
  a durable outbox/queue. Completed, confirmed database records survive restarts.
- Active rooms and recovery sessions still disappear on backend restart. Keep a
  single backend replica. Database persistence alone does not provide distributed
  Socket.IO coordination or restoration of running timers.
- Solo metrics and incoming multiplayer progress are client-reported today.
  Validation and server-owned finish times do not establish cheat resistance.
  Do not present persisted scores as verified competitive/global rankings.
- Guest identities are browser-local and cannot securely provide cross-device
  ownership. Guest round entries can be archived by the server with no account
  owner, but guest personal history remains local and is not auto-claimed later.

## Verification and rollout criteria

Run the repository's full command suite: frozen install, frontend/backend dev
smoke checks, lint, dead-code audit, both type checks, unit/integration tests,
Playwright, and both production builds.

Add meaningful tests for migrations and cross-account RLS isolation; registration,
confirmation, recovery and session restoration; protected HTTP/socket identity;
preference validation/conflicts; idempotent writes and transaction rollback;
practice completion/retry/account switching; and race finish, time limits,
disconnect expiry, abandonment, replay/reset races and persistence failure.
Exercise migrations against a real local Supabase instance, not only repository
fakes. Browser flows should cover both themes, keyboard use, narrow screens,
guest play, account history after refresh, and no browser errors. Confirm that
the built frontend contains no backend secret and database failure leaves typing
and live race behavior usable.

## Sources

- [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Database migrations](https://supabase.com/docs/guides/deployment/database-migrations)
- [Token verification with getClaims](https://supabase.com/docs/reference/javascript/auth-getclaims)
