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
| `--racer-*` | Shared theme-specific multiplayer series colors. |

The two themes define their semantic aliases centrally. Result/chart and racer
series aliases are available on the theme root so saved-history charts work
without a results-page wrapper. Speed bands select theme-specific palette tokens
in their owning presentation. Keep intentionally distinct chart and feedback
colors; reuse existing primitives for exact duplicates. Never add raw hex/rgb/hsl values to application components.
When a new role is needed, add its authored value and theme mapping centrally.

## Layout and hierarchy

The viewport shell uses flex layout. The shared page container is constrained by
`--dimension-66_625rem` with `--dimension-2rem` total outer gutters. Content can
center between header and footer on tall screens and scroll normally when it
cannot fit. Keep `min-width: 0` on shrinking grid/flex children. Use horizontal
overflow regions for wide result tables instead of widening the page.

`App.svelte` adds no outer top/bottom padding and
renders the single global footer. The desktop footer retains Contact, GitHub,
Security, Terms, Privacy, Support and
the developer credit. At widths up to 40rem, only GitHub, a Support email link
and the developer credit remain. Local Security, Terms and Privacy routes retain the shared page shell and
`src/styles/legal.css`; the header includes a history shortcut. Practice/live-race layouts add
only contextual shortcut rows. Preserve footer spacing at the bottom of short
pages and after long content; avoid viewport-height tricks that overlap content.

Current page patterns:

- **Practice:** first-time guests start with English and a 30-second prose test,
  or Python snippets at medium length with Auto Tabs. Restore validated cached
  settings before generating a passage.
  A signed-in user with no cache sees a practice-settings loading status while
  the first read is pending; cached users can practice during background refresh.
  On screens up to 40rem, idle practice stays vertically centered with compact
  spacing and safe-area insets. Focusing the typing input moves practice beneath
  the header; blurring it restores centering. Other pages use normal document flow.
  Both prose and code show only the Test Settings button above the passage.
  Code mode, language, snippet length, indentation, keyword limits and modifiers
  remain available in the settings dialog.
  Controls use touch-sized targets. Desktop shortcut rows are hidden at this
  width, while settings dialogs retain explicit Back/Close buttons without keycaps.
  Touch devices offer a centered “Double tap here to start playing” overlay
  on the blurred passage instead of autofocus. A double tap focuses the input
  and removes the overlay; a single tap leaves the idle layout in place.
  Keyboard and assistive activation still work with a single activation.
  The label uses the inset background for contrast over blurred letters. The
  typing input uses a 1rem font to avoid iOS focus zoom,
  and visual-viewport changes scroll the passage above the on-screen keyboard
  without fixing the page or preventing ordinary scrolling. Manual snippets
  provide an on-screen Tab action that preserves input focus.
  On touch pointers the caret target updates immediately with a short 50ms
  transform animation for same-line smoothing. Rapid input retargets one active
  animation from its visible position; row changes, scrolling and reduced motion
  snap into place. Desktop movement keeps its existing transition. Keyboard positioning runs on focus, viewport resize and
  passage resize; native viewport panning is not counter-scrolled.
  Wider layouts retain their existing sizing, controls and centering.
  Settings and mode controls lead into the typing area. Active
  tests replace configuration controls with live stats and suppress distracting
  chrome; results bring back explicit replay actions and detailed feedback.
  A strict WPM improvement in the same practice mode, language, test type and
  duration/word count (or quote/snippet length) shows an achievement card from
  the top: an unlocked badge, a trophy
  medallion with small sparkles, a prominent WPM score and an improvement pill.
  It announces the previous best and improvement without taking focus, dismisses after eight seconds
  (remaining available while its dismiss button is focused), and clears on replay
  or navigation. Auto-dismissal and explicit dismissal fade and slide the card
  fully upward before removing it; it stays inert during this exit. Replay and
  navigation still clear it immediately. Dismissal returns focus to the results
  heading. The entrance/exit slide, medal pop and sparkle reveal are disabled
  for reduced motion; the first result
  establishes that category's baseline. The footer names the category, for
  example “English · 30s” or “English 2k · 25 words”.
- **About:** a compact About label sits above the brand title, using the same
  700 weight as other page titles. One short muted line sits beneath the title;
  there are no decorative cards or hero actions.
  Understated linked rows fill the parent content width. Small icons, descriptions and arrows identify the practice modes.
- **Room access:** an introduction and a clearly labeled join form sit side by
  side when space permits and stack on narrow screens. The two-player preview
  is scripted illustration, not a live room or fabricated player statistics.
  The guest explanation and sign-in link appear only after session restoration
  confirms the visitor is signed out.
