# Security audit

Full security review: **14 November 2026**, source baseline `22ab661` plus that
review’s working-tree changes. Focused history UI verification: **14 November
2026**, baseline `63c504d` plus the history redesign, chart colors, archived
race settings and simplified history toolbar/detail labels. The focused pass reran the
source/build/browser checks listed below; it did not repeat credential scans,
dependency auditing, SQL/Auth verification or hosted checks. This is a maintained
assessment of current controls and remaining work.

## Pre-push frontend review

On **15 November 2026**, reviewed the pending UI, navigation and policy pages.
Corrected unsupported claims about anti-cheat guarantees, guest multiplayer
transmission, history export coverage, profile fields, token storage/revocation
and source licensing. Consolidated shared policy styles and verified that removed
Discord/notification icons have no remaining source references. The new history
shortcut replaces the unused notification toggle; footer policy links open local
routes. These checks describe source behavior, not legal enforceability or hosted
provider settings.

Frozen installation, lint, dead-code checks, frontend/backend types/docs, **53
unit/integration tests** and both builds passed. The full Chrome run passed
**140 cases** and found two viewport-only footer assertions on long policy pages.
After correcting the assertion to account for document height, all **four layout
cases** passed on rerun, including policy headings, link destinations and narrow
layouts in both themes. Shared policy CSS and the final copy corrections were
covered by that rerun. Existing Vite/Knip hints remain. No hosted mutation,
SQL/Auth stack, dependency advisory scan or credential audit was repeated.

## About introduction verification

On **15 November 2026**, simplified About to an uppercase label, a brand title
at the shared page-title 700 weight and one muted line beneath it. Removed the
side introduction and supporting paragraph. Existing practice links remain.
The initial redesign ran all **142 Chrome cases** and **53 unit/integration
tests**. After the final title/copy adjustment, all **six About cases** passed
at 320/768/1440px in both themes, covering keyboard links, overflow and footer
placement; the final narrow screenshot was inspected. Lint, dead-code checks,
frontend/backend types/docs and both builds passed. The full Chrome suite was
not repeated after the final title/copy adjustment. Existing Vite/Knip hints
remain; hosted, SQL/Auth, advisory and credential checks were not repeated.

## Compact leaderboard filters verification

On **15 November 2026**, matched leaderboard filters to History's .82rem text,
9–11rem desktop widths and tighter spacing, with wrapping narrow layouts.
Lint, dead-code/type/docs checks, both builds and **53 unit/integration tests**
passed. The full Chrome run passed **141 cases**; one race-history case failed
while closing its browser context because a trace artifact was missing (ENOENT).
That exact case passed on a targeted rerun. Leaderboard checks passed in both
themes at 320/768/1440px; a desktop screenshot was inspected. Existing Vite/Knip
hints remain. No hosted, SQL/Auth, advisory or credential checks were repeated.

## Selection, preview and rank-panel verification

On **15 November 2026**, moved the Appearance preview caret inside “rhythm”,
added global accent/contrast-ink text selection with forced-color system fallback,
and reduced personal rank-panel minimum heights to 78px desktop and 110px narrow
screens. The additional 2px trim is included in those heights. Panels expand for
wrapped content. Selection contrast was recalculated from source tokens in
[CONTRAST.md](CONTRAST.md); existing failures remain recorded.

All **142 Chrome cases** and **53 unit/integration tests** passed. Four new browser
cases verify preview caret placement and selection colors on differently colored
text in both themes at 320/1440px; a rendered selection screenshot was inspected.
Leaderboard checks passed at 320/768/1440px in both themes after the final trim.
Lint, dead-code checks, frontend/backend types/docs and both builds passed; the
frontend build was repeated after the final 2px trim. Existing Vite/Knip hints
remain. No hosted or SQL/Auth checks or dependency advisory scans were repeated.

## Dashboard typography and outer-spacing verification

On **15 November 2026**, removed the app shell's 20px outer top/bottom
padding, increased recent-test table text from 12px to 13.12px, and aligned
Recent tests with its history link on one heading row. Cells remain single-line;
narrow tables scroll inside their keyboard-accessible region. Source colors
and focus tokens are unchanged.

The spacing pass ran all **138 Chrome cases** and **53 unit/integration tests**.
After the dashboard edit, **12 focused dashboard/layout cases** passed in both
themes at narrow/desktop widths, including heading/link alignment, cell sizing,
keyboard scrolling and footer placement. A narrow dashboard screenshot was
visually inspected. Lint, dead-code checks, frontend/backend types/docs and both
builds passed; existing Vite/Knip hints remain. The full browser suite was not
repeated after the dashboard edit. Hosted and SQL/Auth checks were not rerun.

