# Ôdēō — accessible text to speech

Ôdēō reads any text, PDF or TXT file aloud and highlights each word as it's read. It's built for people with dyslexia, people with low vision, and anyone who learns better by listening.

Everything runs in the browser. There are no accounts and no server, and text never leaves the device.

## Features

- **Home:** Continue listening covers with progress, Import & listen tiles (Type or paste, Upload a file, From clipboard, Surprise me), samples, and a words-listened count.
- **Reader:** the text is the page. The current sentence gets a soft wash and the current word a stronger chip with an underline, so the highlight doesn't rely on colour alone. Tap any word to listen from there.
- **Floating player:** voice, back 10s, play/pause, forward 10s, and speed, plus a progress line with elapsed and remaining time.
  - **Speed sheet:** − / + stepper, presets from 0.8× to 2.5×, and "Speed up gradually", which adds 0.1× every 600 words.
  - **Voice sheet:** search, a "Works offline" filter, language choice, and recent voices.
- **Appearance (Aa):** text size; Basic, Warm or Paper page colour; light, dark or match device; OpenDyslexic, Comic Sans, Georgia or Standard font; bold text; line and letter spacing; the reading font for menus too; and follow-along scrolling.
- **Notes:** select text and choose "Save as note", or "Save the sentence being read", which works with the keyboard. There's a notes panel in the reader, plus a Notes page with search and "Play from here".
- **Library:** search, filters (In progress, Not started, Finished), sorting, rename, delete and resume.
- **Upload:** PDF (via pdf.js) or TXT, up to 20 MB, with a check-the-text step before listening.
- **Phones:** a bottom tab bar with Home, Library, a central +, Notes and Display (Appearance).
- **Offline:** after the first visit, the app and every saved item work with no connection.

## Run it locally

There's no build step, but it must be served over HTTP; opening the file directly won't work because ES modules and service workers need a server.

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

Offline support is switched off on `localhost` so your edits show up straight away. To test offline mode locally, open http://localhost:8000/?sw instead.

## Deploy to Netlify (free)

**Option A: drag and drop.** Go to https://app.netlify.com/drop and drag this whole folder onto the page.

**Option B: from Git** (deploys automatically on every push):

1. Push this folder to a GitHub repository.
2. In Netlify, choose **Add new site → Import an existing project** and pick the repo.
3. Leave the build command empty and set the publish directory to `.`. `netlify.toml` already sets this, plus the security headers.

**When you deploy changes,** bump `VERSION` in `sw.js` (for example `odeo-v2`). Returning visitors then get the new files instead of their cached copy.

## Files

```
index.html              App shell: top bar, phone tab bar, icon sprite, Add / Appearance / Confirm sheets
sw.js                   Offline caching (bump VERSION on each deploy)
netlify.toml            Netlify config and security headers (CSP)
manifest.webmanifest    Lets people install it as an app
PRODUCT.md              Who it's for and what it must do (design context)
css/
  tokens.css            Colours (light/dark × Basic/Warm/Paper), fonts, spacing
  base.css              Reset, focus, selection, reduced motion, forced colours
  layout.css            Top bar, tabs, phone tab bar
  components.css        Buttons, tiles, covers, library, notes, sheets, Appearance
  reader.css            Reader page, two-level highlight, notes panel, floating player, speed and voice sheets
js/
  main.js               Startup and routes
  router.js             Hash routes; moves focus to each page's heading
  settings.js           Reading preferences and the Appearance sheet
  importers.js          Type / Upload / Clipboard / Sample actions and the + sheet
  player-sheets.js      Speed and Voice sheets
  covers.js             Generated covers, voice avatars, language names
  speech.js             Web Speech engine: chunking, word events, timing fallback, 10s skips
  text.js               Splits text into words and sentences
  reader.js             Word spans, sentence and word highlight, selection for notes
  extract.js            PDF and TXT text extraction
  ui.js                 Announcements, toasts, confirm dialog, formatting
  theme-boot.js         Applies saved theme, page colour and font before first paint
  storage/              repo.js (the only data access) and local-adapter.js
  views/                home, text, file, session (reader), library, notes
fonts/                  OpenDyslexic (SIL Open Font License, see OFL.txt)
vendor/pdfjs/           pdf.js 4.10.38, legacy build (Apache 2.0)
```

