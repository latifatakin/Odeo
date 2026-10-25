# Ôdēō — accessible text to speech

Ôdēō reads any text, PDF or TXT file aloud and highlights each word as it's read. It's built for people with dyslexia, people with low vision, and anyone who learns better by listening.

Everything runs in the browser. There are no accounts and no server, and text never leaves the device.

## Features

- **Text to Speech:** paste or type text, or try a sample.
- **File to Speech:** PDF (via pdf.js) or TXT, up to 20 MB. You can review and edit the extracted text before listening.
- **Word-by-word highlighting:** colour plus a thick underline, so it doesn't rely on colour alone. Click any word to read from there.
- **Player:** play, pause, stop, previous and next sentence, a position slider (it works with the keyboard and by clicking, not only dragging), speed from 0.5× to 2×, and the estimated time left.
- **Reading settings:** OpenDyslexic, Comic Sans or Standard font; text size; line and letter spacing; System, Light or Dark theme; voice; speed. Settings are remembered.
- **Notes:** select text and choose "Save as note", or use "Add note from current sentence", which works with the keyboard alone. You can add your own comments, play from any note, or delete it.
- **My library:** titles, dates, search across titles and text, sorting, rename, delete, and resume from where you stopped.
- **Offline:** after the first visit, the app and every saved item work with no connection. This uses a service worker.

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
index.html              App shell, icon sprite, settings and confirm dialogs
sw.js                   Offline caching
netlify.toml            Netlify config and security headers (CSP)
manifest.webmanifest    Lets people install it as an app
css/
  tokens.css            Colours (light and dark), fonts, spacing
  base.css              Reset, focus styles, reduced motion, forced colours
  layout.css            Sidebar (desktop), rail (tablet), drawer (phone)
  components.css        Buttons, player, notes, library, dialogs
js/
  main.js               Startup, mobile drawer, Recents, offline banner
  router.js             Hash routes; moves focus to each page's heading
  speech.js             Web Speech engine: chunking, word events, timing fallback
  text.js               Splits text into words and sentences
  reader.js             Word spans, highlighting, text selection for notes
  extract.js            PDF and TXT text extraction
  settings.js           Reading settings dialog
  ui.js                 Announcements, toasts, confirm dialog, formatting
  theme-boot.js         Applies the saved theme before the first paint
  storage/
    repo.js             The only code that reads or writes saved data
    local-adapter.js    localStorage implementation
  views/                text, file, session, library pages
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