## First-visit defaults verification

On **14 November 2026**, changed fresh guest prose defaults to English with a
30-second timer. Code defaults remain Python snippets, medium length and Auto
Tabs. Cached/account configurations still take precedence. The explicit new
first-visit browser case passed, together with all **138 Chrome cases**, **53
unit/integration tests**, lint, dead-code/type/docs checks and both builds.
Existing Vite/Knip hints remain; no hosted or database checks were rerun.

## Focused frontend configuration-cache verification

On **14 November 2026**, added versioned localStorage configuration snapshots
validated through the browser-safe preference contract. Startup restores guest
or the matching last account's settings before practice mounts. Uncached signed-in
practice shows a loading status until its initial read settles; read failures
allow local practice and retain an explicit sync error. Matching background data
does not regenerate the passage. Dirty edits retain their synced revision, survive
reloads and conflict with newer server revisions until explicit reload. Remote
updates still wait through active tests/results. Reconnection retries failed sync.
Snippet length and auto-indent are additional device-local cached UI choices.

The bounded configuration cache contains settings and a revision baseline, not
credentials, account profile data, score/history responses or live room state.
Guest and account snapshots are separate; the account snapshot is restored only
for its recorded owner. Storage failures and malformed/version-mismatched values
fall back without disabling practice. Existing Auth storage exposure findings
below remain applicable; this change does not introduce a new auth cookie or
change HTTP authentication, RLS or backend persistence contracts.

Frozen installation with pnpm 12.18.0, lint, dead-code checks, frontend/backend
types, documentation checks, **53 unit/integration tests**, the full **137-case
Chrome suite**, and both builds passed. The thirteen new cache browser cases
cover slow/failed initial reads, matching refresh DOM continuity, edits during
refresh, active-test deferral, failed writes/reload/retry, revision conflicts,
owner changes, guest new-tab persistence, both themes at 320/1440px, snippet and
indentation persistence, reconnection and corrupt/denied storage. Cache-focused
assertions initially missed the code modal's Indentation step; the corrected
cases and final full suite passed. Existing Vite configuration-loader and Knip
configuration hints remain. Browser dependency behavior used the local modeled
Supabase fixture, with selected first-party delays/failures injected in Playwright;
no hosted settings, SQL/Auth stack, dependency advisory audit or credential scan
was freshly verified by this focused pass.

## Focused persistent-header verification

On **14 November 2026**, moved the practice/static-page header into the router's
shared shell, outside keyed route content. Appearance and About now replace/fade
only their content. A shell-scoped Svelte context retains active-test control
visibility, route changes update practice branding, and navigation closes the
mobile menu without replacing the header.

Lint, dead-code checks, frontend/backend types, documentation checks, **50
unit/integration tests**, the full **124-case Chrome suite**, and both builds
passed against this change and the self-hosted fonts. Browser coverage includes
both themes, narrow/desktop layouts, keyboard navigation, reduced motion, typing,
header/footer DOM continuity, content replacement, brand changes and active-test
header visibility. New navigation cases check for console/page errors. Screenshots
were inspected for both themes. Existing Vite configuration-loader and Knip
configuration hints remain; no hosted deployment, database, advisory audit or
credential scan was repeated during this focused UI pass.

## Focused self-hosted font verification

On **14 November 2026**, replaced runtime Google Fonts imports with same-origin
WOFF2 assets: Comfortaa variable 300–700 and Poppins 400/500. Unicode subsets,
`font-display: swap` and licenses are retained; the primary Comfortaa Latin file
is preloaded and production assets are fingerprinted. Font loading no longer
contacts Google. Licenses are copied into production from `public/fonts`.

Frozen installation with pnpm 12.18.0, lint, dead-code checks, frontend/backend
types, documentation checks, **50 unit/integration tests**, and frontend/backend
builds passed. The full Chrome run passed **116 existing cases**; four new font
cases initially failed because of an assertion implementation error. After fixing
the test, all **four font cases passed** in a targeted rerun, covering both themes
at 320/1440px, successful same-origin font decoding, correct brand weights, no
Google font requests, initial typing focus and no console/page errors. The full
suite also covered keyboard and typing flows. Existing Vite configuration-loader
and Knip configuration hints remain. This focused pass did not repeat dependency
advisory/credential scans, SQL/Auth checks or hosted deployment verification;
those older results below retain their original scope.

