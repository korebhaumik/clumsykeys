# Baseline — 2026-11-09

Recorded before source edits, using the installed dependencies and Node v24.11.1.

| Check | Result |
| --- | --- |
| Frontend build (`npm run build`) | Pass; 275 modules; CSS 67.30 kB, JS 294.27 kB |
| Frontend types (`npm run check`) | Pass; 0 errors, 0 warnings |
| Backend build (`npm run build --prefix backend`) | Pass |
| Backend types (`npm run check --prefix backend`) | Pass |
| Lint (`npm run lint`) | Missing script/configuration |
| Unit tests (`npm test`) | Missing script/configuration |
| E2E tests | No checked-in suite |

The folder has no `.git` metadata; no commits can be made. An external source backup was captured at `/private/tmp/clumsy-keys-baseline` before editing. The default pnpm shim attempted to install the pinned version outside the writable workspace. Existing pnpm 12.18.0 at `/private/tmp/clumsy-tools/node_modules/.bin/pnpm` is used for dependency changes.
