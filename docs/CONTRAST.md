# Contrast audit

Last recalculated: **14 November 2026**, from the current `src/styles/tokens.css` values and their uses in `engine.css`, `app.css`, `results.css`, the shared header/footer, and result charts.

## Method and scope

Ratios use WCAG sRGB relative luminance: linearize each channel (`c / 12.92` when `c <= 0.04045`, otherwise `((c + 0.055) / 1.055)^2.4`), calculate `L = 0.2126 R + 0.7152 G + 0.0722 B`, and divide `(Llighter + 0.05) / (Ldarker + 0.05)`. Translucent placeholders are composited in sRGB over their actual inset background before calculating luminance. Rounded ratios are for display; pass/fail uses the unrounded value.

[WCAG 2.2 text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) requires 4.5:1 for normal text and 3:1 for large text. [Non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) uses 3:1 for essential component/state cues and meaningful graphics. A decorative divider does not automatically need that ratio; applicability depends on what identifies the control. Inactive controls and logotypes have specific exceptions.

These are source-color calculations for representative current combinations, not a screenshot-wide WCAG certification. The latest Chrome suite exercises both themes, keyboard focus and narrow layouts; it does not measure every rendered color pair.

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

## Known limitations and remaining work

- Legacy Dark Forest muted text is 4.05:1 on a panel. The same color is 4.85:1 on the page; its acceptability depends on its actual background. Do not label the token itself universally passing or failing.
- Classic gray navigation icons are slightly below 3:1. The orange Classic caret is below 3:1 on the page. Review these essential cues as an explicit visual change; this documentation update does not recolor the interface.
- Shared neutral borders are below 3:1 in both themes. Some are decorative dividers; controls that rely on the boundary for identification need a component-level review. Several room/card borders mix the line token with transparency, which further reduces contrast.
- The brand subtitle is 2.30:1 in Dark Forest (`#475569` on `#151b1d`) and 2.98:1 in Classic (`#8e8e8e` on `#f3f4f6`). Logotypes are exempt under SC 1.4.3, but non-logo informational text using those colors is not.
- Account-avatar gradients, translucent backgrounds, hover/disabled states, colored navigation glyphs, Tailwind-colored credit links, all race series and speed bands, and every chart annotation are not exhaustively measured here. Charts also use legends/labels and dashed variants; those do not establish color-contrast compliance on their own.
- Forced-color rendering, alternate browser engines, real font loading, zoom, focus visibility through every overlay, and assistive-technology behavior need separate verification.

## Maintenance

Recalculate this report whenever palette tokens, theme aliases, opacity, component backgrounds, focus indicators or chart colors change. Record the actual source pair and transparency, keep failing cases visible, and update the reviewed date only after recalculation. `DESIGN.md` describes the semantic roles; this file records measurements and remaining contrast work.
