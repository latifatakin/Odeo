---
name: Ôdēō
description: Text becomes listening. The page is the text and the player floats over it.
colors:
  violet: "#5b2ee6"
  violet-hover: "#4a1fd0"
  violet-text: "#4a1fd0"
  violet-soft: "#efeaff"
  on-violet: "#ffffff"
  violet-dark: "#a98bff"
  violet-soft-dark: "#2a2242"
  ink: "#17122b"
  ink-2: "#4a4462"
  ink-3: "#635d7c"
  bg: "#ffffff"
  bg-soft: "#f6f4fb"
  bg-sunk: "#eeebf6"
  line: "#e6e2f0"
  line-strong: "#857e9f"
  bg-dark: "#121019"
  bg-soft-dark: "#1b1825"
  bg-sunk-dark: "#252134"
  ink-dark: "#f2effa"
  danger: "#b42318"
  danger-soft: "#fdecea"
  cover-slate: "#3d4766"
  cover-spruce: "#2e5a5f"
  cover-plum: "#6a3d63"
  cover-moss: "#4f5530"
  cover-clay: "#6e4636"
  page-basic: "#ffffff"
  page-warm: "#f8eedd"
  page-paper: "#ececef"
  sentence: "#e2d8ff"
  word: "#c7b5ff"
  word-line: "#5b2ee6"
  note-mark: "#fff3c4"
  sentence-warm: "#edd5aa"
  word-warm: "#e2bd80"
  note-mark-warm: "#f3dc9c"
  sentence-paper: "#d3cdf0"
  word-paper: "#bfb3f5"
  note-mark-paper: "#f2e4a6"
  sentence-dark: "#2b2347"
  word-dark: "#6a4fd6"
  note-mark-dark: "#4a3d12"
typography:
  display:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "clamp(2rem, 1.4rem + 2.4vw, 3rem)"
    fontWeight: 750
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "clamp(1.6rem, 1.2rem + 1.6vw, 2.4rem)"
    fontWeight: 750
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  body:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "0.88rem"
    fontWeight: 650
    lineHeight: 1.35
  reading:
    fontFamily: "'OpenDyslexic', 'Comic Neue', 'Comic Sans MS', sans-serif"
    fontSize: "20px"
    fontWeight: 400
    lineHeight: 1.8
    letterSpacing: "0.05em"
  cover-title:
    fontFamily: "Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Noto Serif', 'Times New Roman', serif"
    fontSize: "1.15rem"
    fontWeight: 700
    lineHeight: 1.2
rounded:
  sm: "10px"
  md: "14px"
  lg: "20px"
  xl: "28px"
  pill: "999px"
spacing:
  s1: "4px"
  s2: "8px"
  s3: "12px"
  s4: "16px"
  s5: "24px"
  s6: "32px"
  s7: "48px"
  s8: "64px"
  target: "44px"
  measure: "68ch"
components:
  button-primary:
    backgroundColor: "{colors.violet}"
    textColor: "{colors.on-violet}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.violet-hover}"
  button-soft:
    backgroundColor: "{colors.violet-soft}"
    textColor: "{colors.violet-text}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "44px"
  button-ghost:
    backgroundColor: "{colors.bg-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "44px"
  button-ghost-hover:
    backgroundColor: "{colors.bg-sunk}"
  button-lg:
    rounded: "{rounded.pill}"
    padding: "0 32px"
    height: "54px"
  icon-button:
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    size: "44px"
  chip:
    backgroundColor: "{colors.bg-soft}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "40px"
  chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.bg}"
  input:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "44px"
  search:
    backgroundColor: "{colors.bg-soft}"
    rounded: "{rounded.pill}"
    padding: "0 16px 0 48px"
    height: "48px"
  import-tile:
    backgroundColor: "{colors.bg-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "16px"
  cover:
    backgroundColor: "{colors.cover-slate}"
    textColor: "#ffffff"
    typography: "{typography.cover-title}"
    rounded: "{rounded.lg}"
    padding: "12px 12px 16px"
  sheet:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    width: "min(560px, calc(100vw - 32px))"
  player:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "0 16px 12px"
    width: "min(560px, calc(100vw - 24px))"
  play-button:
    backgroundColor: "{colors.violet}"
    textColor: "{colors.on-violet}"
    rounded: "{rounded.pill}"
    size: "64px"
  tabbar-add:
    backgroundColor: "{colors.violet}"
    textColor: "{colors.on-violet}"
    rounded: "{rounded.pill}"
    size: "60px"
  segmented:
    backgroundColor: "{colors.bg-soft}"
    rounded: "{rounded.pill}"
    padding: "4px"
  segmented-selected:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "40px"
  sentence-wash:
    backgroundColor: "{colors.sentence}"
  word-current:
    backgroundColor: "{colors.word}"
    textColor: "{colors.ink}"
  note-marker:
    backgroundColor: "{colors.note-mark}"
