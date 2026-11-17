# Security audit

Full security review: **14 November 2026**, source baseline `22ab661` plus that
review’s working-tree changes. Focused history UI verification: **14 November
2026**, baseline `63c504d` plus the history redesign, chart colors, archived
race settings and simplified history toolbar/detail labels. The focused pass reran the
source/build/browser checks listed below; it did not repeat credential scans,
dependency auditing, SQL/Auth verification or hosted checks. This is a maintained
assessment of current controls and remaining work.

## Multiplayer termination verification

On **18 November 2026**, the first joined racer became the server-owned room
host. Only the socket owning that host may end the matching active round ID;
client-supplied room/user IDs do not grant permission. Stale round requests are
rejected. Unexpected disconnects preserve host ownership during the existing
30-second recovery window; explicit leave invalidates recovery immediately and
transfers host to the earliest remaining racer. Settings editing and unanimous
start voting retain their existing permissions.

Host termination captures an immutable aborted archive before resetting live
metrics/votes and cancelling countdown/deadline timers. It retains settings and
returns connected racers to the lobby. Finished participants retain completion
reasons; unfinished entries use the legacy `disconnected` reason, with the round
marked `aborted`. No database migration was added. Server-held metrics remain
client-reported and do not establish honest typing.

The pnpm 12.18.0 native launcher failed with `ENOEXEC`. The same installation's
JavaScript entry point completed the frozen-lockfile install from the local
package store after the sandboxed attempt encountered registry resolution
errors. Dependencies and the lockfile were not upgraded. Lint/design audit,
dead-code checks, frontend/backend types, documentation coverage, independent
Redocly validation, both production builds and SEO checks passed. All **68
unit/HTTP/socket tests** passed, including host recovery/transfer, forged and
stale requests, partial/finished archives and cancellation of a deadline before
a subsequent round. Persistence tests use the modeled local Supabase HTTP
fixture; they do not establish real SQL/RLS or hosted behavior. Existing Vite
config-loader warnings and Knip configuration hints remain.

