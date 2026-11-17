# Contrast audit

Last recalculated: **14 November 2026**, from the current `src/styles/tokens.css` values and their uses in `engine.css`, `app.css`, `results.css`, the shared header/footer, and result charts.

## Method and scope

Ratios use WCAG sRGB relative luminance: linearize each channel (`c / 12.92` when `c <= 0.04045`, otherwise `((c + 0.055) / 1.055)^2.4`), calculate `L = 0.2126 R + 0.7152 G + 0.0722 B`, and divide `(Llighter + 0.05) / (Ldarker + 0.05)`. Translucent placeholders are composited in sRGB over their actual inset background before calculating luminance. Rounded ratios are for display; pass/fail uses the unrounded value.

[WCAG 2.2 text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) requires 4.5:1 for normal text and 3:1 for large text. [Non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) uses 3:1 for essential component/state cues and meaningful graphics. A decorative divider does not automatically need that ratio; applicability depends on what identifies the control. Inactive controls and logotypes have specific exceptions.

These are source-color calculations for representative current combinations, not a screenshot-wide WCAG certification. The latest Chrome suite exercises both themes, keyboard focus and narrow layouts; it does not measure every rendered color pair.

## Text selection

Selection pairs were recalculated from source tokens on **15 November 2026**.
The global `::selection` uses `--accent-ink` on `--accent`, including text with
its own foreground color. Dark Forest uses `#151b1d` on `#9bcd86`
(**9.51:1**); Classic uses `#ffffff` on `#000000` (**21.00:1**).
Both pass the normal-text threshold. Forced-color mode delegates to system
Highlight/HighlightText. Earlier measurements and known failures below retain
their recorded scope.

## Personal-best notification and mini keyboard

Recalculated on **16 November 2026** directly from `tokens.css`. The notification
and keyboard reuse existing semantic tokens. Notification text on `--surface`
has ink/muted/accent ratios of **10.40/6.16/7.94:1** in Dark Forest and
**21.00/7.00/21.00:1** in Classic. The achievement-unlocked badge and
hovered/home-key accent text on `--accent-wash` are **6.06:1** and **16.96:1**,
respectively. The trophy medallion, improvement pill and pressed keys use
`--accent-ink` on `--accent`: **9.51:1** and **21.00:1**. Global focus on the
keyboard/notification surface is **7.94:1** and **21.00:1**. All these text/focus
pairs exceed their thresholds; the known neutral-border limitations remain.
Keys also show physical depression while pressed. The medal ring and sparkles
are decorative; the footer separator retains the shared neutral-border role.
Notification entry/exit, medal pop, sparkle reveal and key transitions respect reduced
motion, and the notification does not take focus.

## Mobile double-tap focus overlay

On **17 November 2026**, the narrow-screen focus label moved over the blurred
passage. Its opaque `--inset` backing prevents blurred letters from becoming
its immediate background. Recalculation from `tokens.css` gives `--ink` on
`--inset` at **12.45:1** in Dark Forest (`#dadada` on `#151b1d`) and **19.08:1**
in Classic (`#000000` on `#f3f4f6`). Both pass normal-text contrast. The overlay
uses the existing 3px blur token and changes no palette or focus colors. These
label-source measurements do not certify all pixels in the blurred passage;
all previously recorded failures below remain open.

## Text and primary actions

| Theme | Current use | Foreground / background | Ratio | Normal text (4.5:1) |
| --- | --- | --- | --- | --- |
| Dark Forest | Body / page | `#dadada` / `#151b1d` | 12.45:1 | Pass |
| Dark Forest | Body / panel | `#dadada` / `#242a2d` | 10.40:1 | Pass |
| Dark Forest | Muted / page | `#a4aaa9` / `#151b1d` | 7.38:1 | Pass |
| Dark Forest | Muted / panel | `#a4aaa9` / `#242a2d` | 6.16:1 | Pass |
| Dark Forest | Accent / page | `#9bcd86` / `#151b1d` | 9.51:1 | Pass |
| Dark Forest | Selected label / accent wash | `#9bcd86` / `#343e39` | 6.06:1 | Pass |
| Dark Forest | Primary button text | `#151b1d` / `#9bcd86` | 9.51:1 | Pass |
| Dark Forest | Error / panel | `#ec646d` / `#242a2d` | 4.58:1 | Pass |
| Dark Forest | Pending prose / page; footer credits | `#848887` / `#151b1d` | 4.85:1 | Pass |
| Dark Forest | Legacy muted / panel | `#848887` / `#242a2d` | 4.05:1 | Below threshold |
| Dark Forest | Input placeholder at 75% opacity | `#a4aaa9` / `#151b1d` (75% foreground) | 4.72:1 | Pass |
| Dark Forest | Results metadata / plot | `#a1a7a6` / `#111719` | 7.41:1 | Pass |
| Classic | Body / page | `#000000` / `#f3f4f6` | 19.08:1 | Pass |
| Classic | Body / panel | `#000000` / `#ffffff` | 21.00:1 | Pass |
| Classic | Muted / page | `#595959` / `#f3f4f6` | 6.36:1 | Pass |
| Classic | Muted / panel | `#595959` / `#ffffff` | 7.00:1 | Pass |
| Classic | Primary button text | `#ffffff` / `#000000` | 21.00:1 | Pass |
| Classic | Error / panel | `#b91c1c` / `#ffffff` | 6.47:1 | Pass |
| Classic | Pending prose / page | `#666666` / `#f3f4f6` | 5.22:1 | Pass |
| Classic | Input placeholder at 75% opacity | `#595959` / `#f3f4f6` (75% foreground) | 3.60:1 | Below threshold |
| Classic | Results metadata / plot | `#565c62` / `#e9ecee` | 5.70:1 | Pass |

