# Working on Clumsy Keys

Svelte 5, TypeScript, Vite 8 and Tailwind 4 frontend; Express 5 and Socket.IO backend. Use Node 22.12+ or 24+ and pnpm 12.18.0. Read DESIGN.md and ARCHITECTURE.md before changing UI or module boundaries.

## Commands

- `pnpm install --frozen-lockfile`
- `npm run dev` and `npm run dev:server`
- `npm run lint`, `npm run audit:dead`
- `npm run check:all`
- `npm test` (includes a real ephemeral HTTP/Socket.IO server)
- `npm run test:e2e` (Playwright, installed Chrome, ports 4193 and 15442)
- `npm run build` and `npm run build:server`

## Structure and conventions

Pages compose features. `src/lib/features/{practice,settings,multiplayer}` own domain behavior; shared layout, icons and charts live in `src/lib/components`. App-wide stores belong in `src/lib/state`. Keep pure calculations separate from DOM manipulation and transport handlers. Use PascalCase Svelte names and descriptive lowercase TypeScript filenames. Prefer explicit direct imports over broad barrels. Preserve Svelte rune reactivity, effect cleanup and event unsubscription.

Use semantic CSS variables from `src/styles/tokens.css`, or Tailwind token utilities. Never introduce raw colors or arbitrary visual values in components. Existing precise dimension tokens preserve layout; reuse them before adding tokens. Breakpoints and SVG drawing coordinates are structural values. Icons use the shared Icon wrapper with a 24-unit viewBox, currentColor, and no interaction. Label the enclosing button. Logo and data charts retain their own coordinate systems.

## Adding features

Add a focused feature module, compose it from a page/router entry, and place domain helpers beside it. Avoid importing stores into generic icons or charts. The backend settings contract is deliberately browser-safe; do not import server runtime modules into the frontend. Register backend transport behavior through server.ts, http.ts and socket.ts.

## Git commit convention

All new commits must follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/). Use `type(scope): description`; the scope is optional, and an optional `!` immediately before the colon marks a breaking change.

- Use a lowercase type from `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, or `revert`. This type list is the repository's policy. Use `feat` for new behavior and `fix` for bug fixes; use `style` only for formatting changes that do not affect behavior.
- When useful, add a lowercase, kebab-case scope naming the affected area, such as `practice`, `multiplayer`, `a11y`, or `deploy`.
- Write a concise imperative description without a trailing period. Describe the actual change; avoid vague subjects such as "updates", "changes", or "checkpoint".
- Keep independent changes in separate commits. Add a body, separated by a blank line, when the reason or migration details need explanation. Mark breaking changes with `!` or a `BREAKING CHANGE:` footer and explain their impact. For reverts, identify the reverted commit in the body or footer.
- Before every commit, inspect `git diff --cached` and run `git diff --cached --check`. Verify that the proposed message follows these rules. Before pushing, inspect every outgoing commit message, including messages created by squash or merge operations, and correct nonconforming messages only within the authorized history-editing scope.
- Do not rewrite existing history or force-push solely to normalize old messages without explicit authorization. Report historical exceptions with their commit IDs and proposed replacement subjects.

Examples: `feat(practice): add quote length controls`, `fix(ui): remove decorative heading line`, and `docs: clarify deployment setup`.

## Definition of done

Run the full command suite above. Cover changed behavior with meaningful unit/integration tests and browser flows. Verify both themes, keyboard interaction, narrow screens, and no browser errors. Preserve storage keys, Socket.IO events, routes, WPM formulas, and typing semantics unless explicitly fixing a documented bug. Check dynamic references before deletion. Flag uncertain dead code instead of deleting it. Do not commit generated build/test output or credentials. Record known limitations honestly; passing tests do not prove every possible interaction.