---

# Design System: Ôdēō

## Overview

**Creative North Star: "The Page With a Voice"**

The text is the page and the player floats over it. Ôdēō is a near-white reading surface with ink type, one quiet top bar, a centred reading column, and a soft pill player hovering at the bottom centre. Chrome stays out of the way so the reading text, set in whatever face the person chose, holds the screen. The old sidebar dashboard and card-grid app shell are gone. Navigation is a single segmented tab pill on larger screens and a bottom tab bar on phones.

The world is soft and rounded without being cute. Everything you touch is a pill or a generously rounded block (14 to 28px corners). Depth comes from pale tonal steps (white, soft lilac-grey, sunk lilac-grey) plus a few ink-tinted shadows that float the player, sheets, covers and the selected tab. Ôdēō violet is the only colour that does work: play, primary actions, selection, progress, the active tab and the reading highlight. Library covers use a separate low-chroma family so the violet always means "this is the action" or "this is where you are".

Comfort can be adjusted throughout. Reading size, line height, letter spacing (with word spacing tied to it), bold weight, reading face and reading theme (Basic, Warm, Paper, each with a dark variant) are custom properties the person changes, and every reading surface (reader, compose box, preview line, note quotes) reads from them.

**Key Characteristics:**
- Near-white ground (#ffffff) with ink (#17122b); violet as the only working colour.
- Three highlight levels in the reader: sentence wash, current-word chip with underline, pale-yellow saved-note marker.
- System UI sans for chrome; the person's chosen face (OpenDyslexic by default) for all reading text.
- Pills and 14–28px rounded blocks; soft ink-tinted shadows only.
- Floating pill player and bottom sheets on phones; centred or above-player dialogs on larger screens.

## Colors

A near-white, lilac-tinted neutral ladder carries one saturated violet, a muted cover family and three reading highlight tints for each theme.

### Primary
- **Ôdēō Violet** (`violet`): the single action colour. Primary buttons, the play button, the central + on the phone tab bar, the progress fill on the player track and library bars, checked switches, selected speed preset, the voice check, text selection, caret, focus ring (light), the brand mark. In dark mode it lifts to `violet-dark` with dark ink on top (`#140e26`).
- **Pressed Violet** (`violet-hover`): hover state for violet fills. The same value is `violet-text`, used for violet text and icons on light grounds (links, tile icons, soft buttons, stat pill), which keeps them above 4.5:1.
- **Violet Mist** (`violet-soft`): soft-button and stat-pill fill, selected font option and voice row, pressed icon buttons, dropzone hover, new-note flash.

### Secondary
- **Cover Ink Family** (`cover-slate`, `cover-spruce`, `cover-plum`, `cover-moss`, `cover-clay`): low-chroma, dark tints for generated covers and voice avatars, with white text. A stable hash of the item id picks one, so the same item always gets the same colour. The values are identical in light and dark themes.

### Tertiary: reading highlights
- **Sentence Wash** (`sentence`): pale violet behind the whole sentence being spoken, including the gaps between words.
- **Current Word Chip** (`word` with `word-line` underline): a deeper chip on the word being spoken, plus a 2px underline so the current word is not marked by colour alone.
- **Note Marker** (`note-mark`): pale yellow wash on words that belong to a saved note. Also used for `<mark>` search matches.
- Each reading theme retunes all three: Warm uses amber washes on a cream page (`page-warm`) with a brown underline (#6b3f06). Paper uses cool violet washes on a grey page (`page-paper`). The dark themes use deep washes with a white word underline.

### Neutral
- **Ink** (`ink`), **Ink Secondary** (`ink-2`), **Ink Muted** (`ink-3`): headings and body, supporting copy, meta and hints. All pass 4.5:1 on every ground.
- **Ground** (`bg`), **Soft Ground** (`bg-soft`), **Sunk Ground** (`bg-sunk`): page; tiles, tab track, ghost buttons, rows; hover and the unfilled track.
- **Hairline** (`line`): dividers, bar borders, note separators. **Strong Line** (`line-strong`): input borders, outline buttons, the off-state switch track, dashed dropzone (3:1).
- **Danger** (`danger`, `danger-soft`): destructive buttons, field errors and error toasts only.
- Dark mode runs the same ladder from `bg-dark` (#121019) through `bg-soft-dark` and `bg-sunk-dark`, with `ink-dark` text.

### Named Rules
**The One Working Colour Rule.** Violet only marks actions, selection, progress and position. Nothing decorative is violet, and no second accent hue exists.

**The Cover Family Rule.** Covers and avatars only use the five cover inks, never violet. Someone looking at a shelf should not mistake a cover for a button.

**The Three Highlights Rule.** The reader uses exactly three highlight levels: sentence wash, then the word chip with underline, then the yellow note marker. The current-word state always has the underline as well as its colour.

## Typography

**Chrome Font:** system-ui (with -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial)
**Reading Font:** the person's choice. OpenDyslexic is the default, falling back to Comic Neue and then Comic Sans MS. Comic Neue is self-hosted. The other options are the book serif (Georgia, Iowan Old Style, Palatino Linotype, Noto Serif) and the system stack.
**Accent serif:** the book serif stack, on cover titles, cover initials and the "Aa" Appearance control.

**Character:** Chrome is a plain, heavy-weighted system sans that stays out of the way. The reading text is where character lives, and that belongs to the person. "Use reading font everywhere" swaps the chrome font for the reading font across the app.

### Hierarchy
- **Display** (750, clamp(2rem → 3rem), 1.2, -0.025em): Home greeting only.
- **Headline** (750, clamp(1.6rem → 2.4rem), 1.2, -0.02em): document title in the reader. Page h1s use the same weight at clamp(1.75rem → 2.5rem), -0.015em.
- **Title** (700, 1.25rem, 1.2): section and sheet headings (sheets at 1.2rem). h3 at 1.05rem / 650.
- **Body** (400, 1rem, 1.55): chrome copy. Lead paragraphs run 1.08–1.15rem in `ink-2`, capped at 60ch.
- **Label** (650–750, 0.82–0.95rem): tab labels, meta, hints, counts. Numbers use tabular figures throughout (time, speed, counts, progress).
- **Reading** (default 400, 20px, 1.8, 0.05em letter, 0.16em word): reader text, compose box, preview line. Size steps from 14 to 38px. Bold switches the weight to 700. Word spacing is always computed as 0.16em + 3.5 × letter spacing, so words stay clearly apart as letters open up. The column is capped at 68ch.

### Named Rules
**The Person's Face Rule.** Any surface showing text to be read or listened to sets its font family, size, line height, letter and word spacing and weight from the reading variables. It never hard-codes a face.

**The Linked Spacing Rule.** Word spacing is derived from letter spacing (0.16em + 3.5 × letter spacing), never set on its own.

## Layout

- **Shell.** On screens 768px and wider: a sticky 64px top bar laid out as a three-column grid, with the brand on the left, a centred segmented tab pill (Home / Library / Notes) and New + Aa on the right. Below 768px: a 56px top bar with the brand only, and a fixed 72px bottom tab bar with five slots (Home, Library, a central raised + button, Notes, Display). Both bars are translucent (`bg` at 92–94%) with a 14px backdrop blur and a hairline border.
- **Containers.** Pages are capped at 1080px (narrow pages at 760px). Main padding is 32px top, clamp(16px, 4vw, 48px) on the sides and 64px at the bottom. On phones the bottom padding clears the tab bar.
- **Reader.** The reader replaces both app bars with its own sticky bar (back, title fading in on scroll, Aa, notes) tinted to the page colour. The reading column is centred at 68ch. When notes are open, a 360px side panel appears from 1100px (300px between 900 and 1099px). Below 900px it is a floating panel above the player. Bottom padding reserves 168px for the player.
- **Spacing rhythm.** A 4/8/12/16/24/32/48/64px scale. Sections are 48px apart (32px on phones), page heads sit 32px above content, and tiles and rows use 12–16px gaps.
- **Home.** A horizontally scrolling shelf of cover tiles (172px columns, 148px on phones, with scroll snap), plus the import grid with 4 columns (2 below 1024px, 1 below 360px).
- **Targets.** Interactive elements are at least 44px. Layouts reflow down to 320px.
- **Breakpoints in use:** 360, 380, 768, 900, 1024, 1100px.

## Elevation & Depth

Depth comes mostly from tones: white over soft over sunk grounds. Three soft, ink-tinted, two-layer shadows lift the things that float. Shadows never use colour; in dark mode they become plain black at higher opacity.

### Shadow Vocabulary
- **Rest** (`--shadow-sm: 0 1px 2px rgb(23 18 43 / 0.06), 0 2px 8px rgb(23 18 43 / 0.05)`): covers at rest, the selected tab and segment, tile icon wells, stepper buttons.
- **Lift** (`--shadow: 0 2px 6px rgb(23 18 43 / 0.06), 0 12px 32px rgb(23 18 43 / 0.1)`): covers on hover (together with a 3px rise), the docked notes panel, the offline banner.
- **Float** (`--shadow-lg: 0 8px 20px rgb(23 18 43 / 0.08), 0 24px 64px rgb(23 18 43 / 0.16)`): the player, sheets, toasts, the selection pop-up, the floating notes panel.
- **Raised action** (`0 4px 10px rgb(23 18 43 / 0.2)`): the round violet play button and the phone + button.

### Named Rules
**The Soft Float Rule.** Shadows are soft, offset downwards and ink-tinted. No coloured glows, no hard offset shadows, no violet shadows.

## Shapes

Everything is rounded. Buttons, tabs, chips, search fields, selects, switches, toasts, the stat pill and the offline banner are full pills (999px). Icon buttons, the play button and avatars are circles. Blocks use a fixed ladder: 10px (small covers, brand mark, skip link), 14px (inputs, textareas, speed presets, icon wells), 20px (tiles, covers, rows, notes, setting rows, swatches, font options) and 28px (sheets, player, notes panel, compose box, dropzone, empty states, welcome banner). Borders are rare: 1.5px strong lines on inputs and outline buttons, 2px violet borders for selected options, and hairlines only as dividers.

## Components

### Buttons
- **Shape:** full pill (999px), 44px tall. Large is 54px, small is 40px.
- **Primary:** violet fill, white text, weight 700, 24px side padding. Hover moves to pressed violet. Pressing scales to 0.98.
- **Soft:** violet-mist fill with violet text, for secondary actions that are still part of the main path.
- **Ghost / Outline:** soft-ground fill, or transparent with a 1.5px inset strong line. Hover moves one ground step darker.
- **Danger:** a danger fill or danger text, used only for destructive actions.
- **Icon buttons:** 44px circles with 24px stroke icons (2px stroke, round caps), from one inline SVG sprite. When pressed or expanded they take the violet-mist fill.
- **Focus:** 3px focus-colour outline at a 2px offset, with a 2px ground-colour gap ring, on every element.

### Chips
- **Style:** 40px pills on soft ground in `ink-2`, weight 650.
- **State:** selected chips switch to an ink fill with ground-colour text, not violet.

### Cards / Containers
- **Import tiles:** soft ground, 20px radius, 16px padding, 132px minimum height (116px on phones). A 48px white icon well with a violet icon and the rest shadow. The label is 750 weight with a muted hint. Hover sinks one tone and pressing scales to 0.98.
- **Library rows and notes:** 20px rounded rows. Rows are separated by hairlines and fill with soft ground on hover. Notes are soft-ground blocks with a quote set in the reading face at 0.82× size, with violet curly quotes.
- **Empty states:** 28px rounded soft blocks with a 64px icon well.

### Inputs / Fields
- **Style:** white ground, 1.5px strong-line border, 14px radius, 44px minimum height. Labels are bold. Textareas meant for reading use the reading variables.
- **Search:** a 48px pill on soft ground with an inset leading icon. Its border turns violet on focus, and the ground turns white.
- **Focus:** the border turns violet, plus the global focus ring. **Error:** a danger border and bold danger text with an icon.
- **Switch:** a 52 × 32 pill with a 24px white knob. The track is strong-line when off and violet when on.

### Navigation
- **Desktop tabs:** a segmented pill track on soft ground. The current tab is a white pill with the rest shadow and ink text. The others are `ink-2` and sink on hover.
- **Phone tab bar:** five equal slots with 26px icons over 0.75rem labels in `ink-3`. The current slot turns violet text with a heavier stroke. The central + is a 60px violet circle raised 10px above the bar with the raised-action shadow, and it opens the Add sheet.

### Covers (signature)
3:4 tiles in one of the five cover inks with white text and a 20px radius. A small dark-tinted badge shows the source kind (Text, PDF, TXT, Sample). The title is in the book serif, clamped to four lines. A 6px white progress bar runs along the bottom edge. Small covers (64 × 84) show the serif initial instead of the title.

### Reader highlight (signature)
Every word holds its trailing space, so the sentence wash runs continuously, with 0.3em rounded ends and a 0.16em overhang. The current word is a 0.22em-rounded chip, spread by a 0.12em same-colour ring, with a 2px underline in `word-line`. Saved-note words carry the yellow marker. In forced-colours mode, the current word uses Highlight / HighlightText.

### Floating player (signature)
A white 28px-radius block, up to 560px wide, centred 16px above the bottom edge (plus the safe area), with the float shadow. A 4px progress track sits flush on its top edge; the thumb appears only on hover or focus. Under the track: elapsed time, status and remaining time in tabular figures. The controls row: a voice avatar button (52px) on the left, back and forward skip buttons around the 64px violet play button in the centre, and a speed pill (for example "1×") on the right.

### Sheets
Native dialogs with a white ground, 28px radius and the float shadow over an ink backdrop (36%). They have a head, a scrolling body and a footer. On phones they become full-width bottom sheets with only the top corners rounded, a 40 × 5 grab handle, and a slide-up entry. On larger screens they are centred (560px, 440px for confirms, 420px for panels). Player sheets (speed and voice) sit 150px above the bottom, directly above the player, at 460px.

### Appearance controls
Setting rows are soft 20px blocks, at least 56px tall. Steppers use white 44px circular buttons with small and large serif "A" marks. Reading-theme swatches preview each page colour and show a 2px violet border plus a 3px mist ring when selected. A three-way segmented pill picks the theme. Each font option is shown in its own face, and the selected one gets a violet border on violet mist. A live preview line uses the reading variables on the current page colour.

### Toasts
Ink pills (inverted ground) with the float shadow, sitting at the bottom centre above the tab bar on phones. Error toasts use the danger fill.

## Do's and Don'ts

### Do:
- **Do** keep violet (#5b2ee6) for play, primary actions, selection, progress and the active position, and nothing else.
- **Do** set every reading surface from the reading variables (`--read-font`, `--read-size`, `--read-line`, `--read-letter`, `--read-word`, `--read-weight`) and derive word spacing as 0.16em + 3.5 × letter spacing.
- **Do** keep the current word marked by both its chip colour and the 2px underline.
- **Do** use pills for controls and the 10 / 14 / 20 / 28px ladder for blocks.
- **Do** float things with the three ink-tinted shadow tokens; use tonal steps (bg → bg-soft → bg-sunk) for everything else.
- **Do** make sheets bottom sheets below 768px, and centred or above-player dialogs from 768px up.
- **Do** keep every target at least 44px, and keep the 3px focus ring with its ground-colour gap.
- **Do** retune all three highlight levels together for every reading theme and its dark variant.

### Don't:
- **Don't** colour a cover or avatar violet, and don't add a sixth cover tint that competes with the action colour.
- **Don't** add a second accent hue, or use violet decoratively.
- **Don't** use coloured glows, violet shadows or hard offset shadows.
- **Don't** hard-code a font family on text that is read aloud.
- **Don't** bring back a sidebar or a card-grid shell; navigation stays a top tab pill, or the bottom tab bar on phones.
- **Don't** signal the current word, a selection or an error by colour alone.
