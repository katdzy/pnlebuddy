# Design

PNLE Buddy is her study workspace. The page grammar comes from the Notion trackers PNLE reviewees build for
themselves (cover banner, page icon, big title, callouts, colour-coded tags, database rows with checkboxes), made
calm and personal. Product rules in `PRODUCT.md` still bind: no streaks, no guilt, nothing labelled mastered.

## Customisation (all in `src/lib/look.ts`, stored under `pnlebuddy:look`)

| What | Where she changes it |
|---|---|
| Theme: Rosewater (default, the original look), Matcha, Ube, Mango float, Blueberry, Night shift (dark) | Settings, or the swatches at the bottom of the sidebar |
| Heading font: Modern (Bricolage Grotesque), Soft serif (Fraunces), Rounded (Nunito) | Settings |
| Paper colour (9 Notion-style tones) and icon per NP paper | Settings |
| Cover per page and per paper (8 patterns or her own photo) | "Change cover" on the page itself |
| Page and topic icons (emoji) | Tap the icon on the page |
| Motto (callout on Today) | Today or Settings |

Photos live in IndexedDB (`src/lib/media.ts`), downscaled to 1800px JPEG, and are not in backups. Everything else is
exported with the backup as `look`.

## Tokens

- Colour tokens are Tailwind `@theme` variables (`--color-paper`, `surface`, `sunken`, `line`, `ink`, `ink-soft`,
  `ink-muted`, `accent`, `accent-deep`, `accent-ink`, `accent-wash`, `accent-line`, `miss*`). Each theme overrides
  them under `:root[data-theme="…"]`. Never hard-code a hex in a component.
- Tag tones: `--tag-<tone>-bg|fg|solid`, with a dark set under Night shift. Any element with `data-tone="<tone>"`
  exposes `--tone-bg`, `--tone-fg`, `--tone-solid` to its children; `data-tone="accent"` maps to the theme accent.
- `miss` is the soft "not quite" colour. It stays far from each theme's accent (Mango moves it to raspberry) and is
  never red. "Under 60%" and "Needs practice" use it.
- Every text pair passes WCAG AA (4.5:1) in every theme, tag text on tag washes included. Re-check when adding a theme.

## Type

- Body: Atkinson Hyperlegible Next (keeps I/l/1 and 0/O distinct for dosages). Never change this for looks.
- Headings and `.figure` numerals: `--font-display`, set by `data-font`.
- Scale: meta 14 · small 15 · body 17 · lead 20 · title 24 · headline 30 · display 44 (px at default size, all rem).

## Components (`src/app/globals.css`, `src/components/Bits.tsx`, `src/components/look/`)

- `PageHeader`: cover bleeding to the column edges (`.cover-wrap` uses the `.page-main` size container), emoji icon
  half over it, title, optional breadcrumb chip on the cover. Every main page uses it.
- `.tag` / `PaperTag`: select-style tag in a tone. `StatusTag` maps performance to tones.
- `.callout`: emoji plus text on a tone wash. No coloured side borders.
- `.db`: database table with light grid lines; wrap it in `overflow-x-auto` on narrow screens (the table is
  `position: relative` so screen-reader-only labels don't escape the scroller).
- `.props`: Notion-style page properties (label column, value column) on topic pages.
- `Tick`: the checkbox. 44px hit area; ticking fills it in the accent and draws the check like a pen stroke. This is
  the one authored motion moment; theme switches crossfade with a view transition. Both respect reduced motion.
- `Meter` / `.bar`: thin progress bar in a tone, animated with `transform: scaleX`.
- `.sheet`: the one raised panel (Today's next step, quiz builder). `.index-card` for flashcards and notebook entries.

## Layout

- Wide screens (≥1024px, iPad landscape): Notion-style sidebar with page icons, papers as sub-pages, theme swatches.
- Below that: slim top bar; phones also get the bottom tab bar.
- Content column max 64rem; 8px spacing rhythm; more space above a heading than below it.
