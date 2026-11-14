# Design system

Clumsy Keys keeps typing at the center: quiet surfaces, clear text, restrained
accents, rounded controls and minimal chrome during an active test. Dark Forest
uses forest neutrals and sage accents. Classic uses a light page, black controls
and an orange typing caret. Preserve the established proportions and hierarchy.

This document describes UI conventions. [CONTRAST.md](docs/CONTRAST.md) records
current measurements and known contrast limitations; it is not a full
accessibility certification.

## Tokens and themes

[`src/styles/tokens.css`](src/styles/tokens.css) is the canonical registry for
palette primitives, semantic theme aliases, typography, precise dimensions,
radii and motion values. Read values there rather than maintaining a second
palette table. Tailwind's legacy color utilities alias that registry; standard
Tailwind spacing/sizing utilities remain available.

| Role | Use |
| --- | --- |
| `--inset` | Page canvas, typing areas and recessed controls. |
| `--surface` | Panels, cards, toolbars and supporting surfaces. |
| `--line` | Borders and separators; not a guarantee of sufficient control-boundary contrast. |
| `--ink`, `--muted` | Primary and secondary text. |
| `--accent`, `--accent-ink`, `--accent-wash` | Selected states, primary actions and their text/backgrounds. |
| `--caret`, `--error` | Typing position and incorrect-input feedback. |
| `--focus-highlight` | App-wide keyboard focus outline. |
| `--profile-avatar-*` | Theme-specific avatar gradient and foreground. |
| `--result-*` | Result surfaces, labels, plots, grids and error markers. |

The two themes define their semantic aliases centrally. Race series and speed
bands select theme-specific palette tokens in their owning presentation. Keep
intentionally distinct chart and feedback colors; reuse existing primitives for
exact duplicates. Never add raw hex/rgb/hsl values to application components.
When a new role is needed, add its authored value and theme mapping centrally.

## Layout and hierarchy

The viewport shell uses flex layout. The shared page container is constrained by
`--dimension-66_625rem` with `--dimension-2rem` total outer gutters. Content can
center between header and footer on tall screens and scroll normally when it
cannot fit. Keep `min-width: 0` on shrinking grid/flex children. Use horizontal
overflow regions for wide result tables instead of widening the page.

`App.svelte` renders the single global footer. Practice/live-race layouts add
only contextual shortcut rows. Preserve footer spacing at the bottom of short
pages and after long content; avoid viewport-height tricks that overlap content.

Current page patterns:

- **Practice:** settings and mode controls lead into the typing area. Active
  tests replace configuration controls with live stats and suppress distracting
  chrome; results bring back explicit replay actions and detailed feedback.
- **About:** a short introduction and understated linked rows fill the parent
  content width. Small icons, descriptions and arrows identify the practice modes.
- **Room access:** an introduction and a clearly labeled join form sit side by
  side when space permits and stack on narrow screens. The two-player preview
  is scripted illustration, not a live room or fabricated player statistics.
- **Account:** sign-in controls and a quiet introduction share the page; the
  signed-in dashboard fills the container. The banner uses accent/caret roles,
  avatars use profile roles, and statistics/bests/recent tests use the shared
  surfaces. Show real loading, empty, failed and retained-snapshot states.
- **Leaderboards:** filters and readable standings frame a horizontally
  scrollable table. Sparse result pages do not reserve unused table-row space.

Pages should compose shared layout and feature presentation. Keep generic icons
and charts free of app/feature stores.

## Typography and geometry

Comfortaa is the app face; Poppins is used for the brand, system UI for small
chart labels, and `--mono` for technical labels and selected metrics. Font imports
live in [`src/styles/app.css`](src/styles/app.css); keep their current loading and
fallback behavior. Do not imply that remote fonts are always available.

Use `--text-*`, `--weight-*`, `--leading-*` and `--tracking-*` for authored
CSS typography, with responsive headings expressed as clamps. Small labels are
for metadata; primary actions need readable text and adequate hit areas.

Reuse `--dimension-*` and `--radius-*` before adding precise dimensions. Preserve
existing exact values rather than rounding them for tidiness. Tailwind spacing
uses its standard scale. Structural zero, fractions, percentages, breakpoints
and SVG drawing coordinates are structural values. Do not introduce decorative
shadows as a substitute for the existing surface/border hierarchy.

## Icons and charts

Named `*Icon.svelte` components live in `src/lib/components/icons` and use the
shared [`Icon.svelte`](src/lib/components/icons/Icon.svelte): a 24-unit viewBox,
inherited `currentColor`, utility sizing, `aria-hidden` and no interaction.
Preserve the glyph silhouette and authored fill/stroke. Logo and data-chart
coordinate systems remain intentional exceptions.

Put accessible names and interaction on the enclosing button or link. For example,
place `<ResetIcon />` inside a button labeled "Restart practice"; do not attach
click handlers or feature state to SVGs.

Charts share the presentational renderer and pure path helper. Retain legends,
labels, dashed variants and error shapes as additional distinctions. Color alone
must not carry the only meaningful distinction. Chart labels and curves must
continue to reflect the existing WPM and timing semantics.

## Focus, keyboard and feedback

The global `:focus-visible` rule in `app.css` uses `--focus-highlight`: sage in
Dark Forest, black in Classic, and white on Classic's black toolbars. The base
layer supplies a rounded fallback while preserving authored control radii.
Forced-color mode uses the system Highlight color. Component CSS may add
supporting feedback but must not replace this global focus indicator.

Icon-prefixed `.focus-field` inputs forward the outline to their enclosing field;
buttons within that field retain their own outlines. The main hidden typing input
and typing surface stay outline-free because the typing caret is their focus cue.
Settings dialogs focus their heading for announcement; that noninteractive
heading suppresses its outline, while dialog buttons retain keyboard highlights.

Tab/Shift+Tab follow document order in prose practice. Code snippets use Tab for
indentation and Shift+Tab to leave the editor. Mobile navigation closes with
Escape and returns focus to its toggle. Preserve existing dialog/dropdown
keyboard navigation and focus return. Errors use text/underlines as well as color.

## Motion and verification

Route/result entry is a short opacity fade using the motion tokens, enabled only
when reduced motion is not requested. The room preview supports pause/resume,
shows a static frame for reduced motion and stops advancing while the document
is hidden. Its animation frame and media/visibility listeners are cleaned up.
Account skeleton motion also respects reduced motion.

Check both themes, narrow screens, keyboard use, loading/error states and reduced
motion after visual changes. Keep known low-contrast cases visible in the
[contrast report](docs/CONTRAST.md), including Classic placeholders/caret/icons
and some shared borders or legacy muted text. A passing browser flow does not
establish WCAG compliance. Update this document when a shared UI pattern changes
and recalculate the report when relevant source colors/backgrounds change.
