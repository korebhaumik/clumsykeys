# Design system

Clumsy Keys uses a quiet typing-first layout: restrained forest neutrals, sage accents, rounded controls, and minimal chrome during typing. Classic retains a light page with black controls and orange caret. Preserve the existing proportions and visual hierarchy.

`src/styles/tokens.css` is the canonical authored value registry. Tailwind provides its standard utility scale; legacy color utilities alias this registry. Semantic roles are `--surface`, `--inset`, `--line`, `--ink`, `--muted`, `--accent`, `--accent-ink`, `--accent-wash`, `--caret`, and `--error`. Their dark/default and Classic selectors are defined centrally. Result plots use `--result-*`; race series and speed-band roles select palette tokens per theme. Exact duplicate colors share one primitive; distinct chart-series and feedback shades remain intentional.

## Palette

| Primitive token | Value |
| --- | --- |
| `--palette-red-500` | `red` |
| `--palette-gray-450` | `#999999` |
| `--palette-forest-950` | `#151b1d` |
| `--palette-forest-900` | `#242a2d` |
| `--palette-slate-600` | `#475569` |
| `--palette-silver-200` | `#dadada` |
| `--palette-stone-500` | `#848887` |
| `--palette-stone-400` | `#a4aaa9` |
| `--palette-sage-300` | `#9bcd86` |
| `--palette-forest-800` | `#343e39` |
| `--palette-teal-200` | `#95dbd3` |
| `--palette-rose-400` | `#ec646d` |
| `--palette-white` | `#ffffff` |
| `--palette-black` | `#000000` |
| `--palette-gray-100` | `#f3f4f6` |
| `--palette-gray-300` | `#d1d5db` |
| `--palette-gray-650` | `#595959` |
| `--palette-gray-200` | `#e5e7eb` |
| `--palette-orange-500` | `#f97316` |
| `--palette-red-700` | `#b91c1c` |
| `--palette-ochre-700` | `#a95406` |
| `--palette-sage-500` | `#87a383` |
| `--palette-violet-400` | `#8385d9` |
| `--palette-gold-500` | `#b2a45f` |
| `--palette-gray-500` | `#8e8e8e` |
| `--palette-gold-300` | `#f8d760` |
| `--palette-stone-450` | `#a1a7a6` |
| `--palette-forest-975` | `#111719` |
| `--palette-amber-400` | `#df9a50` |
| `--palette-rose-200` | `#ec9f9e` |
| `--palette-slate-650` | `#565c62` |
| `--palette-green-800` | `#225e37` |
| `--palette-slate-100` | `#e9ecee` |
| `--palette-slate-200` | `#d5dadd` |
| `--palette-ochre-800` | `#915017` |
| `--palette-red-800` | `#a12128` |
| `--palette-slate-950` | `#171b1e` |
| `--palette-gray-600` | `#666666` |
| `--palette-zinc-400` | `#a1a1aa` |
| `--palette-neutral-800` | `#262626` |
| `--palette-blue-300` | `#77aaf5` |
| `--palette-orange-300` | `#dc925d` |
| `--palette-violet-300` | `#b19bea` |
| `--palette-pink-300` | `#eb8b9e` |
| `--palette-teal-400` | `#5ac5c3` |
| `--palette-blue-700` | `#255da7` |
| `--palette-orange-800` | `#994717` |
| `--palette-violet-700` | `#6948aa` |
| `--palette-pink-700` | `#a2375c` |
| `--palette-teal-800` | `#176d68` |
| `--palette-speed-orange` | `#ed9b4b` |
| `--palette-speed-rose` | `#dfa9a4` |
| `--palette-speed-ivory` | `#f1f2eb` |
| `--palette-speed-sage` | `#cbdcbb` |
| `--palette-speed-orange-dark` | `#984600` |
| `--palette-speed-rose-dark` | `#a23e46` |
| `--palette-speed-neutral-dark` | `#494b4e` |
| `--palette-speed-sage-dark` | `#456939` |

## Typography and geometry

Comfortaa is the existing app face; Poppins is used for the brand, system UI for small chart labels, and `--mono` for technical labels. Keep the existing font loading/fallback behavior. `--text-*`, `--weight-*`, `--leading-*`, and `--tracking-*` preserve the existing scale, with responsive headings expressed as clamps. Use the small text sizes for secondary metadata, not primary actions.

Tailwind spacing follows its quarter-rem scale. `--dimension-*` records precise legacy spacing and layout dimensions; `--radius-*` records corner geometry. Reuse existing tokens. Do not round legacy dimensions merely for tidiness. No new decorative shadows are introduced. Caret and chrome motion use `--motion-*`. Structural zero, fractions, percentages, breakpoint conditions and SVG chart coordinates are not palette values.

## Icons

Named `*Icon.svelte` components live under `src/lib/components/icons`. They use Icon.svelte, a consistent 24-unit viewBox, CSS utility sizing and inherited currentColor. Original silhouettes from other coordinate systems are transformed into that box. Filled and stroked glyphs retain their authored geometry. Logo and chart coordinate systems are intentional exceptions. Icons are decorative; accessible names and clicks belong on buttons/links.

## Examples

Do: `color: var(--accent); padding: var(--dimension-1rem);`.
Do: put `<ResetIcon />` inside a button with `aria-label="Restart practice"`.
Don't: add raw hex/rgb/hsl values, duplicate near-identical colors, attach click handlers to SVGs, or change typing metrics to simplify styling.

## Accessibility

Keyboard focus uses the app-wide `:focus-visible` highlighter in `app.css`, colored by `--focus-highlight`. Dark Forest uses sage; Classic uses black, with white on its black toolbars. Keep component focus styling limited to supporting feedback rather than replacing this indicator. The main typing areas stay outline-free and use the typing caret as their focus cue. Native outlines remain suppressed only for their hidden inputs; forced-color mode uses the system Highlight color on other controls. Tab and Shift+Tab follow document order in prose practice; code practice retains Tab for indentation and Shift+Tab to leave the editor. Mobile navigation closes with Escape and returns focus to its toggle.

Both themes retain distinct text, error, caret and chart roles. Errors also use underlines; chart series include labels and dashed variants. Settings close controls are now keyboard-accessible buttons. Legacy muted/brand colors are preserved, so this refactor does not claim full WCAG compliance; contrast remediation should be reviewed as an explicit visual change.