## Outcome and scope

No critical issue or detected privileged credential in the scanned source,
reachable Git history/reflogs, or generated build artifacts was identified.
The browser initializes Supabase from public configuration; the server secret is
used only by the backend adapter. This is not a guarantee that credentials were
never exposed in external deployments, logs, ignored files or other clones.

**Score integrity remains an open high-priority risk.** Solo counters and
multiplayer progress are client reports. Plausible fabricated results can affect
public solo rankings despite validation and server-owned race timing.

Reviewed the HTTP handlers, Socket.IO handlers and ownership checks, browser
Auth/configuration and result queues, browser-safe validation contracts, SQL
migrations/grants, current theme/hosting configuration, dependency graph and
security workflow. No hosted account, migration, provider or deployment setting
was changed or freshly verified. Local database checks used the local stack;
they do not establish the state of a hosted project.

The general [API specification](api.openapi.json) describes all eleven HTTP
operations and the application Socket.IO events. [DEPLOYMENT.md](DEPLOYMENT.md)
covers hosting controls; [SUPABASE.md](SUPABASE.md) covers schema and Auth setup.

## Current controls and remaining findings

### Score and identity trust

| Status | Current implementation and evidence | Remaining action |
| --- | --- | --- |
| **Open: self-reported scores** | `backend/src/persistence.contract.ts` recomputes WPM/raw/accuracy/deviation from submitted counts/time, strips unapproved fields and rejects raw WPM above 1,500. `room.services.ts` binds progress to the socket owner, limits progress to passage length, requires full reported progress before completion, and owns timed-race deadlines and finish timestamps. These controls do not verify honest typing. | Decide public-board eligibility. Verified competition needs server-issued challenges, timing/replay validation and treatment of existing scores; additional plausibility thresholds alone are insufficient. |
| Verified account boundary | `persistence.ts` calls Supabase Auth `getUser` before using token identity or its expiration. HTTP owner IDs come from verification, not request fields. Authenticated sockets are bound to the verified account, expire with its token and require the correct recovery identity. Missing tokens permit guest sockets; invalid supplied tokens fail authentication. | Keep explicit account-switch/sign-out cleanup and cross-owner tests. A browser racer ID or room ID must never grant access to private results. |
| Restricted public projection | `read_solo_leaderboard` exposes display names, score fields and a pseudonymous player key, with optional verified viewer standing. Race detail checks account participation and omits opponent account/participant UUIDs. `/rooms` is intentionally public and exposes live usernames, browser racer IDs and metrics. | Public pseudonyms remain linkable; do not describe them as complete anonymity. Review every added field in public projections. |

### Availability, transport and input boundaries

| Status | Current implementation and evidence | Remaining action |
| --- | --- | --- |
| Bounded quotas; **proxy topology open** | `security.ts`, `server.ts` and `socket.ts`: `/api` and `/rooms` share 240 requests/minute per transport IP; verified-account writes have 30/minute; connection attempts have 60/minute per transport IP; each socket permits 60 events/second. There are caps of 1,000 connections, 1,000 rooms and 50 racers/room, and a 16 KiB inbound socket packet limit. HTTP 429 includes `Retry-After`. | Quotas are process-local. The backend ignores forwarded IP headers, so NAT/proxy users can share a quota. Review Northflank's actual proxy topology, deploy edge limits and design explicit trusted-proxy handling if needed. Do not enable blanket trust. |
| Origin checks configured | Socket.IO `allowRequest` validates browser Origin for polling and WebSocket handshakes. Production permits only exact `FRONTEND_ORIGINS`; development origins are not automatically included. Origin-less clients remain allowed and still face identity/resume checks. | CORS/Origin checks are browser protections, not authentication against native clients. Verify the real production and explicitly supported preview origins. |
| Input and error controls | API JSON is limited to 1 MiB. Validators bound IDs, string lengths, counters, samples, history and settings. Unknown settings/result fields are discarded; unknown race-settings patch fields are rejected. Malformed JSON, unknown application routes and persistence failures return sanitized JSON. Unit tests exercise invalid configuration, ownership, limits and error behavior. | Continue treating all counters and metadata as untrusted. Keep query parameters structured and never introduce arbitrary HTML, script, SQL or shell evaluation. |
| In-memory lifecycle | Empty rooms and expired sessions are cleaned up. Race timers, countdowns, rooms and resume tokens live in one process. Race archives capture the original roster before replay/cleanup and use a bounded retry queue. | Keep one backend replica. Restarts lose active rooms and pending race writes; persistence is not distributed Socket.IO coordination or a durable outbox. |