## Focus, caret, icons and boundaries

On **15 November 2026**, native links/buttons/form controls received explicit
Tab stops for Safari. Focus colors and geometry are unchanged. Fresh source-token
calculation gives Dark Forest page/panel outlines **9.51/7.94:1**, Classic
page/panel **19.08/21.00:1**, and inverted toolbar outlines **21.00:1**.
The known caret/icon/border failures below remain open.

On **15 November 2026**, static panels were removed from sequential keyboard
navigation, and scroll-region stops were limited to horizontal overflow. The
global outline colors, width and offset are unchanged. Recalculation from
`tokens.css` confirms Dark Forest focus on page/panel at **9.51/7.94:1**,
Classic focus on page/panel at **19.08/21.00:1**, and inverted toolbar focus at
**21.00:1**. Existing contrast limitations below remain open.

| Theme | Current use | Foreground / background | Ratio | 3:1 comparison |
| --- | --- | --- | --- | --- |
| Dark Forest | Page keyboard focus / page | `#9bcd86` / `#151b1d` | 9.51:1 | Pass |
| Dark Forest | Typing caret / page | `#95dbd3` / `#151b1d` | 11.07:1 | Pass |
| Dark Forest | Shared border / page | `#475569` / `#151b1d` | 2.30:1 | Below threshold |
| Dark Forest | Shared border / panel | `#475569` / `#242a2d` | 1.92:1 | Below threshold |
| Classic | Page keyboard focus / page | `#000000` / `#f3f4f6` | 19.08:1 | Pass |
| Classic | Inverted toolbar focus / black | `#ffffff` / `#000000` | 21.00:1 | Pass |
| Classic | Typing caret / page | `#f97316` / `#f3f4f6` | 2.55:1 | Below threshold |
| Classic | Unselected navigation icons / page | `#8e8e8e` / `#f3f4f6` | 2.98:1 | Below threshold |
| Classic | Shared border / page | `#d1d5db` / `#f3f4f6` | 1.34:1 | Below threshold |

## History table refresh

Recalculated on **14 November 2026** from `tokens.css` for the history toolbar,
striped results, hover/focus rows and metric/detail actions. Existing
semantic colors are reused without transparency. Values below cover normal text;
the shared border limitations below remain applicable to filter controls.

| Theme | Foreground | Page / stripe / hover background | Ratios |
| --- | --- | --- | --- |
| Dark Forest | Ink `#dadada` | `#151b1d` / `#242a2d` / `#343e39` | 12.45 / 10.40 / 7.93:1 |
| Dark Forest | Muted `#a4aaa9` | Same | 7.38 / 6.16 / 4.70:1 |
| Dark Forest | Accent/focus `#9bcd86` | Same | 9.51 / 7.94 / 6.06:1 |
| Classic | Ink/accent/focus `#000000` | `#f3f4f6` / `#ffffff` / `#e5e7eb` | 19.08 / 21.00 / 16.96:1 |
| Classic | Muted `#595959` | Same | 6.36 / 7.00 / 5.66:1 |

These combinations exceed 4.5:1 for normal text and 3:1 for the global focus
outline. Selected history controls also use an underline or sort arrow; row
striping is decorative. Skeletons reuse the accent-wash surface, pulse only
when reduced motion is not requested, and convey no score values. Their contrast
is decorative; loading status is also announced as text. This is a source-color
check, not full accessibility certification.

History has no visible introductory header or manual refresh control. Existing
text, selected-tab and focus pairs above cover the remaining toolbar.

The archived race settings summary uses the same page foreground pairs,
recalculated on **14 November 2026**: Dark Forest ink/muted on page are
12.45/7.38:1, and Classic ink/muted on page are 19.08/6.36:1. The section has no
new background or interactive controls; its separators are decorative. Result
detail skeletons reuse surface/accent-wash placeholders with no score values;
they are hidden from assistive technology. Their loading status uses the muted
page-text pairs, and animation respects reduced motion. The Back action uses
the existing accent/focus colors on the page.

