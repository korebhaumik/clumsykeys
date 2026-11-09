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
- `#/race` opens the lobby or live race. Set the shared race options in the lobby, then vote to start. Settings lock during the race. The results screen offers a replay.

The existing test settings are retained. The imported prose engine uses a fixed passage. Room state is held in server memory and race results are held in the browser session.

## Checks and production builds

```sh
pnpm check
pnpm check:server
pnpm build
pnpm build:server
pnpm start:server
```

The frontend uses port 1440 for the backend on localhost. For separate deployments, set `VITE_SERVER_URL` before building the frontend and set `FRONTEND_ORIGINS` on the backend to a comma-separated list of allowed frontend origins. For same-origin deployments, proxy `/socket.io/` and `/rooms` to the backend. Set `PORT` to override the backend port.

`GET /rooms?roomId=<id>` returns the current roster and metrics. Missing, blank, or repeated IDs return 400. Unknown rooms return 404.

Practice and race results live in their respective feature modules. The obsolete result draft was removed after verifying it was outside the router.

Socket.IO room snapshots include the shared race settings. Connected racers can send an `updateRaceSettings` event with a partial settings object while the room is waiting. Valid changes clear existing votes.

Finished snapshots include each racer’s sampled WPM history and, for racers who completed the passage, their elapsed finish time in `finishSeconds`. Replay keeps the room settings and starts a new history.

## Development standards

See [AGENTS.md](AGENTS.md), [DESIGN.md](DESIGN.md), and [ARCHITECTURE.md](ARCHITECTURE.md). Run `npm run lint`, `npm run audit:dead`, `npm run check:all`, `npm test`, and `npm run test:e2e` before review. Playwright uses installed Google Chrome and starts isolated local servers on ports 4193 and 15442. See [baseline](docs/BASELINE.md) and [refactor report](docs/REFACTOR.md).