## How saved data is structured (ready for sign-in and sync later)

The UI never touches `localStorage` directly; it only calls `repo` (`js/storage/repo.js`). The repo talks to an **adapter** with a small async interface: `getAll`, `get`, `put`, `remove` and `usage`. Today the only adapter is `LocalAdapter`.

Every record carries a sync-ready envelope:

| Field       | Purpose                                                     |
| ----------- | ----------------------------------------------------------- |
| `id`        | UUID created on the device, never reused                    |
| `createdAt` | ISO time                                                    |
| `updatedAt` | ISO time of the last change, used for "last write wins"      |
| `deletedAt` | Set when deleted after syncing has started (a tombstone)    |
| `rev`       | Goes up by 1 on every change                                |
| `deviceId`  | Which device made the last change                           |
| `ownerId`   | `null` until the person signs in                            |
| `schema`    | Record format version, for migrations                       |

Collections:

- `documents`: the title, the text, the source (paste, PDF or TXT) and the word count.
- `progress`: one record per document (same id). It holds the reading position, whether the item is finished, and when it was last opened. It's kept apart from the document so that saving the position every few seconds never re-sends a long text.
- `notes`: the quote, the start and end word, and a comment, linked to a document by `documentId`.
- `settings`: a single `user` record holding the reading preferences.
- `meta`: local only, never synced. It holds `deviceId`, `userId` and `lastSyncedAt`.

Each record is stored under its own key (`odeo:v1:<collection>:<id>`).

### Adding sign-in and sync later

1. Add an auth provider (for example Supabase, Firebase or Clerk) and get a `userId` when the person signs in.
2. Write `js/storage/sync.js`:
   1. Push `repo.changesSince(lastSyncedAt)` to your server.
   2. Pull the server's changes since the same time.
   3. For each record, keep the one with the later `updatedAt`.
   4. Write the merged records through the adapter.
   5. Call `repo.markSynced(now, userId)`.
3. Optionally move to IndexedDB for more space by writing an `IndexedDbAdapter` with the same five methods and passing it to the `Repository`. No UI code needs to change.

Before the first sync, deletes remove data outright. Nobody else needs to know an item existed, and it frees space. After `markSynced` has run once, deletes leave a small tombstone, with no content, so other devices learn about the delete.

## Accessibility (WCAG 2.2 AA)

- **Keyboard:** everything works by keyboard. There's a skip link, focus moves to each new page's heading, and the drawer and dialogs trap focus and return it when they close.
- **Focus visible and not obscured:** focus rings are 3px with a gap. Scroll padding keeps focused items clear of the pinned player and top bar.
- **Contrast:** at least 4.5:1 for text and 3:1 for borders and focus rings, in both themes. Windows High Contrast (forced colours) mode is supported.
- **Target size:** main controls are 44px or more, and nothing is smaller than 24px.
- **Dragging (2.5.7):** the position slider can be clicked or moved with the arrow keys, and files can be picked with a button instead of dragging.
- **Status messages:** these are announced to screen readers ("Playing", "Note saved", search results). Individual words are *not* announced, which would drown out the screen reader.
- **Reflow:** works down to 320px wide with no sideways scrolling, and respects reduced motion.
- **Redundant entry (3.3.7):** unsent text on the Text to Speech page is kept if you move to another page.
- **Automated check:** axe-core reports no violations on any page in either theme.

## Browser notes

- **Voices** come from the device and differ between browsers. Voices marked "online" (for example Chrome's Google voices) need a connection, so when offline the app switches to an on-device voice.
- **Highlighting:** some voices don't report word positions, including Chrome's online voices and many Android voices. For those, Ôdēō estimates timing so the highlight still moves, though it may drift slightly.
- **Downloading audio isn't possible** with the Web Speech API, which is why there's no download button.
- **Scanned PDFs** are images with no text inside, so they need OCR, which isn't included.
- **Storage:** browsers allow about 5 MB of `localStorage` per site. My library shows how much is used.
