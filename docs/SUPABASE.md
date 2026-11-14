# Supabase setup

Last reviewed against the repository: **14 November 2026**. This is the maintained
setup guide; source and local fixture tests do not establish the current state
of a hosted Supabase project. See [the security audit](SECURITY_AUDIT.md) for the
latest verification and limits, and [deployment](DEPLOYMENT.md) for hosting.

Accounts are optional. Guest practice and the existing `#/login` room join flow
remain available. `#/account` handles account access; `#/history` shows private
practice and race history. `#/leaderboard` shows the public solo leaderboard;
`#/ranking` shows the latest multiplayer race results, including a saved latest
race after refresh for signed-in users. Authentication is optional for public
solo rankings; a verified account adds the viewer’s own standing.

## Configure the project

1. Install dependencies with the pinned pnpm version, copy root `.env.example`
   to `.env`, and populate its four Supabase runtime values. Both URLs refer to
   the same Supabase project. The browser gets a publishable key; only the backend
   receives the secret key. The backend loads root `.env` during startup without
   overriding inherited deployment variables.
2. Authenticate the local CLI with `./node_modules/.bin/supabase login`, or put a
   management personal access token in `SUPABASE_ACCESS_TOKEN` in `.env`. The
   script derives the project reference from a standard `*.supabase.co` URL;
   set `SUPABASE_PROJECT_REF` only if that is insufficient. The CLI can create a
   temporary database login role, so `SUPABASE_DB_PASSWORD` is an optional fallback.
   Application publishable/secret keys do not authenticate migration commands.
3. Review and apply the migration files:

   ```sh
   npm run db:plan
   npm run db:push
   npm run db:types
   ```

   These commands target the hosted project explicitly using CLI v3 `--remote`.
   They skip vault configuration changes. A scoped token needs the permissions
   reported by `supabase db push --help` for the selected target, including
   database writes and project/pooler discovery. Type generation also needs
   database reads. No application migration runs automatically on server startup.
   Inspect an existing hosted schema before applying migrations; reconcile any
   migration history mismatch rather than resetting the hosted database.
   A 403 while creating the temporary login role means the saved CLI identity
   lacks access to that operation. Sign in with the correct project account or
   grant the scoped token the required project/database permissions before
   retrying. A runtime secret key cannot resolve that management permission.
4. In Supabase Auth, enable email/password sign-in. Set the Site URL to your
   frontend origin. Allow the confirmation and recovery callback URLs generated
   by the app, for example `http://localhost:5173/?auth_action=confirm` and
   `http://localhost:5173/?auth_action=recovery`, plus their production equivalents.
   A local-only wildcard such as `http://localhost:5173/**` is convenient during
   development; production should use the actual callback URLs. Configure email
   confirmation, recovery templates, and email delivery in Supabase. PKCE links
   must open in the browser that initiated registration/recovery.
5. Start `npm run dev:server` and `npm run dev`. Create an account, confirm the
   email if enabled, sign in, finish a test, and open `#/history`. Verify a second
   device can read the saved result and preferences. `GET /health` checks the
   gameplay process; `GET /api/status` reports whether account dependencies are
   configured, not whether the database schema is healthy.

Leaving both backend Supabase variables and both frontend Supabase variables
unset provides guest-only operation. A partially configured backend fails with
an actionable startup error. Keep all `.env` files out of source control.

## Migration inventory

Apply all five versioned migrations in order; do not stop after the original
account tables. `npm run db:plan` shows pending changes without applying them.
`npm run db:push` applies changes to the configured hosted project and is an
operator action, not an application startup task.

| Migration | Purpose |
| --- | --- |
| `20261112000100_accounts_and_results.sql` | Profiles, preferences, practice/race tables, RLS, restricted write RPCs, signup profile trigger. |
| `20261112000200_anonymize_deleted_accounts.sql` | Anonymize retained race entries when an account is deleted. |
| `20261113000100_account_dashboard.sql` | Service-only lifetime solo dashboard aggregation. |
| `20261113000200_dashboard_characters.sql` | Extend dashboard aggregation with total typed characters. |
| `20261113000300_solo_leaderboards.sql` | Service-only public solo score projection and ranking index. |