- **Account:** sign-in controls and a quiet introduction share the page; the
  introduction's mini keyboard uses native buttons with hover and pressed
  feedback only. Its keys accept pointer, Enter and Space activation without
  changing fields, submitting or navigating. The specimen stays hidden on narrow
  layouts, including its Tab stops. The
  signed-in dashboard fills the container. The centered display name opens its editor on double-click; keyboard activation
  with Enter or Space works through its semantic button. Hover adds an accent-wash highlight, accent text and an underline; the tooltip
  explains double-click editing.
  A unique handle appears beneath the name in the accent color once assigned.
  Double-click the handle, or press Enter/Space while focused, to edit it; hover
  adds an accent-wash highlight and underline. Unassigned accounts retain a Choose
  action and labeled form. Display names can be shared; handle conflicts retain the
  draft and explain how to retry. The display-name action opens a labeled inline form with
  Save and Cancel actions and explicit saving/error feedback. The banner uses accent/caret roles,
  avatars use profile roles, and statistics/bests/recent tests use the shared
  surfaces. Show real loading, empty, failed and retained-snapshot states. The Recent tests
  heading and history link share a row, aligned left and right. Recent-test table
  text uses `--text-0_82rem`, keeps cells on one line and scrolls within its region.
- **History:** the practice/multiplayer switch leads directly into filters,
  inline summaries and a striped results table. Results load automatically on
  entry, reload and history-type changes; there is no manual refresh button. The
  page title is available to assistive technology without a visible
  introduction or new-test row. Sortable metric/date headings and
  explicit detail buttons support keyboard use. Overflow stays inside the table
  on narrow screens. Filters, summaries and CSV export describe loaded results;
  loading more extends that set. Returning from details preserves filters, sorting
  and the initiating button’s focus. While inspecting a result, “Back to history”
  sits at the right of the practice/multiplayer row and remains usable during
  loading. Opening a result immediately shows its own skeleton view; errors and
  retry stay there. Returning cancels pending presentation updates.
  Initial loads use summary and five-row table skeletons; pagination appends three placeholder rows and retains saved
  rows on failure. Skeleton motion respects reduced-motion preferences. Saved race
  details show the archived mode, language, active time/word limit and modifier
  switches above the chart, using only field labels and values without an
  introductory heading. Missing archived fields stay explicitly unavailable.
- **Leaderboards:** filters use History’s compact `--text-0_82rem` scale,
  9–11rem desktop widths and wrapping narrow-screen layout. Filters and readable standings frame a horizontally
  scrollable table. Sparse result pages do not reserve unused table-row space. The personal
  rank panel has a 78px minimum height (110px on narrow screens), expanding
  naturally when its contents wrap. Each player cell shows only the unique
  `@handle`, falling back to the display name when unassigned; the “you” marker
  stays inline.

Pages should compose shared layout and feature presentation. Keep generic icons
and charts free of app/feature stores.

## Typography and geometry

Comfortaa is the app face; Poppins is used for the brand, system UI for small
chart labels, and `--mono` for technical labels and selected metrics. Self-hosted WOFF2 faces
are declared in [`src/styles/fonts.css`](src/styles/fonts.css) and imported by
[`src/styles/app.css`](src/styles/app.css). Comfortaa uses variable weights
300–700; the brand uses Poppins 400/500. Preserve Unicode subsets and
`font-display: swap`; HTML preloads the primary Comfortaa Latin subset. Vite fingerprints the
assets for production. Keep the [font licenses and provenance](src/assets/fonts/README.md)
with the files; runtime font loading requires no Google connection.

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
continue to reflect the existing WPM and timing semantics. Reserve the SVG’s
intrinsic height while measuring its container width to avoid resize feedback.

Text selection uses `--accent` as the highlight background and `--accent-ink`
for readable selected text throughout the app. Forced-color mode uses the system
Highlight/HighlightText pair. The Appearance practice preview places its caret
inside “rhythm” on the second line, with preceding text shown as typed.

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

Static panels stay out of the tab order; tabs lead directly to the first control
inside their panel. Shared `scroll-focus.ts` makes table wrappers and the locked
race settings preview tabbable only while they overflow horizontally, updating
after content changes and resizing. These scroll stops retain the global outline
and arrow-key scrolling so hidden columns remain accessible on narrow screens.

Tab/Shift+Tab follow document order in prose practice. Code snippets use Tab for
indentation and Shift+Tab to leave the editor. Mobile navigation closes with
Escape and returns focus to its toggle. Preserve existing dialog/dropdown
keyboard navigation and focus return. Errors use text/underlines as well as color.

Author an explicit `tabindex="0"` on native links, buttons and form controls so
Safari includes them even when its default keyboard navigation skips implicit
Tab stops. Preserve existing `tabindex="-1"` exclusions and roving tab indexes
(such as leaderboard tabs); never add positive tab indexes or make static
content focusable. Disabled, hidden and inert controls remain excluded. The
design audit enforces explicit indexes. Reset/replay buttons retain native
Enter/Space activation and return focus to the fresh typing input.

## Motion and verification

Keep the shared header mounted across navigation, including Appearance and About;
only route content participates in the entrance animation. Practice activity may
hide header controls without replacing the header.

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

## SEO and visual preservation

SEO metadata must not introduce landing screens, explanatory sections, new
controls or hidden marketing content into the application. Preserve the
existing practice-first interface, footer placement, styles and focus order.
Head metadata and crawl files do not change the design system.
