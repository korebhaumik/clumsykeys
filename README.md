# Clumsy Keys

A focused typing playground for prose, code, and friendly multiplayer races.

- **Practice your way:** timed tests, word counts, English and Hinglish vocabulary, and complete quotes in three lengths.
- **Type real code:** snippets and keyword practice for Python, JavaScript, TypeScript, Java, C++, and C, with automatic or manual indentation.
- **Race together:** shared rooms, ready votes, live progress, race results, and replay.
- **See your progress:** WPM, accuracy, charts, public solo leaderboards, and optional accounts for saved history and synced preferences.
- **Make it comfortable:** Dark Forest and Classic themes, keyboard controls, and responsive layouts.

Built with Svelte 5, TypeScript, Vite, and Tailwind; multiplayer runs on Express and Socket.IO.

## Run locally

Use Node 22.12+ on the 22 line or Node 24+, and pnpm 12.18.0.

```sh
pnpm install --frozen-lockfile
pnpm dev:server
```

In another terminal, run `pnpm dev`, then open [localhost:5173](http://localhost:5173).
Guest practice and racing work without accounts. For account features, follow the [Supabase setup](docs/SUPABASE.md).

## Explore the project

[Contribute](CONTRIBUTING.md) · [Architecture](ARCHITECTURE.md) · [Design](DESIGN.md) · [Deploy](docs/DEPLOYMENT.md) · [API](docs/api.openapi.json)

Current verification results and known limitations are recorded in the [security](docs/SECURITY_AUDIT.md) and [contrast](docs/CONTRAST.md) reports.
