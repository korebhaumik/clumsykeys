# Contributing

Read AGENTS.md for setup, commands and architecture rules, and DESIGN.md for UI conventions. Make one concern per commit when working in a Git checkout. Record baseline checks before refactors. Add tests for externally observable contracts rather than reproducing implementation details.

Before review, run lint, dead-code audit, both type checks, unit/integration tests, Playwright and both builds. Explain behavior changes and any unverified cases. Use real local Socket.IO integration for multiplayer changes. Never use production rooms for automated tests.