### Browser, secrets and hosting

| Status | Current implementation and evidence | Remaining action |
| --- | --- | --- |
| Public-key build guard | `vite.config.ts` rejects privileged keys and credential-named `VITE_` values. `public-config.ts` permits public publishable/legacy anon keys and rejects insecure non-loopback Supabase URLs. Source maps are disabled. `.gitignore` and `.dockerignore` exclude environment files. Fresh source/history/artifact scans passed. | Keep server secrets in backend runtime configuration. Public configuration in JavaScript is expected; grants/RLS and verified identity protect account data. Rotate credentials if actual exposure is discovered elsewhere. |
| Headers configured; **document CSP/TLS verification open** | Express returns API-only CSP, no-store, nosniff, DENY framing, no-referrer and Permissions-Policy, and removes X-Powered-By. `vercel.json` now configures nosniff, DENY, no-referrer and Permissions-Policy for the frontend. The document has an inline theme bootstrap and uses dynamic Svelte styles; no enforced frontend document CSP is configured here. | Verify deployed headers, actual HTTPS/HSTS policy, and a tested frontend CSP allowing the actual backend/Supabase origins, same-origin font assets and required inline/dynamic styles. Do not copy the API's `default-src 'none'` policy onto the frontend. |
| Browser-storage exposure remains | Supabase sessions, pending private result details and room recovery tokens use browser storage. PKCE callback parameters are cleared; account requests use explicit bearer headers. Solo retries remain account-bound, limited to 20 entries/approximately 2 MB. | XSS or malicious same-origin scripts could read stored credentials/data. Minimize third-party scripts and implement the document CSP. Moving sessions to HttpOnly cookies requires a separate session/CSRF design. |
| Supply-chain configuration | Actions use pinned commit SHAs. CI has narrow permissions, freezes dependency installs and scans source/history/build output. The Node 24 multi-stage Dockerfile copies only the runtime package, compiled backend/shared content and production dependencies into the final stage and runs as `node`. | Base-image tags remain mutable; image digest pinning/update automation and actual Linux image/OS scanning are separate follow-ups. Northflank's deploy job remains explicitly disabled. |

## Current dependency advisories

Fresh `pnpm audit --json` reports **0 critical, 0 high, 1 moderate and 1 low**.
Both findings are in development tooling. Fresh `pnpm audit --prod --json`
reports **zero advisories** across 134 production/optional dependency records.
This is a dependency-registry result, not an operating-system image scan.

