# Contributing

Start with [AGENTS.md](AGENTS.md) for repository rules, [ARCHITECTURE.md](ARCHITECTURE.md)
for ownership and data flow, and [DESIGN.md](DESIGN.md) before changing the UI.
Keep each change focused and preserve unrelated work already in the checkout.

## Local setup

Use Node 22.12+ on the 22 line or Node 24+, with pnpm **12.18.0**. Node 24 is
used by the backend Docker image and security CI.

```sh
pnpm install --frozen-lockfile
npm run dev:server
```

In a second terminal, run `npm run dev`. Vite normally serves
[http://localhost:5173](http://localhost:5173); the backend defaults to port 1440.
Guest practice and room joining need no Supabase configuration. For accounts,
copy [`.env.example`](.env.example) to root `.env` and follow
[SUPABASE.md](docs/SUPABASE.md), including all versioned migrations and Auth
redirect setup. Keep public browser variables separate from backend secrets.

For separate frontend/backend hosts, use the settings in
[DEPLOYMENT.md](docs/DEPLOYMENT.md). Production frontend variables are compiled
into the bundle; backend variables are supplied at runtime.

## Implementation

- Pages compose features. Keep domain behavior in its feature, shared presentation
  in components, and app-wide synchronization state in `src/lib/state`.
- Preserve Svelte rune reactivity, effect cleanup, subscriptions, keyboard focus,
  and the intentional DOM typing-engine updates. Keep pure calculations separate
  from DOM and transport handling.
- Use the existing semantic design tokens, shared Icon wrapper, and layouts.
  Check both themes, keyboard interactions, reduced motion, and narrow screens.
- Preserve routes, storage keys, Socket.IO events, typing semantics and the
  four-character WPM formula unless the change explicitly addresses one of them.
- Put content changes in `shared/content`; follow its
  [catalog guide](shared/content/README.md) for IDs, length categories and attribution.
- Cover changed behavior with meaningful tests of observable contracts. Use real
  local HTTP/Socket.IO integration for multiplayer changes. Never automate against
  production rooms. Check dynamic references before deleting code or assets;
  report uncertain cases rather than deleting them.

## Validation

Run the repository checks before review:

```sh
npm run lint
npm run audit:dead
npm run check:all
npm test
npm run test:e2e
npm run build
npm run build:server
```

`check:all` includes frontend/backend types and `check:docs`. The unit suite
starts real ephemeral HTTP/Socket.IO servers; account integration uses a local
Supabase HTTP fixture without hosted credentials. Playwright runs the full suite
in installed Google Chrome and focused keyboard/reset coverage in WebKit.
Install WebKit once with `pnpm exec playwright install webkit`.
It starts the frontend on **4193**, backend on **15442**, and
upstream fixture on **15443**. Run one suite at a time against those ports and
the same output directory. Do not stop an unrelated running server to free a port.
Use `npm run test:e2e -- --project=chrome` or `--project=webkit-keyboard` for a
targeted browser run. WebKit exercises Safari's engine and default Tab behavior;
it does not establish every Safari/macOS accessibility preference combination.

For SQL/RLS or persistence changes, use the real local Supabase stack as well:

```sh
npm run db:start
npm run test:db
npm run test:integration
```

Docker is required for that stack. SQL tests and local integration establish
local behavior, not hosted settings. `test:hosted` is a separate, explicit hosted
write test with disposable users; do not run it as an ordinary local/CI check.
Migration commands also target the configured hosted project; review their
[setup and effects](docs/SUPABASE.md) before applying changes.

State which checks actually ran, their outcomes, and any unverified or failing
cases. Consult [SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md) for the most recently
recorded results and open browser/deployment limitations; do not copy old success
counts into a new report.

## Documentation and review

Update affected root guides and the five maintained files in `docs/` in the same
change as their implementation. Keep the README short and focused on the app;
put contributor details here, structural decisions in `ARCHITECTURE.md`, UI
conventions in `DESIGN.md`, and operating instructions in the relevant `docs/` guide.

For HTTP or Socket.IO changes, update [api.openapi.json](docs/api.openapi.json)
and run `npm run check:docs` plus the independent syntax/example validator
listed in [DEPLOYMENT.md](docs/DEPLOYMENT.md). The local check verifies coverage,
references and links, not full schema/handler equivalence. Recalculate
[CONTRAST.md](docs/CONTRAST.md) after relevant color/background/focus changes.

Use Conventional Commits with a meaningful imperative subject, for example
`fix(multiplayer): preserve racer progress after reconnect`. Follow the complete
[commit rules](AGENTS.md#git-commit-convention), inspect the staged diff and run
`git diff --cached --check` before committing. Keep independent concerns in
separate commits; history rewrites and force pushes need explicit authorization.

Describe the concrete problem, resulting behavior, validation, and remaining
limitations in the review description. Never commit credentials, `.env` files,
generated builds, screenshots/traces from test runs, or local editor state.

## Nonvisual SEO

Keep SEO work in `src/lib/seo/metadata.ts` and `scripts/seo-plugin.ts`. Preserve
all visible UI, app loading, routes and keyboard order. Do not inject marketing
copy, hidden keyword text or bot-specific bodies. `npm run build` includes
`npm run check:seo`; browser regressions verify the original practice flow in
both themes and browsers. See the [indexing workflow](docs/DEPLOYMENT.md#seo-metadata-and-indexing).
