# Clumsy Keys Official

The official Svelte 5 frontend uses the practice and multiplayer engines from Clumsy Dev. The Express and Socket.IO backend runs as a separate package in the pnpm workspace.

## Local development

Use Node.js 22.12+ on the 22 line or Node.js 24+, and pnpm 12.18.0.

```sh
pnpm install --frozen-lockfile
pnpm dev:server
```

In a second terminal, run `pnpm dev` and open http://localhost:5173.

- `#/` opens prose practice in the official layout.
- `#/game` opens code practice. Select a language and automatic or manual indentation.
- `#/login` joins a multiplayer room. Use two browser profiles with distinct usernames and the same room ID.
- `#/account` creates an account, signs in, or recovers a password using Supabase Auth. Guest practice and rooms remain available.
- `#/history` shows the signed-in account's saved practice sessions and race results.
- `#/race` opens the lobby or live race. Set the shared race options in the lobby, then vote to start. Settings lock during the race. The results screen offers a replay.

The existing test settings and typing calculations are retained. Live rooms remain in server memory. Configured Supabase projects store account preferences, completed solo sessions, and completed or abandoned race rounds.

## Checks and production builds

```sh
pnpm check
pnpm check:server
pnpm build
pnpm build:server
pnpm start:server
```

The frontend uses port 1440 for the backend on localhost. For separate deployments, set `VITE_SERVER_URL` before building the frontend and set `FRONTEND_ORIGINS` on the backend to a comma-separated list of allowed frontend origins. For same-origin deployments, proxy `/socket.io/`, `/rooms`, and `/api/` to the backend. Set `PORT` to override the backend port.

Copy [`.env.example`](.env.example) to root `.env` and fill in the four Supabase runtime values. Both development servers read that file; deployment environment variables take precedence. Follow [Supabase setup](docs/SUPABASE.md) to apply the versioned migrations and configure Auth redirects before using accounts. The runtime API secret does not grant CLI migration access: use `supabase login` or `SUPABASE_ACCESS_TOKEN`; the database password is optional with a temporary login role. Existing guest flows work when Supabase is unconfigured.

`GET /rooms?roomId=<id>` returns the current roster and metrics. Missing, blank, or repeated IDs return 400. Unknown rooms return 404.

The frontend is configured for Vercel through `vercel.json`, with the pinned pnpm install, Vite build, and `dist` output. The multiplayer backend follows the Catan deployment flow: GitHub Actions builds a Docker image, pushes it to Docker Hub, then deploys the successful build's tag to Northflank. Northflank deployment is temporarily disabled; Docker Hub builds and pushes remain active. See [deployment setup](docs/deployment.md) for frontend settings, re-enabling backend deployment, required secrets, service configuration, and rollback. `GET /health` returns `{ "ok": true }` for readiness checks.

Practice and race results live in their respective feature modules. The obsolete result draft was removed after verifying it was outside the router.

Socket.IO room snapshots include the shared race settings. Connected racers can send an `updateRaceSettings` event with a partial settings object while the room is waiting. Valid changes clear existing votes.

Finished snapshots include each racer’s sampled WPM history and, for racers who completed the passage, their elapsed finish time in `finishSeconds`. Replay keeps the room settings and starts a new history.

## Development standards

See [AGENTS.md](AGENTS.md), [DESIGN.md](DESIGN.md), and [ARCHITECTURE.md](ARCHITECTURE.md). Run `npm run lint`, `npm run audit:dead`, `npm run check:all`, `npm test`, and `npm run test:e2e` before review. Playwright uses installed Google Chrome and starts isolated local servers on ports 4193 and 15442. See [baseline](docs/BASELINE.md) and [refactor report](docs/REFACTOR.md).
