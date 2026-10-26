# Ôdēō design system

The design source of truth is the **Odeo brand guide** (`.claude/skills/odeo-brand/SKILL.md`
in the working folder). This file records how the app applies it, and the few decisions
the guide leaves open.

## Tokens

`css/tokens.css` starts with the guide's token block, pasted word for word. Change the
guide first, then paste the block again; don't edit tokens in place. App-only tokens
are built from brand tokens:

| Token | Value | Why |
| --- | --- | --- |
| `--page` | `--odeo-surface` (Cream) or `--odeo-surface-sunken` (Sand) | Reader background choice |
| `--read-font` | `--odeo-font-body`, `--odeo-font-dyslexic` or `--odeo-font-heading` | Reader font choice |
| `--read-size` | 18 to 32px, default 20px | Brand reader style |
| `--read-line` | 1.7 (34px at 20px), 2.0 or 2.4 | Brand reader line height |
| `--read-word` | 0.16em + 3.5 × letter spacing | Word gaps grow faster than letter gaps |
| `--content-left` | 248px, 88px or 0 | Keeps the player and toasts off the navigation |

## Applied rules

- **Navigation:** side navigation on desktop (collapsible to the rail; the choice is
  remembered), icon rail on tablet, bottom bar on phone. `js/theme-boot.js` sets
  `<html data-nav="side|rail|bar">` before first paint. There's no top navigation bar.
- **Reading highlight:** sentence in `--odeo-primary-soft` with `--odeo-radius-sm`
  ends; current word in `--odeo-secondary`. The word's text uses `--odeo-on-secondary`,
  which equals `--odeo-text` in light mode and keeps contrast in dark mode, where
  `--odeo-text` is light. Saved notes use `--odeo-secondary-soft`.
- **Type:** headings in `--odeo-font-heading` at the guide's sizes, with mobile sizes
  under 600px. Everything else in `--odeo-font-body`, 18px body, 14px minimum.
- **Controls:** at least 48px in both directions. Chips are native radio buttons; toggles
  are checkboxes with `role="switch"`. Changes apply right away and save.
- **Sheets:** a bottom sheet with a grab handle on phones, and a centred panel no wider
  than `--odeo-sheet-max` on larger screens.
- **Logo:** the outlined wordmark and mark from the guide, kept as SVG symbols in
  `index.html`. The bubble and bars use `--odeo-primary` and "deo" uses `--odeo-text`,
  which reproduces the primary and on-dark variants exactly. Files for every variant are
  in `assets/`.
- **Keyboard:** Space plays and pauses, and Left and Right skip 10 seconds in the reader
  (not while typing or when a dialog is open).

## Deliberate differences from the guide

- **Comic Neue is self-hosted** (`fonts/`) instead of loaded from Google Fonts, so
  headings work offline and under the site's Content Security Policy.
- **Font chip "Comic"** is labelled without "Sans", because devices without Comic Sans
  (Android, Linux) show Comic Neue.
- **Letter spacing** is an extra reader setting the guide doesn't list. It helps many
  dyslexic readers.