The SQL source defines owner-only reads, no anonymous table access, and
backend-only application writes. Verify migration history and grants in each
deployed environment; this guide does not claim a new hosted database audit.

## GitHub sign-in

The account page supports **Continue with GitHub** for both sign-in and account
creation, using Supabase's PKCE flow and the existing app callback. Enable it
when you are ready:

1. Create a GitHub OAuth App in GitHub's developer settings. Set its homepage to
   your frontend URL. Set its authorization callback to the URL shown in Supabase
   Auth's GitHub provider settings, normally
   `https://<project-ref>.supabase.co/auth/v1/callback`.
2. In Supabase **Authentication → Sign In / Providers → GitHub**, enter the GitHub
   client ID and client secret and enable the provider. These credentials stay in
   Supabase; no additional application `.env` variables are needed.
3. Keep the frontend return URL on Supabase's redirect allowlist. The app reuses
   `/?auth_action=confirm` for this sign-in callback; the local URLs are already
   configured. Add the production equivalent when deploying.

When a local frontend uses the hosted Supabase project, GitHub's callback still
points to hosted Supabase, which then redirects to the frontend. The direct
GitHub callback for a fully local Supabase stack is instead
`http://localhost:54321/auth/v1/callback`; that is a separate provider setup.
The button requires the provider to be enabled before a real GitHub login can
complete. Automated tests model the redirect, PKCE exchange, and cancelled-flow
fallback without authenticating to a real GitHub account.