The focused eight-case browser pass covered both themes at 320/1440px in Chrome
and WebKit: dialog Tab/Shift+Tab/Escape, cancel/confirm, checkpoint clearing,
return-to-lobby focus, replay and individual departure. Dialog screenshots were
visually inspected. The full **270-case suite (205 Chrome, 65 WebKit)**
initially passed 260 cases. Eight new cases used an incorrect accessible-name
assertion for the existing room-details dialog (the dialog is named by room ID);
the assertion was corrected. One existing history case received HTTP 429 on a
pagination retry, and one existing WebKit caret case observed an animation after
switching to reduced motion. All **13 targeted rerun cases passed**, covering
all ten new race cases and both existing failures (the caret check in both
browsers). The motion timing cause was not established; no practice/history
implementation was changed. New race cases also verify closing open room details
on termination and live host transfer, with no captured page errors. No hosted
deployment, provider, real database, dependency-advisory or credential scan is
claimed for this feature. Source contrast recalculation is recorded in
[CONTRAST.md](CONTRAST.md#multiplayer-termination-controls); existing limitations
remain.

The race toolbar follow-up on **18 November 2026** placed both actions on the
settings row and moved the host badge next to View room. Chrome and WebKit
passed all ten race cases, including layout and keyboard checks in both themes
at 320/1440px, opening room details from the mobile button, and host transfer.
The full browser suite passed 269 of 270 cases. The Classic desktop history
case encountered HTTP 429 during pagination and passed on a fresh test server.
All 68 unit/HTTP/socket tests, lint, dead-code and type/docs checks, both builds,
and SEO checks passed.

The phone layout follow-up hid the live race settings summary, View room
shortcut and host badge at phone widths. The toolbar stays below the header and
uses named icon buttons on phones. Eleven focused Chrome/WebKit race cases
passed, covering keyboard order, desktop controls, resizing, reconnect and
replay. The final full browser suite passed 268 of 270 cases, including all race
cases. The existing history pagination rate limit and WebKit reduced-motion
caret timing failures passed on a fresh rerun. All 68 unit/HTTP/socket tests,
lint, dead-code and type/docs checks, both builds, and SEO checks passed for the
layout follow-up.

## Mobile practice verification

On **17 November 2026**, mobile practice was updated to center while idle and
move beneath the header when the typing input receives focus. Both practice
modes expose a single Test Settings button on narrow screens; code options,
including snippet length, remain in the dialog. Desktop controls and footer
links remain visible. The narrow footer contains GitHub, Support email and the
developer credit. Touch input supports virtual text, deletion, Return and a
manual-indent action without scoring the transient input sentinel. Visual
viewport changes reserve scroll space above the keyboard; listeners, observers,
frames and pointer-release timers are cleaned up on teardown.

Lint/design checks, dead-code checks, frontend/backend type and documentation
checks, all **65 unit/HTTP/socket tests**, both production builds and SEO checks
passed on this working tree. **44 desktop content screenshots** across both
themes, eleven routes and 1440/1920px widths matched the original pixels.
Mobile previews were inspected at 320/390/640px. The full **244-case browser
run (192 Chrome, 52 WebKit)** passed 235 cases initially; the nine affected cases
passed a focused rerun after adapting mobile dialog/focus assertions and fixing
the prompt-induced pointer shift. All 20 new touch cases passed in the full run,
covering idle centering, focus/blur positioning, both keyboard viewport models,
virtual text/deletion/Return, manual indentation and settings access. Browser
account and leaderboard flows use the local modeled service, not hosted
providers or the real database.

Touch input and shortened-layout/visual-viewport-only keyboard behavior are
modeled in Chrome and WebKit. A physical iPhone keyboard was not exercised.
No database, hosted deployment, dependency advisory or credential scan is claimed
for this UI change. Existing contrast limitations remain; palette, background
roles and focus colors are unchanged. The local pnpm 12.18.0 launcher still
fails with `ENOEXEC`, so checks use the installed dependencies.

The **17 November 2026 double-tap overlay follow-up** puts the mobile focus
prompt over the blurred passage in both solo modes. A single pointer tap leaves
the input unfocused; a deliberate second tap focuses it synchronously. Keyboard
and assistive activation remain single actions, and desktop prompt copy and
single-click focus are preserved. The label uses an opaque inset backing;
[CONTRAST.md](CONTRAST.md#mobile-double-tap-focus-overlay) records fresh source
ratios. Both-theme overlays were visually inspected in local Chrome captures.
Lint/design, dead-code, type/docs checks, all **65 unit/HTTP/socket tests**, both
production builds and SEO checks passed. The full **248-case suite passed
cleanly: 194 Chrome and 54 WebKit**, including first-tap rejection, double-tap
focus, overlay geometry/blur, Enter/Space, centering, keyboard viewport changes,
reset/replay and virtual input. A physical iPhone, hosted services, real database,
dependency advisories and credential scans were not checked in this follow-up.
The existing pnpm launcher `ENOEXEC` still prevents a frozen install; installed
dependencies supplied these checks.

## Mobile typing performance investigation

On **17 November 2026**, browser regressions reproduced two input-time issues:
the 110ms caret transition left the rendered caret 16px behind its requested
position at the next frame in the recorded Chrome sample; four modeled native
visual-viewport scroll events triggered four corrective page-scroll calls.
This establishes an animation delay and a viewport-scroll feedback path, not
a physical-phone CPU profile or a universal explanation of all device lag.

Touch caret movement now skips the transition; desktop motion is retained.
Viewport correction runs on focus/viewport resize/passage resize, not native
viewport scroll. Pending resize work is coalesced and unchanged keyboard padding
is not rewritten. The caret helper reads geometry before applying scroll and
position styles; it derives the post-scroll vertical position from the measured
scroll delta instead of reading geometry again after writes. Existing word/line
scrolling, indentation, correction and scoring semantics remain unchanged.

The original four Chrome performance cases failed before the fix. Afterward,
the same next-frame/pan checks passed in Chrome and WebKit; the caret cases now
exercise prose, snippets and keywords with normal motion enabled. The full
**256-case run (198 Chrome, 58 WebKit)** passed 254 cases initially; two new
Chrome multi-mode cases retained an active snippet between identical hash visits.
After fixing that test setup to reload between modes, both passed a focused
rerun. No existing browser case failed. Lint/design, dead-code, type/docs checks,
all **65 unit/HTTP/socket tests**, both builds and SEO checks passed. Palette,
focus colors, scoring formulas, routes, storage keys and transport contracts
were not changed. Physical-phone profiling, hosted/database checks, dependency
advisory scans and credential scans were not performed. The pnpm launcher still
fails with `ENOEXEC`; checks used installed dependencies.

### Touch caret smoothing follow-up

On **17 November 2026**, same-line touch caret movement gained a bounded 50ms
transform animation while layout coordinates still update immediately. Rapid
input cancels and retargets one movement using cached positions and eased
animation progress; there are no extra geometry reads in the retargeting step.
Row changes, scrolling and reduced motion snap to the target. Desktop retains
its original left/top transition. Native viewport panning remains uncorrected.

The full **260-case browser suite passed (200 Chrome, 60 WebKit)**. It included
mid-animation continuity, a single active movement, transform-only keyframes,
50ms duration and reduced-motion checks across prose, snippets and keywords in
both themes. The full run logged two development module-load warnings during
forced test reloads. The test setup now waits for the route to mount before
reloading, and all **12 performance cases passed again with explicit page-error
assertions**, without those module-load warnings. Lint/design, dead-code,
type/docs checks, all **65 unit/HTTP/socket tests**, both builds and SEO checks
passed. Color roles and scoring contracts are unchanged. Physical-phone motion
and hosted/database/provider checks remain unverified; the existing pnpm
launcher `ENOEXEC` still blocks a frozen install, so installed dependencies were
used. Existing Vite config-loader warnings and Knip configuration hints remain.

## Interactive feedback verification

On **16–17 November 2026**, added compact per-category solo achievement cards with a
trophy medallion, unlocked badge, improvement pill and reduced-motion-aware
slide/pop/sparkle feedback, plus interactive keys on the account sign-in page. Guest WPM bests
use a new device-local storage key, separate from account bests. Signed-in bests
come from authenticated `GET /api/practice-personal-best` plus this tab's completed
tests. Categories distinguish practice mode, language, active test type and length;
modifiers, difficulty and auto-indent share a category. The read selects the
highest matching owner-scoped WPM across saved rows, independent of history
pagination. New snippet results archive optional `snippetLength`; older
unattributed snippets are excluded, while legacy quotes default to medium.
Version 2 guest snapshots retain category keys under the same storage key;
legacy mode-only aggregates cannot establish category baselines.
An unavailable snapshot suppresses achievement claims without preventing
result saves. Retry entries are stored immediately; only network writes wait
for the snapshot. Existing owner verification is preserved. The additive HTTP
read and optional snippet result field are documented in OpenAPI; no database
migration, RPC or dependency changes are required. Achievements do not establish
score integrity or persistence.

Checks ran on **16–17 November 2026**. Lint/design audit, dead-code checks,
frontend/backend type/docs checks, **65 unit/HTTP/socket tests**, both production
builds and SEO artifact checks passed. The complete browser suite passed **226
cases: 184 Chrome and 42 WebKit**. Its 14 interaction cases cover both themes at 320/1440px,
all three solo modes, first-result baselines, guest persistence/account isolation,
storage-write failures, delayed/failed snapshots, immediate retry-queue storage, history suppression,
replay/dismissal cleanup, auto-dismissal, reduced motion, real Tab/Shift+Tab and
pointer/Enter/Space feedback. The exact English 30s, English 60s and English 2k
25-word case passes in both browsers. HTTP tests verify authentication, invalid
categories, owner isolation and an older matching best behind 23 newer results
in another category. OpenAPI syntax/example validation passed with Redocly 2.78.0.
Settled category-footer screenshots were inspected. The real local Supabase stack passed **86 pgTAP assertions
across six SQL files** and the Auth/Data API integration check, including
disposable-user cleanup and actual JSON-field/category filtering for prose,
legacy quotes, snippets and keywords. Browser account flows use the separate modeled fixture;
these are distinct from the real local database checks.

The **17 November 2026** exit-motion follow-up reran lint/design, types/docs,
dead-code checks, all **65 unit/HTTP/socket tests**, both builds and the complete
**226-case Chrome/WebKit suite**, all passing. Manual and timed dismissals now
retain an inert card through a local Svelte outro, fading and sliding it fully
above the viewport before removal. Browser assertions pause actual outgoing
animations, verify upward movement and partial opacity mid-flight, and verify
the final card bottom is above the viewport before removal. Keyboard dismissal
returns focus to results; reduced motion removes immediately. Replay/navigation
clear the old view without waiting for this local outro. The SQL/Auth evidence
above belongs to the category-lookup pass; it was not repeated for this motion-only
change, which adds no persistence or transport behavior.

`pnpm install --frozen-lockfile` could not run because the local pnpm 12.18.0
launcher reports `ENOEXEC`; checks used the installed dependencies. The existing
Vite native-config-loader warning and Knip configuration hints remain. No new
dependency/advisory or credential scan, hosted provider check or deployment is
claimed for this issue. Source-token contrast was recalculated
in [CONTRAST.md](CONTRAST.md); its known failures remain open.

## Nonvisual SEO and original-interface verification

On **16 November 2026**, narrowed the SEO work to head metadata, factual WebSite
JSON-LD, robots.txt and a root-only sitemap. Removed the proposed visible copy,
landing documents, `/app` shell, extra stylesheet and asynchronous route changes
at the user's request to retain the original interface. No hidden marketing
copy or bot-specific response is used. The origin is validated from build-time
`SITE_URL`, and metadata attributes/JSON are escaped.

Compared production builds of baseline `bc4fde9` and this working tree with
matching public build configuration: all **16 JavaScript/CSS/font assets** and
the complete HTML body matched byte for byte. All **eight screenshot comparisons**
also matched exactly across Chrome/WebKit, both themes and 320/1440px. The
corrected desktop practice screenshot was visually inspected. No application
styles, routes, loading, auth, transport, scoring or typing logic changed.

Frozen dependency verification from this session, lint/design audit, dead-code,
frontend/backend types/docs checks, **59 unit/HTTP/socket tests**, both builds
and SEO artifact checks passed. Build validation confirms that retired landing
documents are absent. The complete **212-case Chrome/WebKit suite passed**,
including ten metadata/original-interface cases, reset/replay, keyboard order,
themes, narrow layouts and browser-error checks. Focus tests wait for the input
before sending keys and hold the native arrow key through a rendering frame;
no application behavior was changed for these assertions. Existing Vite
native-config-loader warnings and Knip configuration hints remain non-failing.

No production deployment, Search Console submission, Google index/ranking,
field performance, hosted SQL/Auth verification, advisory audit or credential
scan was performed. Hash views remain one HTTP document and are excluded from
the sitemap as separate URLs. See the [owner indexing workflow](DEPLOYMENT.md#seo-metadata-and-indexing).

## Safari keyboard navigation verification

On **16 November 2026**, fixed reset/replay and cross-page keyboard access by
giving native links, buttons and form controls explicit Tab stops. WebKit's
default navigation skipped implicit buttons; the prose reset reproduced that
failure before the fix. Authored negative/roving indexes, disabled/inert states,
native dialog/dropdown behavior and snippet indentation remain intact. The
design audit now checks the explicit-index convention.

Frozen installation with pnpm 12.18.0, lint/design audit, dead-code checks,
frontend/backend type/docs checks, **56 unit/HTTP/socket tests**, and both builds
passed. The **20 focused WebKit browser cases** passed in both themes at
320/1440px, including real forward/backward traversal of public pages, accounts,
saved history, settings dialogs and a local multiplayer lobby, reset/replay,
native Enter/Space activation and snippet indentation/reset shortcuts. Tests
check browser errors. Source-token focus contrast was recalculated; known
contrast failures remain recorded in [CONTRAST.md](CONTRAST.md).

The complete browser run passed **201 of 202 cases**: all **172 Chrome cases**
and **29 of 30 WebKit cases**. All new reset/navigation cases passed. One
existing Classic WebKit table case focused the overflow region but did not
observe horizontal movement after ArrowRight. Both themes' table cases passed
the isolated **two-case rerun** without source changes. Its intermittent cause
is unconfirmed; the complete suite was not repeated after that rerun. Other
WebKit checks include dropdown navigation, static/overflow tab stops, focus
outlines and focus return across routes.

Browser account/history traffic uses the local modeled Supabase fixture; no
hosted deployment, SQL/Auth-stack verification, advisory audit or credential
scan was repeated. WebKit coverage is engine-level verification, not a claim
about every Safari/macOS accessibility preference combination.

## Northflank CD re-enablement

On **15 November 2026**, restored the existing deploy-job condition allowing
manual dispatch or a successful main-branch Docker build. Failed builds remain
excluded. Pinned actions, image-tag validation and serialized production deploys
are unchanged. Documentation/link checks and whitespace validation passed.
This is a workflow configuration change; no workflow was dispatched and no
hosted deployment or service health was verified. The application test/build
results below retain their recorded scope.

## README showcase verification

On **15 November 2026**, refreshed the README and added seven screenshots of the
actual local application, using fictional account/result data and a real local
Socket.IO room. Both themes are represented, and every image was visually
inspected. The README labels the demo data; image paths, alternative text, local
links and GitHub Markdown rendering were checked. The linked live app returned
HTTP 200.

Against baseline `fd7873f` plus these documentation assets, frozen dependency
installation, lint/design audit, dead-code checks, frontend/backend type/docs
checks, **56 unit/HTTP/socket tests**, **152 browser cases** and both builds passed.
The complete browser rerun resolves the earlier shared leaderboard-fixture
failure recorded below. No application behavior changed; credential/advisory
scans, SQL/Auth integration and hosted mutation checks were not repeated.

## Compact leaderboard player verification

On **15 November 2026**, simplified each player cell to its unique `@handle`,
falling back to the display name for unassigned accounts. The current-player
marker stays inline at the existing compact table scale. The public API retains
both fields; this is presentation only. All **15 handle/leaderboard browser
cases** passed across both themes and narrow/desktop widths, including fallback
names, distinct handles for duplicate display names and inline marker geometry.
Lint, frontend/backend type/docs checks and the frontend build passed; the
updated table screenshot was inspected. No hosted or database change was made.

## Guest room notice verification

On **15 November 2026**, limited the room-access guest/sign-in explanation to a
settled signed-out session. Signed-in users and pending session restoration do
not render it. Four account browser cases passed at 320/1440px in both themes,
checking its absence while signed in and its return, link destination and blank
room alias after signing out. Lint, frontend/backend type/docs checks and the
frontend build passed. No transport, authentication control or hosted state was
changed; the broader test evidence below retains its earlier scope.

## Hosted handle seed and hover verification

On **15 November 2026**, the requested hosted inspection found that
`profiles.handle` was missing (PostgREST 42703), causing the account read failure.
The reviewed migration plan contained the pending display-name/unique-handle
migrations plus `20261115000300_seed_existing_handles.sql`. After local validation,
all three were applied to the configured hosted project under the user's request
to seed existing accounts. The single existing profile received `korebhaumik`;
read-only verification through the real account adapter and solo leaderboard
projection confirmed it, with zero unassigned profiles. No provider configuration
or deployed frontend/backend service was changed.

The seed preserves claimed handles, prefers non-email public provider/name
metadata, uses bounded collision suffixes and serializes profile writes during
the short backfill. Its security-definer helper has an empty search path and is
revoked from public, anonymous, authenticated and backend API roles. Local tests
verify collisions, email fallback, claim preservation, reruns and access grants.
New accounts still choose their handle explicitly.

The Change handle button was replaced by direct double-click/Enter/Space editing
of the handle. Handles use the accent by default on accounts and rankings;
editable display names/handles gain an accent-wash background and underline on
hover. Lint/dead-code/type/docs checks, both builds, **56 unit/transport tests**,
**86 local SQL assertions**, real local Supabase integration and **eight affected
browser cases** passed. A local SQL test initially could not include a host file
inside the database container; it now exercises the maintenance helper directly.
The hover cases explicitly select their theme after shared OAuth preference
restoration; the corrected rerun passed both themes at 320/1440px. No wider browser
suite, credential scan or dependency advisory audit was repeated for this pass.

## Display-name double-click verification

On **15 November 2026**, replaced the display-name pencil with direct double-click
editing of the centered name. The native button retains Enter/Space activation,
the global focus outline, a hover hint and focus return after Save/Cancel. A
single pointer click does not open the editor. The now-unreferenced new icon was
removed after checking its imports. Display-name persistence and handle claims
are unchanged.

Lint/design audit, dead-code checks, frontend/backend type/docs checks and both
builds passed. **16 account/name/handle browser cases** passed in both themes at
320/1440px. A further **four name cases** passed with explicit Enter/Space,
single/double-click, centering and focus-return assertions. The wider suite and
database evidence below retain their earlier scopes; no hosted changes were made.

## Unique-handle verification

On **15 November 2026**, added nullable lowercase handles separate from display
names, Auth metadata and multiplayer aliases. The authenticated handle endpoint
uses verified owner identity and shares the existing account write quota.
Validation allows 3–24 ASCII letters/digits/underscores; a database constraint and
case-insensitive unique index arbitrate concurrent claims. Only the backend may
execute the write RPC. Same-owner retries are safe; conflicts return 409 without
replacing either owner's handle. Existing accounts choose a handle explicitly.
Handle changes and account deletion release previous values. Public rankings
include current handles without exposing additional private profile fields.

Lint/design audit, dead-code checks, frontend/backend types, documentation checks,
**56 unit/HTTP/socket tests**, both builds and independent Redocly OpenAPI
validation passed. **78 pgTAP assertions** and real local Auth/Data API integration
passed, including concurrent claims with exactly one winner and current handle
projection on existing solo results after a rename. The local modeled fixture
covers the HTTP adapter; it does not establish hosted settings. Initial test
failures exposed a shared quota exhausted by another test and a handle-prefix
selector matching two rows; the corrected isolated accounts/exact selectors pass.
An invalid nullable-handle schema was corrected and independent validation rerun.
The full Chrome run passed **151 of 152 cases**; new high-score fixture users
pushed an existing test's owner beyond its assumed first leaderboard page. The
handle fixtures now use a separate 120-second board, and all **15 handle and
leaderboard cases passed together on rerun**, including the previously failing
case. The full suite was not repeated after this test-data-only correction. Browser screenshots were
inspected in both themes at narrow/desktop sizes. The Postman CLI does not support
`status`; verification used the existing fixture directly, real local Supabase
and Redocly, with no Postman workspace publication. No hosted migration, new
dependency audit or credential scan was performed.

## Account display-name verification

On **15 November 2026**, added public display-name editing through Supabase
Auth metadata. A security-definer trigger with an empty search path synchronizes
`profiles.display_name` on metadata updates; its helper is unavailable to browser
roles. OAuth fallback names are bounded to 50 characters and skip email-like
values. The migration backfills blank/email-like profiles without replacing
existing public names. Saved multiplayer aliases remain historical snapshots.
The room form defaults to account metadata but preserves a typed alias during
same-account session updates, resetting on account switches.

Frozen installation, lint/design audit, dead-code checks, frontend/backend
checks, documentation checks, **54 unit/integration tests** and both builds
passed. The migration was applied only to local Supabase: **68 pgTAP assertions**
and the real local Auth/Data API integration passed, including a name update
observed through the backend profile read. Browser dependencies use the local
modeled fixture; real GitHub consent/provider refresh and hosted migration are
not freshly verified. Initial browser test failures came from an incomplete
practice payload and an assertion targeting the hidden result table rather than
the lobby roster; the corrected name flows pass. The full **148-case Chrome suite** passed; a
subsequent **12-case account/name rerun** covered the pencil control and editor
layout in both themes at 320/1440px. The final supplied icon passed another
four name-flow cases; a further four-case rerun verified that the name itself
stays centered before and during editing with the pencil alongside. Screenshots were inspected in both themes. Existing
Vite/Knip hints remain.
No hosted migration, provider configuration, dependency advisory scan or
credential audit was performed.

## Keyboard tab-order verification

On **15 November 2026**, removed the static leaderboard panel from the tab
order. Table wrappers and the locked race settings preview now become keyboard
scroll stops only while their content overflows horizontally. Resize/content
observers are disconnected when their view is destroyed. Control outlines,
typing semantics and transport/authentication contracts are unchanged.

Frozen installation with pnpm 12.18.0, lint, dead-code checks, frontend/backend
types, documentation checks, **53 unit/integration tests**, the full **144-case
Chrome suite** and both builds passed.
The initial sandbox run could not bind local transport ports; the successful
rerun used local servers outside the sandbox. Browser regressions cover forward
and reverse tab order, both themes, desktop/narrow resizing, empty leaderboard
content, and retained arrow-key scrolling in account/history/race views. The two
new regression cases also check console/page errors; both-theme screenshots were
inspected at desktop and narrow widths. Browser dependencies used the local
modeled Supabase fixture, with selected responses modeled in Playwright. Existing
Vite/Knip hints remain. No hosted mutation, SQL/Auth stack, dependency advisory
scan or credential audit was repeated during this focused UI pass.

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

The general [API specification](api.openapi.json) describes all twelve HTTP
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

On **18 November 2026**, `pnpm audit --json` reported **0 critical, 1 high,
1 moderate and 0 low**. Both findings are in development tooling.
`pnpm audit --prod --json`
reports **zero advisories** across 134 production/optional dependency records.
This is a dependency-registry result, not an operating-system image scan.

| Package | Severity | Current advisory | Follow-up |
| --- | --- | --- | --- |
| `minimatch` 10.2.6 | Moderate | [Globparts amplification denial of service](https://github.com/advisories/GHSA-g3hv-75wg-m249), reported affected range `>=7.0.0 <11.0.1`. | Prefer a compatible parent-tool update; evaluate and test any major-version override. The registry reports a patch in `>=11.0.1`. |
| `picomatch` 4.0.7 | High | [Repeated extglob denial of service](https://github.com/advisories/GHSA-fc5q-39xc-vjpf), reported affected range `<=4.0.7`. | The registry reports no patched release. Track the [upstream release issue](https://github.com/micromatch/picomatch/issues/247), then upgrade and remove the CI exception. |

CI first runs the production audit with no advisory exclusions. The workspace
audit then excludes only `GHSA-fc5q-39xc-vjpf` while it remains unpatched and
development-only. Both checks use the high severity threshold. The exception
does not patch picomatch, and an unfiltered local audit still reports it.
The moderate minimatch advisory remains open pending a compatible tooling update.

## Database controls and verification boundary

The eight migration files define six RLS-enabled application tables, owner-scoped
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

## Earlier security and history verification

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
- Confirm all eight migrations, RLS/grants, exposed schemas, provider settings,
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
