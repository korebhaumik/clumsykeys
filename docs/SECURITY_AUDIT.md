# Security audit — 13 November 2026

## Direct answer

**No: the audited frontend is not calling Supabase with a secret/service-role key.**

- `src/lib/services/supabase.ts:5-10` initializes the browser client from
  `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, using PKCE. The local
  `.env:2` value was classified as a publishable key without displaying it.
- The only real secret-key match in the initial working-tree scan was the
  ignored `.env:4`, assigned to the unprefixed `SUPABASE_SECRET_KEY`.
  `backend/src/config.ts:11-20` reads it only for the server adapter initialized
  at `backend/src/persistence.ts:26-30`.
- The existing browser asset `dist/assets/index-miMV4Ajr.js:13` contained a
  publishable key. Both newly generated frontend and server outputs also passed
  the credential scan. Production source maps are explicitly disabled in
  `vite.config.ts`.
- The initial nine reachable commits / 334 unique historical blobs contained no
  detected real credentials or committed `.env` files. The final automated scan
  additionally covers all reachable refs and local reflogs, commit/tag text,
  current files and build artifacts. This cannot inspect deleted remote refs,
  other clones, deployed historical assets or external CI logs.
- `.gitignore:27-28` ignores `.env*` while preserving `.env.example`;
  `.dockerignore` excludes environment files. `.env.example` is sanitized.

**No mandatory key rotation was identified from this audit.** If the server key
has been shared elsewhere, included in a previous deployment or logged outside
this checkout, rotate/revoke it manually and replace the backend runtime value.
A publishable key in a browser bundle is expected; access depends on grants,
RLS and authenticated identity. See [Supabase API key guidance](https://supabase.com/docs/guides/getting-started/api-keys).

## Scope and method

Reviewed the Svelte/Vite client, all Express routes and Socket.IO handlers,
account/session/preferences/result flows, SQL migrations and tests, database
functions, configuration, migration scripts, CI, Docker build and dependency
lockfile. Read `AGENTS.md`, `DESIGN.md` and `ARCHITECTURE.md` before editing.
No dependencies were added, no hosted application data was changed and no
database migration or deployment was applied.

At the user's request, the pre-existing working tree was committed separately
as `f3b0865` before creating `codex/security-audit`.

Supabase client inventory:

| Location | Credential and use |
| --- | --- |
| `src/lib/services/supabase.ts:8` | Browser publishable/legacy anon key; Auth only in the production frontend. Writes go to Express. |
| `backend/src/persistence.ts:27` | Backend secret key; Auth token verification, owner-filtered reads and restricted RPCs. |
| `tests/integration/hosted-supabase.ts:17,23` | Explicit opt-in admin secret client and two public clients; never imported by the app. This hosted write smoke test was not run in this audit. |
| `tests/integration/local-supabase.ts:12-13` | Local CLI public/admin credentials; local tests only. |
| `tests/unit/persistence.test.ts`, `tests/simulation/accounts.ts` | Real server adapter against a loopback fixture with deliberately fake test keys. |

No edge functions, other Supabase clients or frontend imports of server runtime
modules were found. Frontend imports of backend contracts/types remain
browser-safe. `scripts/database.mjs` invokes the CLI with separate management
credentials and redacts configured secrets from its captured output.

## Findings by severity

### Critical

None identified in the audited scope. In particular, no observed browser or
committed service-role credential exposure.

### High

| ID / status | Location | Description and exploit scenario | Applied fix / remaining action |
| --- | --- | --- | --- |
| H1 — Partially mitigated; open | `backend/src/persistence.contract.ts:90-125`; `backend/src/account.http.ts:36-39`; `backend/src/room.services.ts:276-326`; `supabase/migrations/20261113000300_solo_leaderboards.sql:5-25` | Authenticated users can fabricate counters/duration and submit a plausible result without completing a server-issued test. Recomputing WPM/accuracy prevents trusting the submitted summary fields, but does not authenticate their input counters. Multiplayer WPM/accuracy/progress are also client reports. Saved solo summaries feed public rankings, so fabricated scores can influence them. | Preserved the four-character formula; added a generous 1,500 raw WPM ceiling for solo results and WPM ceiling for race reports. Stripped extra detail fields, bounded race progress to passage length, required full reported passage progress before passage completion, and made timed completion server-only. **Plausible cheating remains possible.** A challenge/replay protocol, leaderboard eligibility/versioning, and treatment of existing scores need a product/schema decision. Do not treat these results as verified competitive scores. |
| H2 — Fixed locally; edge follow-up | `backend/src/security.ts:3-21,37-44`; `backend/src/server.ts:24-35`; `backend/src/socket.ts:20-25`; `backend/src/room.services.ts:137-139,192-204` | Previously, repeated account writes/verification calls and socket broadcasts had no application quotas. Creating and disconnecting guest rooms retained empty map entries. An attacker could consume database/network capacity and grow server memory. | Added bounded fixed-window registries: HTTP API/room requests 240/minute per transport IP; account writes 30/minute per verified account; socket handshakes 60/minute per transport IP; events 60/second per socket. Configured connection/room/roster caps and 16 KiB inbound socket packets; delete empty rooms and clear their timers. 429 responses include Retry-After. Limits are process-local; NAT/proxy clients share transport-IP quotas. Review topology and edge limits before deployment. |

### Medium

| ID / status | Location | Description and exploit scenario | Applied fix / remaining action |
| --- | --- | --- | --- |
| M1 — Preventive fix | `src/lib/services/supabase.ts:5-8`; `src/lib/services/public-config.ts:1-20`; `vite.config.ts:7-19` | Although the actual browser key was public, the previous client accepted any value under its public variable name. An operator accidentally copying a secret there could ship it in JavaScript. | Vite now rejects privileged/credential-named exposed variables, secret-key strings and non-anon JWT keys before building. The browser separately refuses non-public Supabase keys and insecure non-loopback Supabase URLs. Errors identify variable names, never key values. This classifies keys; Supabase still authenticates them. |
| M2 — Fixed | `backend/src/server.ts:15-39` | CORS alone did not prevent a hostile website from opening a WebSocket to the guest service and driving room events. WebSockets are not subject to browser CORS enforcement. | Added `allowRequest` Origin validation for the handshake. Production uses explicitly configured frontend origins rather than automatically allowing development origins. Origin-less native clients remain permitted, with existing racer/account ownership checks. This is not an authorization boundary for non-browser attackers. See [Socket.IO guidance](https://socket.io/docs/v4/handling-cors/). |
| M3 — API fixed; document host open | `backend/src/security.ts:24-34`; `backend/src/server.ts:21-25,47-50`; `index.html:4` | The API previously lacked explicit framing/MIME/CSP/referrer protections and exposed Express's identifying header. The frontend document has an inline theme bootstrap but no enforced document CSP in this repository. A future script injection could read browser sessions. | Added API-only CSP, DENY framing, nosniff, no-referrer, Permissions-Policy and no-store; removed X-Powered-By and default reflected 404 output. JSON parsing is limited to rate-limited API paths. Added frontend no-referrer metadata. Configure actual frontend response headers, a tested document CSP and HSTS at the HTTPS host; API headers cannot protect a separately hosted document. |
| M4 — Open, development dependency | `pnpm-lock.yaml:1858`; ESLint/typescript-eslint dependency paths | `pnpm audit` reports `minimatch` 10.2.6 glob amplification DoS, [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249). Malicious glob/config input reaching development tools can exhaust resources; this is not a production dependency. | The registry reports a fix in >=11.0.1. Upgrade parent tooling when compatible, or evaluate a targeted override with compatibility tests. No forced transitive major override was applied because it can break consumers' supported API ranges. CI reports advisories and gates high/critical severity. |

### Low

| ID / status | Location | Description and exploit scenario | Applied fix / remaining action |
| --- | --- | --- | --- |
| L1 — Open, development dependency | `pnpm-lock.yaml:1408`; `@sveltejs/vite-plugin-svelte > deepmerge` | `deepmerge` 4.3.1 prototype poisoning of returned objects, [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4). It would require attacker-controlled merge input reaching build tooling; no application request path to it was found. | The audit registry reports no published patched version. Track the upstream plugin/dependency fix and keep untrusted configuration out of trusted builds. Replacing the merge implementation is not a safe small application fix. |
| L2 — Actions fixed; image follow-up | `.github/workflows/docker-publish.yml:24`; `.github/workflows/deploy-northflank.yml:35,61`; `backend/Dockerfile:1,18` | Mutable Action tags can change the code executed in credential-bearing jobs. Base image tags also move over time. | Pinned every Action reference to the exact commit returned by its upstream GitHub tag API, preserving the existing major versions; disabled checkout credential persistence where used. Existing job permissions were already narrow and deployment remains disabled. Consider digest pinning plus an update bot for base images and Action SHAs. |
| L3 — Fixed | `backend/src/room.services.ts:249-288`; `backend/src/socket.ts:31-40` | Room notifications previously interpolated usernames/room IDs into console logs, allowing control-character/log injection and unnecessary storage of names in backend logs. | Removed those console writes and reject control characters and oversized resume tokens at entry. User-facing notifications remain escaped text. Persistence failure logs contain round IDs/attempt counts rather than tokens or database error bodies. |
| L4 — Existing browser-storage risk | `src/lib/services/supabase.ts:9`; `src/lib/features/practice/result-persistence.ts:7-23`; `src/lib/features/multiplayer/Multiplayer.svelte:117-120` | Supabase SPA sessions, failed result details and resume tokens persist in browser storage. An XSS or malicious same-origin script could read them; shared-device users may also retain unsaved history. No exploitable HTML/script sink was found in the reviewed application. | Retained storage keys and session behavior to preserve login, offline retry and reconnect semantics. Enforce frontend CSP and minimize third-party scripts. Moving sessions to HttpOnly cookies requires a backend-for-frontend/session and CSRF design rather than a local storage toggle. |

## Live RLS, functions and storage verification

Executed `scripts/security-database.sql` against the configured hosted project
through `supabase db query --read-only`. Only catalog and bucket-configuration
metadata was queried; no application rows or user identities were read.

- All six public application tables have RLS enabled: profiles,
  user_preferences, practice_results, practice_result_details, race_rounds and
  race_results. No additional tables appeared in public/graphql_public.
- Anonymous roles have no SELECT grants on these six tables. Authenticated
  roles have no INSERT/UPDATE/DELETE grants. Their six SELECT policies derive
  identity from `auth.uid()`, including parent ownership/round participation
  checks. None uses unconditional `USING (true)`.
- These are SELECT-only policies: `WITH CHECK` is correctly absent, since no
  browser write policy exists. Owners are derived from verified tokens in
  Express rather than trusted from client IDs (`backend/src/account.http.ts:16-21`).
- All seven public application functions deny EXECUTE to both anon and
  authenticated. Both SECURITY DEFINER trigger functions lock search_path to
  empty. Every other application function also locks search_path. Public
  leaderboard projection is reached through the service-only backend RPC and
  omits email, account UUIDs, preferences and keystroke history.
- All ten inspected storage tables have RLS enabled. Some have the standard
  platform grants, but there are **no buckets and no custom storage policies**,
  so no exposed application upload/download surface was identified.
- No RLS migration is required for the observed schema. Recheck the actual
  deployed Data API schema exposure list and repeat this metadata audit after
  adding tables, views, functions or buckets. The query targets the repository's
  public/graphql_public schemas plus storage; it does not prove dashboard schema
  exposure settings or future objects are safe.

Reference: `supabase/migrations/20261112000100_accounts_and_results.sql:73-172`,
`20261112000200_anonymize_deleted_accounts.sql:1-9`, and
`20261113000300_solo_leaderboards.sql:1-47`.

## Other reviewed controls

- Express verifies bearer tokens through Supabase Auth before accessing private
  data; record/round ownership checks are independent of browser IDs. Cross-user
  read and write tests pass. Socket sessions are bound to their socket and
  verified account, with separate resume tokens and expiry disconnection.
- Auth uses PKCE, cleans callback query parameters and does not transmit account
  tokens in application URLs. Account writes use explicit Authorization headers,
  not ambient cookie authentication; no current cookie-based CSRF path was
  identified. Supabase Auth rate limiting is managed upstream and needs its own
  deployment review.
- Inputs have explicit shape/range/length checks and field allowlists. Queries
  use Supabase structured filters/RPC parameters; SQL has no dynamic EXECUTE
  construction. Website links restrict protocols and reject URL credentials.
- No application `{@html}`, innerHTML, eval, dynamic script execution, arbitrary
  URL fetch, upload, filesystem path or shell-execution input path was found.
  Code examples containing programming constructs are rendered as text. Script
  CLI arguments are passed as arrays and the project reference is validated.
- Reviewed error responses do not return stack traces or raw Supabase errors.
  Development fixture credentials/control endpoints are test-only and not
  copied by the backend Dockerfile. Database types contain no credentials.
- Lockfile integrity hashes and frozen installs are present; no remote Git or
  arbitrary tarball dependency source was found. pnpm permits build scripts for
  esbuild only. No suspicious first-party install lifecycle scripts were found.
- The existing lint exception for explicit `any` remains. Socket.IO and generated
  JSON/type casts were reviewed with their validation/ownership boundaries; no
  additional auth bypass was demonstrated. No uncertain dead code was deleted.

## Verification and limitations

| Check | Result |
| --- | --- |
| Frozen dependency install | Passed using pnpm 12.18.0's JavaScript entry point. The host's pnpm launcher fails with ENOEXEC; no host configuration was modified. |
| `npm run lint` | Passed; design audit passed. |
| `npm run audit:dead` | Passed with existing configuration hints only. |
| `npm run check:all` | Passed; Svelte reported zero errors/warnings and backend TypeScript passed. |
| `npm test` | 34 passed, including real ephemeral HTTP/Socket.IO, owner isolation, quotas, invalid build configuration, progress/deadline checks, archives and retry behavior. |
| `npm run test:e2e` | Final full suite: 82 passed. Covers both themes, narrow/desktop layouts, keyboard interaction, escaped metadata, public-only Auth keys and browser-error assertions. |
| `npm run build`, `npm run build:server` | Passed. Vite notes an extensionless configuration import compatibility warning for a future loader; no build error. |
| Credential scan | Versioned/non-ignored files, reachable history/reflogs and generated frontend/server assets passed; matches are reported by category/location only. This heuristic scanner is not proof against arbitrary encoded secrets. |
| `pnpm audit` | Two advisories: 0 critical, 0 high, 1 moderate, 1 low; both development-only. |
| `pnpm audit --prod` | Zero advisories across 134 production/optional dependency records. |
| `pnpm outdated --format=json` | Newer direct dev versions reported: @tsconfig/svelte 5.0.9, typescript-eslint 8.72.2, Vite 8.3.8, knip 6.45.1, TypeScript 7.0.2. No unrelated version migration was made. |
| Postman local simulation | Passed with the real SDK/backend; log confirmed Auth lookups, RPC outage, successful idempotent retries, private dashboard/history and public ranking requests. Establishes modeled HTTP behavior, not hosted provider behavior. |
| Hosted catalog audit | Passed read-only RLS/grant/function/bucket review described above. |
| Local SQL/pgTAP tests | Attempted, unavailable: Docker daemon/local PostgreSQL were stopped; connection refused at local port 54322. No prior SQL-test result is claimed as a result of this audit. |
| Deployment/CI | Not deployed, pushed or run on GitHub. Hosting headers, external logs, production auth/provider configuration, email delivery and traffic-dependent thresholds remain unverified. |

`npm run dev` and `npm run dev:server` were exercised by Playwright's real local
servers. No generated assets, test output, captured catalog output or credentials
are included in the commit. Passing checks establish the exercised paths only.

## Manual action checklist

- [ ] **Score trust (H1):** decide whether public boards accept self-reported
  results. For verified boards, design server-issued expiring challenges,
  replay/timing validation, eligibility metadata and migration/quarantine rules
  for existing scores. Plausibility checks alone do not stop automation.
- [ ] **Deployment variables:** retain only public Supabase configuration in the
  frontend build, and put the secret only in backend runtime configuration. Set
  `NODE_ENV=production`, exact HTTPS `FRONTEND_ORIGINS`, and an HTTPS backend URL.
  Never grant service privileges to the browser to bypass a policy failure.
- [ ] **Proxy/rate rollout:** review shared-IP quotas before rollout; deploy
  per-client edge abuse controls and an explicit trusted-proxy integration where
  needed. Add shared quotas/coordination before multiple backend replicas.
- [ ] **Frontend/TLS host (M3):** apply document security headers, test and enforce
  CSP with the inline theme bootstrap and Svelte styles, and configure suitable
  HSTS at the HTTPS endpoint. Confirm headers on actual deployed responses.
- [ ] **Supabase dashboard:** verify actual exposed schemas, exact production
  redirect allowlist/Site URL, email confirmation, password-change safeguards,
  leaked-password protection where available, Auth quotas and CAPTCHA if needed.
  Local development config is not evidence of hosted settings. Re-run Security
  Advisor and the read-only catalog query after schema changes.
- [ ] **Dependencies:** resolve M4 through a compatible upstream update or a
  tested override; track L1 until a published fix exists. Review the listed
  outdated dev packages separately, especially the TypeScript major upgrade.
- [ ] **Local database verification:** start Docker/Supabase, then run
  `npm run test:db` and `npm run test:integration`. No live RLS edit is presently
  indicated; future policy migrations require explicit review and isolation tests.
- [ ] **Rotation if external exposure is discovered:** revoke/replace any leaked
  secret in Supabase, update backend secrets, restart/redeploy, invalidate affected
  artifacts/caches and review logs. Rotation is a manual operator action; no key
  was rotated and the checkout supplies no evidence requiring one.
- [ ] **Repository controls:** enable required Security checks and platform secret
  scanning/push protection; use Dependabot/Renovate for package, Action SHA and
  image digest updates. Pin/review production image digests with an update process.
- [ ] **Monitoring:** alert on 401/429 spikes, socket disconnect floods, persistence
  failures and anomalous score distributions. Redact Authorization/apikey,
  callback query parameters, session/resume tokens and request bodies at every
  proxy/logging layer; restrict log access and retention. Avoid logging real typing
  histories by default.
