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

## Definition of done

Run the full command suite above. Cover changed behavior with meaningful unit/integration tests and browser flows. Verify both themes, keyboard interaction, narrow screens, and no browser errors. Preserve storage keys, Socket.IO events, routes, WPM formulas, and typing semantics unless explicitly fixing a documented bug. Check dynamic references before deletion. Flag uncertain dead code instead of deleting it. Do not commit generated build/test output or credentials. Record known limitations honestly; passing tests do not prove every possible interaction.
