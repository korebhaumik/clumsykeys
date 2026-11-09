# Refactor report — 2026-11-09

## Cleanup and structure

See REMOVED.md for the deleted file inventory. Removed unused prototype settings/results/typing screens, 14 unused SVG components, unreferenced raster and SVG assets, ambient draft types, stale commented code, unused imports/exports and the unused tslib development dependency. ConfigIcon was also removed after its unused modal import was deleted. Tailwind remains required by the CSS import (explicitly documented in Knip configuration).

Moved runtime code into practice, settings and multiplayer features, app state, and shared layout/chart/icon modules. Extracted code options and snippet parsing, replaced repeated settings modal headers with an explicit panel map, and separated HTTP/Socket.IO transport registration from server startup. Direct imports keep interfaces explicit.

## Design and SVG

Centralized authored color values and exact CSS dimensions, typography, radius and motion values in styles/tokens.css. Removed the duplicate JavaScript Tailwind theme configuration in favor of Tailwind 4 CSS token aliases. Exact color duplicates share primitives; intentionally distinct result/series colors remain. Named SVG components use a common 24-unit wrapper with coordinate transforms preserving their silhouettes, inherited colors and original rendered sizes. Logo and charts retain their intentional coordinate systems. Inline indent/sign-out glyphs moved into the icon directory.

User-facing fix: settings close icons now sit inside labeled keyboard-accessible buttons. Wrench icons are presentational inside their existing controls, with descriptive button labels. No typing, WPM, routing, room recovery or race rules were intentionally changed.

## Verification

Baseline: both type checks and builds passed; no repository lint, unit or E2E suite existed. After refactor: both type checks and builds pass, frontend has zero diagnostic warnings, ESLint/design audit pass, Knip reports no unused items, 7 unit/integration tests pass, and 7 Playwright tests pass. Browser coverage includes both themes, prose correction/results/replay, all six code languages with both indentation modes, settings, saved themes, mobile navigation and widths 390/768/1440, plus two-player join/vote/race/reload recovery/results/replay. Integration tests use real local HTTP and Socket.IO; no live production service or mock was used.

Screenshot comparisons cover six routes in each theme with fonts blocked consistently. They caught a wrapper sizing regression which was corrected. Baseline screenshots and source backup remain under /private/tmp/clumsy-keys-baseline; final screenshots under /private/tmp/clumsy-keys-after.

## Deliberate limits and retained material

- No Git metadata exists in this folder, so commits were not possible.
- The root reference screenshot SVG is retained: its role as design source material is ambiguous. It is outside runtime styling and the color audit.
- The referenced Vite favicon and existing document title remain unchanged, since branding replacement was outside behavior-preserving cleanup.
- Larger stateful race keyboard/lifecycle modules remain cohesive rather than being mechanically split across files.
- Structural SVG coordinates, calculated DOM positions, media-query thresholds, Tailwind standard scales and some JavaScript transition parameters remain literal. The token migration covers authored CSS values, not every numeric value in the program.
- Contrast was measured in CONTRAST.md. Legacy muted and brand text has below-threshold cases; these are flagged rather than silently recolored. Full WCAG remediation remains outstanding.
- Browser coverage is Chrome only. Google font availability, other engines, every snippet variant, disconnect expiry and all possible state combinations are not exhaustively covered.
- The new scripts and documentation make further work repeatable; passing checks establish the tested contracts, not a proof of zero regressions.

Final screenshot comparison: all 12 route/theme captures reported 0.000% differing pixels at a per-channel tolerance of 10/255 after the icon size correction. Captures were 1440×900 with deterministic snippets and remote fonts blocked.