See [Supabase's GitHub setup guide](https://supabase.com/docs/guides/auth/social-sign-in/auth-github).

## Data and access

- `profiles` is populated by an Auth signup trigger. `user_preferences` stores
  theme and prose/code settings with a revision to detect conflicting writes.
- `practice_results` stores validated summary metrics and a settings snapshot;
  `practice_result_details` stores chart samples and word metrics. The existing
  four-character WPM formula is retained. An immutable result UUID makes retries
  safe, including after a response is lost.
- `race_rounds` and `race_results` store the original roster, bounded samples,
  server finish times, guest participants, disconnects, and aborted rounds. The
  server captures results before replay or disconnect cleanup can erase them.
  Restricted RPC functions write parent/child rows atomically.
- Every application table has RLS and explicit grants. Browser users can read
  only their own records; write RPC functions are callable only by the server
  role. The backend verifies access tokens and checks ownership independently.
  A participant's round scoreboard excludes opponent account UUIDs. Guest room
  IDs and old browser racer IDs do not authorize private account access.
- `read_solo_leaderboard` exposes one best saved solo result per player after
  filtering by mode, language, format, length and rolling range. Ten rows are
  returned per page; a verified viewer’s standing can be outside that page.
  The public projection contains display names and a pseudonymous player key,
  not account UUIDs, emails, preferences or per-word typing history.
- Deleting an Auth user cascades private profile/preferences/practice data and
  anonymizes retained shared race entries. Account deletion is an administrative
  Supabase operation; the app does not add a deletion UI.

The [application API contract](api.openapi.json) describes all eleven HTTP
operations: health, live-room roster, account status, account/preferences,
dashboard, solo result writes/details, private practice/race history, saved race
scoreboards, and public solo rankings. Its `x-socketio` extension documents all
application event payloads, handshake authentication, limits, countdown and
recovery behavior; Socket.IO is not a raw WebSocket or REST API.
The browser-safe `backend/src/persistence.contract.ts` is the settings-validation
source of truth; `backend/src/database.types.ts` is generated from the SQL schema.

## Synchronization and failures

Remote preferences win when an account has saved settings. A new account starts
with the current local settings. Hydration waits until the next practice session
instead of replacing an active passage or results screen. Autosaves are debounced;
a revision conflict stops overwriting and offers a reload through the account
page. Sign-out/account switching restores guest preferences and leaves the old
room session. The existing local storage keys remain in use. Prose preferences optionally
include `quoteLength` (`short`, `medium`, or `long`); legacy settings remain
accepted and quote selection defaults to medium. Short quotes have at most 100
characters, medium quotes 101–300, and long quotes more than 300; text is never
truncated to fit a length. The code snippet-length selector is currently a
session-only UI choice and is not persisted in account preferences or saved
result settings. Solo ranking filters currently group all quote lengths and all
snippet lengths together.

Signed-in solo results save in the background. Up to twenty pending results
(approximately 2 MB of serialized data) may be retained in browser storage and
retried on account restoration, connection recovery, or an explicit retry. Each
entry stays bound to its original account. Guests' earlier activity is never
silently imported. Browser storage failure or clearing site data can lose unsaved
results; the UI does not claim a save before the server confirms it.

Race persistence retries up to five times in a bounded process-local queue;
failed/pending state is shown on signed-in race results. Process loss can discard
pending writes, active rooms, timers, and reconnect sessions. Confirmed database
records survive restarts. Keep one backend replica: Supabase persistence does not
provide distributed Socket.IO coordination or restart recovery for active races.
Client-reported practice/progress metrics are not cheat-resistant global scores.

## Verification

The normal repository suite includes account HTTP/Socket.IO tests and Playwright
flows. It starts the deterministic local HTTP fixture in `postman/mocks/supabase`
on port 15443 and never consumes hosted Supabase credentials. Chrome still uses
frontend/backend ports 4193 and 15442. Fixture success verifies the caller against
that modeled contract, not Supabase itself.

For a real local Supabase check (Docker required):

```sh
npm run db:start
npm run test:db
npm run test:integration
```

The SQL tests cover RLS isolation, denied anonymous/browser writes, optimistic
revisions, atomic rollback, retry IDs, guest race rows, and account deletion. The
real Auth/Data API smoke check creates disposable local users, verifies JWTs and
actual reads/writes, and deletes those users afterward. It never reads hosted
credentials from `.env`.

`npm run test:hosted` is an explicit hosted smoke check. It creates two disposable,
pre-confirmed users without sending email, checks the real Express/Data API paths
and cross-account access, then removes only those users and their private data.
It is deliberately separate from the normal test suite. Successful local and
hosted checks do not verify delivery of confirmation/recovery email through your
project's mail configuration.

For controlled HTTP dependency failures, run the same fixture as a Postman
simulation, then exercise the real Express adapter:

```sh
postman simulation run postman/simulations/accounts.sim.yaml --port 15443 --no-history
# In another terminal:
npm run test:simulation
```

The simulation context records the limits of this evidence. No Postman cloud
workspace, publishing, or external API credentials are needed for local runs.

## References

- [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [CLI local and hosted targets](https://supabase.com/docs/guides/local-development/local-and-hosted-projects)
- [Versioned migrations](https://supabase.com/docs/guides/deployment/database-migrations)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)

## Account dashboard

The signed-in profile reads `GET /api/account/dashboard`. Apply migration
`20261113000100_account_dashboard.sql` before deploying the updated backend.
The service-only SQL function aggregates all saved solo tests, returns the highest
WPM result for each practice mode and the five latest summaries in one snapshot.
Average WPM, raw WPM and accuracy are arithmetic per-test means. Guest, unsaved,
abandoned and multiplayer activity is excluded. Different test settings can
produce different bests; each card shows its language and test type.
The page supports loading, empty, failed and refresh states without replacing a
failed request with fabricated statistics. Name, join date and optional bio/website
come from the authenticated profile metadata; no profile editor is added here.

Dashboard statistics also include all typed characters (correct + incorrect + extra)
and average test duration (total saved typing seconds / completed tests). Migration
`20261113000200_dashboard_characters.sql` adds the character total; duration uses
the existing totals and displays seconds to one decimal place.

## Maintenance

Update this guide together with account flows, preference/result contracts,
SQL migrations, SDK adapters and public leaderboard behavior. Keep the migration
inventory and [API spec](api.openapi.json) aligned with the handlers and
browser-safe contracts. Record local fixture, real local database and hosted
checks separately; do not promote a fixture or an earlier hosted result into a
fresh provider/schema verification claim. Recheck real email delivery and OAuth
consent when changing production callback/provider settings.