## Saved multiplayer chart colors

Recalculated on **14 November 2026** after moving result and racer aliases to
the theme root. Archived charts now resolve the same plot, axis, series and
legend colors as the latest race results, including outside `.test-results`.
The existing source colors remain unchanged.

| Theme | Plot | Axis labels / plot | Legend text / page | Six series / plot, in palette order |
| --- | --- | --- | --- | --- |
| Dark Forest | `#111719` | `#a1a7a6`, 7.41:1 | 7.12:1 | 9.88 / 7.63 / 7.16 / 7.54 / 7.51 / 8.80:1 |
| Classic | `#e9ecee` | `#565c62`, 5.70:1 | 6.15:1 | 17.70 / 5.53 / 5.42 / 5.69 / 5.47 / 5.17:1 |

Series order is result accent, blue, orange, violet, pink and teal; canonical
values are in `tokens.css`. All six lines exceed 3:1 against their plot, and
labels/legend text exceed 4.5:1 against these backgrounds. This does not establish
pairwise line distinguishability, every overlap or full chart accessibility.

## Known limitations and remaining work

- Legacy Dark Forest muted text is 4.05:1 on a panel. The same color is 4.85:1 on the page; its acceptability depends on its actual background. Do not label the token itself universally passing or failing.
- Classic gray navigation icons are slightly below 3:1. The orange Classic caret is below 3:1 on the page. Review these essential cues as an explicit visual change; this documentation update does not recolor the interface.
- Shared neutral borders are below 3:1 in both themes. Some are decorative dividers; controls that rely on the boundary for identification need a component-level review. Several room/card borders mix the line token with transparency, which further reduces contrast.
- The brand subtitle is 2.30:1 in Dark Forest (`#475569` on `#151b1d`) and 2.98:1 in Classic (`#8e8e8e` on `#f3f4f6`). Logotypes are exempt under SC 1.4.3, but non-logo informational text using those colors is not.
- Account-avatar gradients, translucent backgrounds, hover/disabled states, colored navigation glyphs, Tailwind-colored credit links, all rendered race overlaps, speed bands, and every chart annotation are not exhaustively measured here. Charts also use legends/labels and dashed variants; those do not establish color-contrast compliance on their own.
- Forced-color rendering, alternate browser engines, real font loading, zoom, focus visibility through every overlay, and assistive-technology behavior need separate verification.

The account display-name editor added on **15 November 2026** reuses page ink,
muted text, error text, inset inputs and existing primary/secondary buttons.
Source-token recalculation gives Classic ink/muted/error on page at
19.08/6.36/5.88:1, Dark Forest accent/focus on page at 9.51:1 and error
on page at 5.48:1. The editable display name uses page ink and the global focus outline; its
previous pencil control has been removed. The unique-handle form uses the same
input, error and action roles. Account and leaderboard handles now use the accent
by default; editable names/handles gain an accent-wash background and underline
on hover. Recalculated on **15 November 2026**, accent on page/hover (also the
selected leaderboard row) is **9.51/6.06:1** in Dark Forest and
**19.08/16.96:1** in Classic. These pairs pass normal-text contrast. No new palette or
background was added; existing control-boundary limitations remain applicable.

## Multiplayer termination controls

Recalculated from `tokens.css` on **18 November 2026**. Live Leave race/End race
actions reuse secondary buttons; the confirmation dialog reuses the shared
panel, primary button and global focus indicator. No palette values changed.

| Theme | Dialog text / panel | Secondary text / inset | Primary text / accent | Focus / panel | Focus / page | Host label / page |
| --- | --- | --- | --- | --- | --- | --- |
| Dark Forest | 10.40:1 | 12.45:1 | 9.51:1 | 7.94:1 | 9.51:1 | 7.38:1 |
| Classic | 21.00:1 | 19.08:1 | 21.00:1 | 21.00:1 | 19.08:1 | 6.36:1 |

These source pairs pass their text/focus thresholds. Existing neutral-border,
disabled/hover-state and broader accessibility limitations above still apply.
In the live race shortcut row, the Host label uses page-muted text (7.38:1 in
Dark Forest and 6.36:1 in Classic). The host name uses page ink (12.45:1 and
19.08:1, respectively). The badge border is decorative. Mobile leave and stop
icons use the secondary button's existing ink and inset pair.

## Maintenance

Recalculate this report whenever palette tokens, theme aliases, opacity, component backgrounds, focus indicators or chart colors change. Record the actual source pair and transparency, keep failing cases visible, and update the reviewed date only after recalculation. `DESIGN.md` describes the semantic roles; this file records measurements and remaining contrast work.
