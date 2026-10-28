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

- **Navigation:** side navigation on desktop, icon rail on tablet, bottom bar on phone.
  On desktop a small round arrow sits on the sidebar's right edge, on the divider above
  Reading settings and Help. It collapses the side navigation to the rail (the arrow
  flips to point right) and the choice is remembered. The circle is 32px and its tap
  area 48px. `js/theme-boot.js` sets
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

## Quiet surfaces

The app is a tool for long listening sessions, so it keeps visual noise low. On 27 Oct
2026 it was toned down within the brand:

- **One shadow job:** only the Continue listening cards keep `--odeo-shadow-card`, as the
  guide specifies. Floating things (player, sheets, menus, the phone Add button, the
  floating notes panel) use `--odeo-shadow-float`. Everything else is flat on
  `--odeo-surface` with a 1px `--odeo-border` edge: settings groups, add tiles, empty
  states, the reading page and the docked notes panel.
- **Purple stays near 10%:** the Add button, the play button, links, the current nav item
  and progress. The small play dot on each listening card is `--odeo-surface` with a
  `--odeo-primary` icon, not a solid purple circle.
- **Neutral list badges:** file-type tiles in lists use `--odeo-surface-sunken` with
  `--odeo-text-muted`. The tinted tiles (`primary-soft` for files, `secondary-soft` for
  pasted text) stay only on the Continue listening cards.
- **Weight marks the current place:** side-nav items and library titles are regular
  weight, and only the current page is bold.
- **Notes are a list, not cards:** hairline dividers, with the quote on
  `--odeo-secondary-soft`.
- **Motion:** sheets rise 8px over 0.24s with ease-out-quart; nothing else animates.

## Deliberate differences from the guide

- **No Add button in the side navigation or rail** (user decision, 27 Oct 2026). Adding
  lives on Home (Paste text, Upload a file), in empty states, and in the phone bar's
  centre button.
- **One Settings row at the bottom of the side navigation** (user decision, 27 Oct 2026):
  styled like an account row (round icon badge, "Settings", and "Reading, voice, display"
  underneath). It replaces the Settings item, Reading settings and Help. Clicking it opens
  a small menu above the row (beside it in the rail) with "Reading settings" (the
  Settings page) and "Get help" (an email to hello@latifatakinyemi.com). The menu
  uses menu-button keyboard behaviour: arrows, Home/End, Escape returns focus. The phone
  bar keeps its Settings tab.
- **Edge toggle instead of a "Collapse menu" row** (user decision, 27 Oct 2026): a round
  arrow on the sidebar's edge, following the familiar sidebar pattern. Its label switches
  between "Collapse sidebar" and "Expand sidebar".
- **Icons are Hugeicons stroke-rounded** (user decision, 27 Oct 2026) instead of the
  guide's suggested Lucide. They are the free style from `@hugeicons/core-free-icons`
  4.3.5, copied as shapes into the SVG sprite in `index.html` (no package, no font, so
  they work offline and within the security policy). Their 1.5px stroke is dropped so
  the `.icon` rule draws them at the guide's 24px with a 2px rounded stroke. Play and
  pause are filled so the main player button stays solid. Sprite ids (`#i-home`,
  `#i-play` and so on) are unchanged. To add one, search Hugeicons, take the free
  stroke-rounded shape, remove its stroke attributes and add a new `<symbol>`.

- **Comic Neue is self-hosted** (`fonts/`) instead of loaded from Google Fonts, so
  headings work offline and under the site's Content Security Policy.
- **Font chip "Comic"** is labelled without "Sans", because devices without Comic Sans
  (Android, Linux) show Comic Neue.
- **Letter spacing** is an extra reader setting the guide doesn't list. It helps many
  dyslexic readers.