| Package | Severity | Current advisory | Follow-up |
| --- | --- | --- | --- |
| `minimatch` 10.2.6 | Moderate | [Globparts amplification denial of service](https://github.com/advisories/GHSA-g3hv-75wg-m249), reported affected range `>=7.0.0 <11.0.1`. | Prefer a compatible parent-tool update; evaluate and test any major-version override. The registry reports a patch in `>=11.0.1`. |
| `deepmerge` 4.3.1 | Low | [Prototype poisoning of returned objects](https://github.com/advisories/GHSA-gcqx-w48m-w2h4), reported affected range `>=4.2.0 <=4.3.1`. | Track the upstream build-tool dependency; the current registry response reports no patched version. |

No dependency upgrade or security behavior change was made as part of this
documentation refresh. CI gates high/critical advisories; moderate/low findings
still require triage. Re-run the audit whenever dependencies or the registry change.

## Database controls and verification boundary

The five migration files define six RLS-enabled application tables, owner-scoped
SELECT policies, no anonymous table grants, backend-only application writes, and
restricted RPC execution. Functions set an explicit empty `search_path`.
The public solo board is a service-only projection; private table access remains
owner-scoped. Signup creates a profile, and account deletion removes private
records and anonymizes retained shared race entries.

This pass ran **60 local pgTAP assertions across three SQL files**, all passing.
The real local Supabase Auth/Data API integration also passed signup, JWT
verification, profile creation, atomic practice retries, ownership, denied browser
writes and preference conflicts. These are local database results. Hosted schema
exposure, grants, buckets, migration history, SMTP, OAuth consent and production
redirect settings were not freshly checked; earlier hosted observations are not
presented as current verification.

## Latest verification

Environment: Node **24.11.1**, pnpm **12.18.0**, Vite **8.3.6**, Supabase JS
**2.119.0**, Socket.IO **4.8.4**. Lint, dead-code, type/docs, unit/browser and
build rows were rerun for history, saved multiplayer chart colors and archived
race settings, the compact toolbar and immediate result-detail loading. Other
evidence below belongs to the earlier full security review. The history cases cover both themes at 320/1440px,
keyboard sorting/scrolling and detail focus return, loaded-result filters/CSV,
automatic entry/reload, pagination failures and skeleton transitions with
reduced motion. History has no visible introductory header or manual refresh
control; archived settings display only field labels and values. One new chart
case reproduced the missing-theme-color failure before the fix.
All four new chart cases now check plot/axis colors, all six racer lines,
finish markers and legend colors in saved history and latest results. These chart cases model archived HTTP
responses; the separate HTTP/Socket.IO suite covers local transport/persistence.
The four chart cases also cover all four race modes, applicable archived limits, modifier
values, missing settings and browser resize errors. A real local socket/HTTP
check verifies that later lobby changes do not alter a saved settings snapshot.
Four additional loading cases cover practice/race detail skeletons, pending
request cancellation, retry after failure, reduced motion and the right-aligned
Back action, with retained rows and restored focus.
An explicit SVG height stabilizes chart measurement; the final complete browser
run emitted no ResizeObserver loop errors.

| Check | Latest result |
| --- | --- |
| `npm run lint` | Passed, including the design audit. |
| `npm run audit:dead` | Passed with configuration hints; no unused runtime items reported. |
| `npm run check:all` | Passed frontend/backend type checks; includes `check:docs` after this refresh. |
| `npm test` | **50 passed** (history/chart/settings recheck), including real ephemeral HTTP/Socket.IO and the SDK against the local upstream fixture. |
| `npm run test:e2e` | **116 passed** in the complete history/chart/settings/loading recheck, including eight history utility/skeleton cases, four result-detail loading/navigation cases and four saved/latest multiplayer chart cases covering archived settings. The prior history run had 107 passes and one Classic account reload timeout; that flow passed both its isolated rerun and this complete run. Its earlier timing cause was not established. |
| Frontend/backend production builds | Passed. Vite reports a future native-config-loader warning for an extensionless config import; it is not a current build failure. |
| Credential scan | Working files, reachable history/reflogs and generated artifacts passed. Pattern scanning does not establish the safety of ignored environment files, arbitrary encodings, external backups, logs or prior hosted bundles. |
| Dependency registry | Two development-only advisories; no production advisories, as detailed above. |
| Local SQL | **60 assertions passed** across dashboard, leaderboard and persistence tests. |
| Real local Supabase integration | Passed against the local Auth/Data API; no hosted credentials were consumed. |
| API documentation | All eleven HTTP registrations and seven client/five server application Socket.IO events are covered; internal references and local links pass `npm run check:docs`. Redocly OpenAPI syntax/example validation passed. The intentional local-server and extension-only unused-component rules were excluded; internal extension references are checked locally. |
| Hosting/image/provider checks | No new Vercel/Northflank deployment, Linux image build, hosted provider consent, email-delivery check or hosted schema audit is claimed. |

The Postman CLI's spec linter hit a local keychain error (`SecItemCopyMatching`),
so its empty output is not counted as successful validation. Redocly CLI 2.78.0
was used as the independent OpenAPI validator. HTTP and Socket.IO integration
coverage does not prove that every documented JSON Schema matches every possible
handler input/output; `check:docs` also does not prove semantic equivalence.

## Remaining actions

- Decide the trust/eligibility model for public scores and address plausible
  fabricated counters before calling rankings verified competition.
- Configure and verify exact production origins, frontend CSP/HTTPS headers,
  proxy-aware abuse controls and single-replica backend deployment.
- Confirm all five migrations, RLS/grants, exposed schemas, provider settings,
  Auth redirects and real email delivery on the intended hosted project.
- Triage the two development advisories and keep dependency/Action/image update
  processes active. Require Security checks through repository branch protection.
- Monitor verification failures, 401/429 spikes, disconnects and failed saves;
  redact credentials, callback parameters and private typing histories at proxies
  and logging systems. Review retention and log access on the actual host.

## Maintenance

Refresh this report with related security, dependency, schema, hosting or trust
boundary changes. Replace evidence only after re-running the relevant check,
record failures and exceptions, and keep source/build checks separate from
local-database and hosted-environment claims. Audit and test success do not prove
absence of vulnerabilities or coverage of every interaction.
