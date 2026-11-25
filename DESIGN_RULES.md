# Tenno Ledger design rules

These rules apply to every screen. They describe a plain, text-first tool. They do not
describe a game-styled marketing site.

## Visual system

- **One typeface:** Inter, at 15px body text and 4-step heading scale. No display face.
- **Flat surfaces:** warm neutrals (charcoal in dark theme, paper in light theme), 1px
  borders at 10–20% opacity, and corner radius of 6–8px. Shadows only on menus and dialogs.
- **One accent:** copper marks the primary action, the active tab, and progress. Brass
  marks mastered items. Red is reserved for errors and destructive actions.
- **No** glow, glassmorphism, gradients, background grids, illustrations, or decorative
  icons. Icons appear only where they name an action.
- **No** count-up or entrance animations. Progress bars transition only when their value
  changes, and all motion is disabled under `prefers-reduced-motion`.

## Layout and content

- Use tables and definition lists for data. Do not use card grids for data.
- Every number has a label and a unit (points, affinity, rank). Totals show their
  sources, and the rows must add up to the total.
- Use sentence-case headings and plain verbs on buttons ("Load pasted text", "Copy link").
  Avoid slogans, superlatives, and exclamation marks.
- Show what is missing as clearly as what is done. Empty states say what to do next.
- Explain limits directly: when the browser cannot fetch a profile, say why and give the
  paste route.

## Accessibility

- Contrast of at least 4.5:1 for text in both themes (checked for body, muted, and accent).
- Visible focus rings on every control, using the accent colour.
- Tables use real `th`, `scope`, and `caption` markup. The virtualised item list uses
  `role="table"`, `row`, `columnheader`, and `cell`.
- Progress bars expose `role="progressbar"` with current values.
- Dialogs use the native `<dialog>` element, which traps focus and closes on Escape.
- Touch targets are at least 40px high. Below `md`, the item list collapses to one
  column and moves rank and points into the item's secondary line.

## Privacy copy

- State where data goes next to every input: "Read in your browser", "Not uploaded".
- Never ask for a cookie other than `gid`. Repeat the warning near the gid instructions.
- Keep the unofficial-project disclaimer in the footer and on the About page.
