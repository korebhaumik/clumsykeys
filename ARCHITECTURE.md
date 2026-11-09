# Architecture

The hash router (`src/lib/Router.svelte`) composes page and feature entry points. Practice owns prose/code keyboard engines, session metrics, snippet parsing and results. Settings owns the practice configuration store and modal panels. Multiplayer owns room transport subscriptions, recovery checkpoints, race metrics, lobby and ranking views.

Shared components contain layout, chart rendering and presentational icons. Chart path interpolation is a pure helper. App-wide theme and practice status live in `state/app.store.ts`. CSS is divided into canonical tokens, base styles, typing/layout primitives, and results styles.

The server separates process startup (`app.ts`), application construction (`server.ts`), HTTP routes (`http.ts`), Socket.IO bindings (`socket.ts`), room lifecycle (`room.services.ts`), settings validation and passage generation. Room state is in memory. A browser imports the pure backend race.settings contract to avoid divergent option definitions; this is the only intended frontend-to-backend boundary.

Race ownership uses socket sessions and resume tokens. Recovery lasts 30 seconds. Countdown, round timing, sampled history and finish times remain server-owned. Practice metrics retain the historical four-character WPM calculation. DOM typing engines deliberately mutate character feedback nodes and use keyed sessions to reset them; replacing this with reactive per-character state requires independent regression work.

No global barrels are used. Feature helpers may import pure shared utilities; shared icons/charts must not import feature state. Larger race keyboard/lifecycle modules retain their coupled state transitions to avoid risky semantic rewrites in this pass.
