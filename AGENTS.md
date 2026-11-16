# Working on Clumsy Keys

Svelte 5, TypeScript, Vite 8 and Tailwind 4 frontend; Express 5 and Socket.IO backend. Use Node 22.12+ on the 22 line or Node 24+, and pnpm 12.18.0. Read [CONTRIBUTING.md](CONTRIBUTING.md) for setup and review guidance, and [DESIGN.md](DESIGN.md) and [ARCHITECTURE.md](ARCHITECTURE.md) before changing UI or module boundaries.

## Commands

- `pnpm install --frozen-lockfile`
- `npm run dev` and `npm run dev:server`
- `npm run lint`, `npm run audit:dead`
- `npm run check:all`
- `npm run check:docs` (API coverage, Socket.IO events, documentation links)
- `npm test` (includes a real ephemeral HTTP/Socket.IO server)
- `npm run test:e2e` (Playwright, installed Chrome plus focused WebKit keyboard coverage; install WebKit with `pnpm exec playwright install webkit`; frontend 4193, backend 15442, upstream fixture 15443)
- `npm run build` and `npm run build:server`

## Structure and conventions

Pages compose features. `src/lib/features/{practice,settings,multiplayer,auth,history,leaderboards}` own domain behavior; shared layout, icons and charts live in `src/lib/components`. App-wide identity, theme and synchronization stores belong in `src/lib/state`; domain stores may stay with their feature. Browser-safe catalogs and selection/modifier helpers live in `shared/content`; follow its [content guide](shared/content/README.md). Keep pure calculations separate from DOM manipulation and transport handlers. Use PascalCase Svelte names and descriptive lowercase TypeScript filenames. Prefer explicit direct imports over broad barrels. Preserve Svelte rune reactivity, effect cleanup and event unsubscription.

Use semantic CSS variables from `src/styles/tokens.css`, or Tailwind token utilities. Never introduce raw colors or arbitrary visual values in components. Existing precise dimension tokens preserve layout; reuse them before adding tokens. Breakpoints and SVG drawing coordinates are structural values. Icons use the shared Icon wrapper with a 24-unit viewBox, currentColor, and no interaction. Label the enclosing button. Logo and data charts retain their own coordinate systems.

## Adding features

Use explicit `tabindex="0"` on native links, buttons and form controls for Safari
keyboard navigation. Preserve authored negative and roving indexes, disabled and
inert states, and keep static content out of sequential focus. Lint checks this
convention; verify real Tab/Shift+Tab order in Chrome and WebKit.

Add a focused feature module, compose it from a page/router entry, and place domain helpers beside it. Avoid importing stores into generic icons or charts. The backend settings contract is deliberately browser-safe; do not import server runtime modules into the frontend. Register backend transport behavior through server.ts, http.ts and socket.ts.

Register account and solo-ranking HTTP behavior in `account.http.ts` and `leaderboard.http.ts`, composed through `server.ts`. Preserve the distinction between `#/login` room access, `#/account` authentication, `#/ranking` multiplayer results and `#/leaderboard` public solo rankings. Keep backend packaging compatible with shared-content compilation and the `backend/build/backend/src/app.js` entry point. Current rooms and pending race saves are process-local; do not assume multiple replicas or durable live recovery.

## Git commit convention

All new commits must follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/). Use `type(scope): description`; the scope is optional, and an optional `!` immediately before the colon marks a breaking change.

- Use a lowercase type from `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, or `revert`. This type list is the repository's policy. Use `feat` for new behavior and `fix` for bug fixes; use `style` only for formatting changes that do not affect behavior.
- When useful, add a lowercase, kebab-case scope naming the affected area, such as `practice`, `multiplayer`, `a11y`, or `deploy`.
- Write a concise imperative description without a trailing period. Describe the actual change; avoid vague subjects such as "updates", "changes", or "checkpoint".
- Keep independent changes in separate commits. Add a body, separated by a blank line, when the reason or migration details need explanation. Mark breaking changes with `!` or a `BREAKING CHANGE:` footer and explain their impact. For reverts, identify the reverted commit in the body or footer.
- Before every commit, inspect `git diff --cached` and run `git diff --cached --check`. Verify that the proposed message follows these rules. Before pushing, inspect every outgoing commit message, including messages created by squash or merge operations, and correct nonconforming messages only within the authorized history-editing scope.
- Do not rewrite existing history or force-push solely to normalize old messages without explicit authorization. Report historical exceptions with their commit IDs and proposed replacement subjects.

Examples: `feat(practice): add quote length controls`, `fix(ui): remove decorative heading line`, and `docs: clarify deployment setup`.

## Maintained documentation

Keep all five root guides current: `README.md` is a brief application showcase and local quick start; `CONTRIBUTING.md` owns contributor setup, commands and review workflow; `DESIGN.md` owns shared UI conventions and links to canonical token values; `ARCHITECTURE.md` owns routes, module boundaries and data flow; `AGENTS.md` owns actionable repository rules. Link detailed operating/audit information rather than expanding the README into a second manual. Update the affected root guide with implementation changes and avoid duplicating the full palette, API contract or historical test reports across guides.

Keep the five files in `docs/` aligned with related changes: `CONTRAST.md` for palette/background/focus changes; `SECURITY_AUDIT.md` for security controls, dependency advisories and freshly verified build/test results; `SUPABASE.md` for account, persistence, migration and leaderboard behavior; `DEPLOYMENT.md` for hosting, environment, Docker and CI configuration; and `api.openapi.json` for every first-party HTTP operation and Socket.IO event. Update affected documentation in the same change. Keep source references and local links valid. Do not restore retired baseline, refactor, removal-inventory or integration-plan reports.

The backend handlers and browser-safe contracts define actual API behavior. Document public, optional-auth and authenticated operations accurately, including validation, response projections, retries and consequential failures. OpenAPI describes HTTP; keep the live event contract in its `x-socketio` extension rather than inventing REST endpoints. Run `npm run check:docs` and an OpenAPI syntax/example validator after contract edits. The local check catches missing routes/events, unresolved references and broken links; it does not prove schema/handler equivalence.

Audit dates and test counts must describe checks actually run against the current code. Recalculate contrast from the source colors after relevant visual changes, retain known failures, and distinguish source/build verification from hosted database, provider and deployment checks. Do not carry forward historical success claims as fresh evidence.

## Definition of done

Run the full command suite above. Cover changed behavior with meaningful unit/integration tests and browser flows. Verify both themes, keyboard interaction, narrow screens, and no browser errors. Preserve storage keys, Socket.IO events, routes, WPM formulas, and typing semantics unless explicitly fixing a documented bug. Check dynamic references before deletion. Flag uncertain dead code instead of deleting it. Do not commit generated build/test output or credentials. Record known limitations honestly; passing tests do not prove every possible interaction.

Run only one default browser suite at a time against its configured ports/output directory. Do not stop unrelated servers to free those ports. Normal tests use local fixtures and ephemeral servers; SQL/Auth verification uses the real local Supabase stack. Treat hosted tests and migration commands as external mutations rather than routine local verification; follow the task's authorization and describe their effects. Keep local, modeled and hosted verification claims distinct, and carry unresolved failures forward until a relevant rerun actually resolves them.
