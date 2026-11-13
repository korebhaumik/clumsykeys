# Architecture

The hash router (`src/lib/Router.svelte`) composes page and feature entry points. Practice owns prose/code keyboard engines, session metrics, snippet parsing and results. Settings owns the practice configuration store and modal panels. Multiplayer owns room transport subscriptions, recovery checkpoints, race metrics, lobby and ranking views.

Shared components contain layout, chart rendering and presentational icons. Chart path interpolation is a pure helper. App-wide theme and practice status live in `state/app.store.ts`. CSS is divided into canonical tokens, base styles, typing/layout primitives, and results styles.

The solo `/leaderboard` page composes the leaderboards feature. Its pure helpers
normalize hash query filters and rank one best result per player within the
selected solo mode, language, format, length and rolling time range. Practice
settings and this page share the solo language and length catalogs. A cancellable
service reads `/api/leaderboards/solo`; Express verifies optional account tokens
and calls the service-only `read_solo_leaderboard` RPC. PostgreSQL filters saved
solo summaries before selecting each player's best, ranks the full board and
returns a bounded page plus the verified viewer's standing. Public output is
limited to display names and score fields, with pseudonymous player keys and no
account UUIDs, preferences or keystroke details. Private table RLS remains
unchanged. Synthetic score fixtures exist only in tests.

App owns the single shared footer with site links and developer credit. Practice
and live-race layouts render only their contextual shortcut rows. The viewport
shell uses flex layout to keep the footer below content and at the bottom of
short pages; main content centers in the space between the header and footer,
with normal document scrolling when a small viewport cannot contain it.
The account content fills the shared page container, including its signed-in
view, while retaining the same outer width limit and gutters as other pages.

The server separates process startup (`app.ts`), application construction (`server.ts`), HTTP routes (`http.ts`), Socket.IO bindings (`socket.ts`), room lifecycle (`room.services.ts`), settings validation and passage generation. Room state is in memory. The browser shares the browser-safe race settings contract and passage datasets and sampling functions with the backend.

Race ownership uses socket sessions and resume tokens. Recovery lasts 30 seconds. Countdown, round timing, sampled history and finish times remain server-owned. Practice metrics retain the historical four-character WPM calculation. DOM typing engines deliberately mutate character feedback nodes and use keyed sessions to reset them; replacing this with reactive per-character state requires independent regression work.

No global barrels are used. Feature helpers may import pure shared utilities; shared icons/charts must not import feature state. Larger race keyboard/lifecycle modules retain their coupled state transitions to avoid risky semantic rewrites in this pass.

Supabase Auth establishes optional account identity independently of browser racer
IDs and Socket.IO resume tokens. The auth feature owns account forms; the history
feature owns paginated saved results. App-wide account and preference sync state
lives under `state/`. Startup exchanges PKCE callback codes before importing the
hash router. Auth subscriptions and sync listeners are cleaned up on unmount/HMR.

The browser Supabase client receives only public configuration. Account API
requests carry its access token. Express verifies tokens with Supabase Auth and
derives ownership server-side. `createApplication` accepts an optional persistence
dependency; process startup loads root `.env` and constructs the real typed
adapter. Tests construct applications independently of hosted credentials.
The browser imports only browser-safe persistence contracts and database types
from the backend, alongside the existing settings contract.

All database writes go through validated backend services. RLS separately limits
authenticated browser reads to owned rows; anonymous roles have no table grants.
Restricted RPC functions save practice summary/details or a race/participants in
one transaction and enforce retry IDs. Preferences use optimistic revisions.
SQL migrations, access tests, and generated TypeScript types are versioned.
The signed-in account dashboard reads a single service-only database snapshot of
all saved solo tests, with per-test averages, highest WPM per mode and five recent
summaries. Guest, abandoned and multiplayer sessions do not enter these totals.
The auth feature owns presentation and formatting; identity comes from the
verified account API token, never a client-supplied owner ID.

Solo completion handlers capture one account-bound result without adding I/O to
the keyboard loop or changing the pure metrics helper. Failed solo writes use a
bounded browser queue. Preferences hydrate between sessions and restore guest
settings on account changes. Race services freeze the original roster and final
metrics before replay/cleanup, then submit a bounded asynchronous server queue.
Neither this queue nor active rooms survive process loss. Archived race data
includes time-limit, disconnected, and abandoned outcomes; it does not establish
cheat resistance or enable multiple backend replicas.
