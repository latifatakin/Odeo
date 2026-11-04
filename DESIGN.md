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
| `--read-font` | `--odeo-font-body`, `--odeo-font-dyslexic` or `--font-comic` | Reader font choice |
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
- **Reading highlight:** sentence in `--odeo-primary-soft` (kept purple by user decision, 30 Oct 2026) with `--odeo-radius-sm`
  ends; current word in `--odeo-secondary`. The word's text uses `--odeo-on-secondary`,
  which equals `--odeo-text` in light mode and keeps contrast in dark mode, where
  `--odeo-text` is light. Saved notes use `--odeo-secondary-soft`.
- **Fonts** (user decision, 30 Oct 2026, replacing the guide's Comic Sans headings and
  Arial body): headings in Helvetica (`--odeo-font-heading`: Helvetica Neue, Helvetica,
  then Arial on devices without it). Everything else in Atkinson Hyperlegible Next
  (`--odeo-font-body`), self-hosted in `fonts/` (Latin and extended
  Latin, SIL OFL) in regular 400, medium 500 and bold 700. Button text is medium (user
  decision, 30 Oct 2026). It is also the reader's default, shown as "Atkinson Hyperlegible" in
  Reading settings. The "Comic" reading option keeps its own `--font-comic`.
- **Type:** headings in `--odeo-font-heading`, everything else in `--odeo-font-body`.
  Sizes (user decision, 30 Oct 2026): H1 28/36, H2 22/30, H3 20/28, H4 18/26,
  H5–H6 16/24, the same on every screen size. Body and inputs 16/24. Supporting text
  under a page heading (`.lede`, `.page-head p`) 18/28 in the muted grey. 14px minimum.
  Side navigation labels 16px; icons 24px. Reader text keeps its own size setting.
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
- **Purple is only for calls to action** (user rule, 30 Oct 2026). Purple appears on
  primary buttons (`.btn--primary`), the player's play button, the phone bar's + button,
  "Choose a file" in the upload area, the skip link, and the logo. Nothing else.
  Everything that shows "current", "chosen" or "active" uses neutral tones instead:
  `--ui-active` (#ECEAEF light, #352F47 dark) for the current tab, chosen chips, chosen
  voice, tiles and pill buttons; `--odeo-text` for links (always underlined), icons,
  progress fills, switched-on toggles and the focus ring (`--ui-focus`). Text selection
  is `--odeo-border`. When adding UI, reach for these, not `--odeo-primary`. The one
  exception is the reader's sentence highlight, which stays soft purple (user decision).
- **Quiet buttons: grey, purple on hover** (user rule, 30 Oct 2026). Any button that is
  not the main call to action, or not needed to move to the next step, uses
  `--ui-quiet` (`--odeo-text-muted`) and turns `--ui-quiet-hover` (`--odeo-primary`) on
  hover, with a `--ui-active` background: Back, secondary and ghost buttons, icon and
  close buttons, Paste text / Paste link pills, "See all", menu items, and the player's
  skip, voice and speed buttons.
- **Reader** (30 Oct 2026): no rename pencil by the title (rename lives in My library's
  More menu). The page box ends above the floating player; the room for the player is
  padding on `.reader`, not inside `.page-sheet`, so the player never sits on the box
  whatever the font. **Save note** is `position: fixed`, placed just below where the
  selection ends (above that line if there's no room), kept on screen and never over
  the player; it follows the text on scroll.
- **Player** (30 Oct 2026): no title. One row: elapsed time, the track, time left.
  Then voice, back 10s, play, forward 10s, speed. Everything is grey (`--ui-quiet`)
  except the purple play button.
- **Default font:** Atkinson Hyperlegible. Settings saved by the first versions, whose
  default was OpenDyslexic, move to Atkinson; choosing OpenDyslexic now is kept.
- **List rows** (user's reference, 1 Nov 2026), shared by Continue listening on Home and
  My library (`docRowHTML` in `js/covers.js`): a 72px rounded file tile (56px on
  phones), then the title in medium 16px and details in 14px grey (type · minutes ·
  added date, plus % listened and notes in My library), and a thin progress line when
  started. No dividers; a row lifts to `--odeo-surface-raised` with a card shadow on
  hover. The whole row opens the item.
- **File tiles:** the type's icon (PDF, TXT, globe for web links, a document for pasted
  text) over two soft waves at the bottom. Files and links are neutral (`--ui-active`
  with a slightly darker wave); pasted text is light purple (`--odeo-primary-soft` with
  a slightly darker purple wave). No yellow in the library (user decision, 1 Nov 2026);
  search matches are marked in light purple too. The toolbar has 32px of space below it. The Notes page uses the same tile at 48px.
- **Weight marks the current place:** side-nav items are regular
  weight, and only the current page is bold.
- **Notes page** (1 Nov 2026, from the user's spec `notes-page-design.md`, which wins on
  this page): a board of note cards, newest first, 24px gaps; 1 column on phones, 2 on
  tablets, 3 or 4 on desktop.
  - **One colour per document**, given once in the order documents were added and saved
    on the document (`noteColor` 0 to 5, looping): peach, sun, lavender, mint, sky, rose
    (`--note-0` to `--note-5`, light and dark). All text and border pairs were checked
    against Ôdēō's text colours. Text colour never changes between cards.
  - **The document name is always on the card** (16px bold, grey; full name in a tooltip
    and in the spoken label). Colour is never the only clue.
  - **Every card has a 1px `--odeo-border-strong` border** (3:1 on every note colour).
    A tape strip is the only decoration, with no text on it.
  - Note text 18px / 28px in the reading font; comment 16px grey; date 14px grey.
  - **Long notes** fade after 6 lines with a "Show more" / "Show less" button.
  - **Each card is one button**: it plays the note right on the page, with the reader's
    sentence and word highlight and a small player at the bottom. Spoken label: "Note
    from …, saved …: full text. comment. Press to play." 3px focus ring, 2px gap.
  - **More menu** (48px): Play, Go to this part of the document, Copy, Delete. Delete
    asks for confirmation inside the card.
  - **Toolbar matches My library** (user decision, 1 Nov 2026, replacing the spec's
    visible label and chips): the same rounded search bar with a hidden label ("Search
    your notes") and "Search" placeholder, then the three-line filter icon. Its menu lists
    All notes and each document with its colour dot; the chosen one has a check and a
    light purple background, and a dot on the icon shows a filter is on.
  - **Settings → Display → "Color notes by document"** (on by default, saved). Off: cards
    use `--odeo-surface-raised` with the same border.
  - Inside the reader, notes are still a plain list with the quote on
    `--odeo-secondary-soft`.
- **Motion:** sheets rise 8px over 0.24s with ease-out-quart; nothing else animates.

## Deliberate differences from the guide

- **No Add button in the side navigation or rail** (user decision, 27 Oct 2026). Adding
  lives on Home (Paste text, Upload a file), in empty states, and in the phone bar's
  centre button.
- **Settings is an ordinary tab at the bottom of the side navigation** (user decision,
  28 Oct 2026). It looks and behaves like Home, Library and Notes: inactive until you
  are on Settings or Help, then the current-page style. No pop-up; Help lives on the
  Settings page. The rail and phone bar treat it the same way.
- **Filled icon on the current tab** (user decision, 28 Oct 2026). Tabs show the
  outline icon normally and a filled version when current. Hugeicons' solid styles are
  Pro only, so the filled versions (`#i-home-fill`, `#i-library-fill`, `#i-notes-fill`,
  `#i-settings-fill`) are built from the free shapes: the outline filled with
  `currentColor`, inner details drawn with the `.cut` class in the pill colour.
- **All-purple logo in the app, 96px wide** (user decision, 28 Oct 2026). The "deo"
  letters take `--odeo-primary` through `--logo-text`, which differs from the guide's
  "don't recolor" rule. 96px is the guide's minimum; the rail mark is 32px.
- **Page background matches the side navigation in light mode** (user decision,
  28 Oct 2026): `--app-bg` is `--odeo-surface` in light and stays `--odeo-bg` in dark.
- **Light-mode colours changed from the guide** (user decision, 30 Oct 2026):
  `--odeo-surface` #FCFAFF (pages and side navigation), `--odeo-surface-sunken`
  #F2EEF9 to match, `--odeo-text` #090018, `--odeo-text-muted` #4E4E4E. Dark mode
  keeps the guide's values.
- **Home follows the user's reference** (30 Oct 2026): a centred H1 ("Make any text
  accessible with Ôdēō") and supporting line, then one large upload area (light purple, 2px
  dashed border, radius lg, 320px tall; 220px on phones). The whole area is a button that
  opens the file picker, and files can be dropped on it (purple border while dragging).
  Phones say only "Choose a file". Two soft pill buttons sit under it, "Paste text" (T
  icon) and "Paste link" (chain icon), on `--odeo-surface-sunken`, 48px tall, radius
  full, medium 16px, grey text and icon on `--ui-active`; on hover the text turns purple
  on a light purple `--odeo-primary-soft` background (user's reference and decisions,
  30 Oct and 1 Nov 2026). There is no "Pick up where you stopped" line (removed
  1 Nov 2026); Continue listening covers it. Then
  Continue listening (up to five, with See all), all in one 800px centred column. My
  library is no longer on Home (removed 1 Nov 2026). The greeting is
  gone.
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

## Paste link (30 Oct 2026)

- **Page `#/link`:** H1 "Paste a link", a Link field (type url) with the privacy line
  under it, and "Get the text". While fetching, the button reads "Getting the page…"
  and a status line says it can take a few seconds. Then "Check the text" (title and
  text, editable) and Start listening, like Upload a file. PDF links go straight to the
  Upload a file page.
- **Errors** say what to do next and suggest pasting the text when a site needs a login
  or blocks readers. Obvious non-links are caught in the page before anything is sent.
- **Server:** `netlify/functions/article.mjs` at `/api/article` (Readability and
  linkedom, listed in `package.json`). It accepts public http(s) links only, checks
  every redirect, refuses private network addresses, and limits pages to 5 MB and
  10 seconds. Nothing is stored.
- **Library:** saved links show the type word "Web" on the neutral tile.

## My library toolbar (1 Nov 2026, after the user's Speechify reference)

- **One row:** search, a sort button and a filter button, side by side. No "Search" or
  "Sort by" labels on screen (the search field has a hidden label for screen readers
  and "Search" as its placeholder). Search is fully rounded
  (`--odeo-radius-full`), like the Paste text / Paste link pills. Every search field
  (Library, Notes, the Voice picker) shares this style: 8px top and bottom padding, 16px at the
  sides, a hidden label for screen readers and "Search" as the placeholder.
- **Sort button** reads "Sort by" with a down arrow (screen readers also hear the current
  sort). Its menu has "Sort by" (Recents, Date added, Name, each with an icon) and
  "Order" (New to old / Old to new, or A to Z / Z to A for Name). The chosen options
  get a light purple `--odeo-primary-soft` background and a tick. Picking a sort resets the order to its
  natural one (newest first, or A to Z). Sort and order are remembered on the device.
  On phones under 420px the button shows the sort's icon instead of the word.
- **Filter button** is a funnel icon. Its menu: All, Unread (not started yet), Uploads
  (PDF and TXT files), Links. When a filter is on, the funnel gets a small dot, its
  label says which filter. There is no "Showing…" line (removed 1 Nov 2026). The old In
  progress / Not started / Finished chips are gone.
- Both are quiet buttons: grey text with no background fill; light purple background
  and purple text on hover or while open (user decision, 1 Nov 2026). Menus use menu-button keyboard behaviour (arrows,
  Home/End, Escape returns to the button, Tab closes) and `menuitemradio` items.

## No white surfaces (1 Nov 2026, user rule)

- Light mode never uses pure white. Raised surfaces (dropdown menus, the Home upload
  box, a library row on hover, the sidebar toggle) use `--odeo-surface-raised`
  #F6F3FF, a light purple; pages and cards use `--odeo-surface` #FCFAFF.
- Menu items (row More menus, Sort, Filter) get a light purple `--odeo-primary-soft`
  background on hover, keyboard focus and when chosen, with purple text on hover.
- Opening a menu with a mouse or touch moves focus into it without drawing the focus
  ring; opening it from the keyboard shows the ring as usual.

## Responsive checks (1 Nov 2026)

- Every page and sheet is checked at 320, 375, 600, 768, 1024 and 1440px: no sideways
  scrolling and nothing spilling out of its card. The only overhangs are on purpose:
  the round sidebar toggle on the sidebar's edge, and list rows reaching 12px past the
  column on the full sidebar layout so tiles line up with headings (not on tablet or
  phone).
- Menus have a 4px gap between items so two highlighted items never touch.
- The Settings voice row wraps: on narrow screens "Choose voice" moves below the voice.
- The upload box on Home is `clamp(220px, 34vh, 320px)` tall (200px on phones).
- On phones the reader's text box has normal padding; the room for the player is
  below the box, as on larger screens.

## Library empty state (1 Nov 2026, after the user's Speechify reference)

- When the library is empty, or a filter has nothing in it: a centred heading ("Add
  your first file", "Nothing unread", "No uploads yet", "No links yet") with one short
  line, then the same upload prompt as Home (`js/add-box.js`): the large upload area and
  the Paste text / Paste link pills. No "Show everything" button.
- The upload area has a 2px dashed border (`--odeo-border-strong`) on Home and Library
  (user decision). It turns purple on hover and when a file is dragged over it.
- A search with no match shows only "Nothing matches “…”" and "Try another word."


## Settings, Help, navigation and dark mode (1 Nov 2026, user decisions)

- **Settings** (Speechify reference for layout, hierarchy and dropdowns only; Ôdēō's
  colours and hover): sections listed on the left (General, Reading, Listening, Your
  data, Help), the chosen one on the right. Each row: name (18px) and a short grey line
  on the left, the control on the right, a hairline between rows, no boxes. Dropdowns
  are native selects styled as grey pills with a chevron; light purple with purple text
  on hover. The chosen section uses the same purple style as the chosen page. Under
  900px the sections become one sideways-scrolling row of pills; under 600px controls
  drop below their label.
- **Help:** "Back to settings" sits at the top, styled like the reader's Back button.
  Sections have no borders or boxes, just space between them.
- **Chosen page in the navigation:** purple icon and text on light purple
  (`--odeo-primary` on `--odeo-primary-soft`), in the side nav, rail and phone bar. On
  Help, Settings shows as chosen.
- **Home heading** says "Odeo" (plain letters). The logo and other copy keep Ôdēō.
- **Dark mode** (ElevenLabs and Speechify references): neutral blacks and greys
  instead of purple-tinted ones. Page #101010, surface #161616, inputs #1C1C1C, pop-ups
  #1E1E1E with a 1px #2E2E2E edge (`--odeo-popup-border`), text #FAFAFA, grey text
  #A3A3A3, strong border #8A8A8A. Purple stays for calls to action and the chosen
  item. All pairs checked for contrast, including on the note colours.

## Voices: only clear, human-sounding (4 Nov 2026)

User rule: keep only clear, audible, human-like voices. Remove distorted, muffled, inaudible and machine-like ones.

Voices come from each device, so `js/voice-quality.js` rates every voice by its family and `speech.js` only loads the ones that pass:

- **Natural (best, listed first):** names or IDs with Natural, Neural, Premium, Enhanced or Siri (Edge and Windows 11 natural voices, Apple's downloadable voices).
- **Clear:** standard Apple, Google and Android voices (Samantha, Daniel, Google UK English…).
- **Robotic (hidden unless a language has nothing better):** old Windows desktop voices (David, Zira, Mark…), Linux system voices.
- **Never shown:** macOS novelty and old voices (Bad News, Bubbles, Whisper, Zarvox, Albert, Fred, Junior…), the Eloquence voices (Eddy, Flo, Grandma, Grandpa, Reed, Rocko, Sandy, Shelley), and eSpeak, Pico, Festival and Flite.

Repeats of the same voice keep only the best version (an enhanced Samantha hides the compact one). The voice picker says "Only clear, natural-sounding voices are shown." On a Mac in Chrome this goes from 180 voices to 50 (6 in English).
