// A listening session: player, highlighted text and notes.

import { repo, StorageFullError } from '../storage/repo.js';
import { speech } from '../speech.js';
import { Reader } from '../reader.js';
import { getSettings, updateSettings, settingsEvents, openSettings } from '../settings.js';
import { chunkIndexForWord, minutesFor } from '../text.js';
import { $, $$, esc, icon, announce, toast, confirmDialog, formatDateTime, formatDuration, plural, debounce } from '../ui.js';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const SOURCE_LABEL = { paste: 'Pasted text', pdf: 'PDF', txt: 'TXT file', sample: 'Sample' };

export async function render(main, [id]) {
  const doc = await repo.getDocument(id);
  if (!doc) {
    main.innerHTML = `<div class="page page--narrow">
      <header class="page-head"><h1>Session not found</h1>
      <p>It may have been deleted. You can find everything you’ve saved in <a href="#/library">My library</a>.</p></header></div>`;
    return;
  }

  const settings = getSettings();
  const speeds = SPEEDS.includes(settings.rate) ? SPEEDS : [...SPEEDS, settings.rate].sort((a, b) => a - b);

  main.innerHTML = `
  <div class="page session">
    <header class="session-head">
      <a class="back-link" href="#/library">${icon('arrow-left')}My library</a>
      <div class="title-row" id="title-row">
        <h1 id="session-title">${esc(doc.title)}</h1>
        <button type="button" class="icon-btn" id="rename-btn" aria-label="Rename">${icon('pencil')}</button>
      </div>
      <form class="rename-form" id="rename-form" hidden>
        <label class="sr-only" for="rename-input">Title</label>
        <input id="rename-input" type="text" maxlength="120" autocomplete="off" />
        <button type="submit" class="btn btn--primary">Save</button>
        <button type="button" class="btn btn--ghost" id="rename-cancel">Cancel</button>
      </form>
      <p class="session-meta">
        <span>${esc(SOURCE_LABEL[doc.source?.type] || 'Text')}${doc.source?.pages ? ` · ${plural(doc.source.pages, 'page')}` : ''}</span>
        <span>${plural(doc.wordCount, 'word')}</span>
        <span>Saved on this device</span>
      </p>
    </header>

    ${
      speech.supported
        ? ''
        : `<div class="notice notice--warn" role="note">${icon('volume')}<p>This browser can’t read text aloud. You can still read and take notes. For speech, try the latest Chrome, Edge, Safari or Firefox.</p></div>`
    }

    <div class="session-grid">
      <div class="session-main">
        <section class="player card" id="player" aria-labelledby="player-heading">
          <h2 class="sr-only" id="player-heading">Player</h2>
          <div class="player-row">
            <button type="button" class="play-btn" id="play" ${speech.supported ? '' : 'disabled'}>
              <span class="play-icon">${icon('play')}</span>
              <span class="sr-only" id="play-label">Play</span>
            </button>
            <div class="player-progress">
              <label for="position" class="sr-only">Reading position</label>
              <input type="range" id="position" class="range" min="0" max="${Math.max(0, doc.wordCount - 1)}" step="1" value="0" />
              <div class="player-times">
                <span id="pos-text"></span>
                <span id="time-left"></span>
              </div>
            </div>
          </div>
          <div class="player-controls">
            <button type="button" class="icon-btn icon-btn--outline" id="prev" aria-label="Previous sentence" ${speech.supported ? '' : 'disabled'}>${icon('back')}</button>
            <button type="button" class="icon-btn icon-btn--outline" id="stop" aria-label="Stop and go back to the start" ${speech.supported ? '' : 'disabled'}>${icon('stop')}</button>
            <button type="button" class="icon-btn icon-btn--outline" id="next" aria-label="Next sentence" ${speech.supported ? '' : 'disabled'}>${icon('forward')}</button>
            <div class="speed">
              <label for="speed" class="speed-label">Speed</label>
              <select id="speed">
                ${speeds.map((s) => `<option value="${s}" ${s === settings.rate ? 'selected' : ''}>${s}×</option>`).join('')}
              </select>
            </div>
            <button type="button" class="btn btn--ghost btn--sm" id="open-settings" aria-haspopup="dialog" aria-label="Voice &amp; text">${icon('a11y')}<span class="btn-text">Voice &amp; text</span></button>
          </div>
          <p class="player-status" id="player-status"></p>
        </section>

        <section class="reading card" aria-labelledby="reading-heading">
          <div class="reading-head">
            <h2 id="reading-heading">Text</h2>
            <p class="hint">Click any word to read from there. Select text to save it as a note.</p>
          </div>
          <div class="reading-text" id="reading"></div>
          <div class="selection-pop" id="selection-pop" hidden>
            <button type="button" class="btn btn--primary btn--sm" id="pop-save">${icon('note-plus')}Save as note</button>
          </div>
        </section>
      </div>

      <aside class="notes card" aria-labelledby="notes-heading">
        <div class="notes-head">
          <h2 id="notes-heading">${icon('note')}My notes</h2>
          <span class="notes-count" id="notes-count"></span>
        </div>
        <button type="button" class="btn btn--secondary btn--block" id="add-note">
          ${icon('note-plus')}<span id="add-note-label">Add note from current sentence</span>
        </button>
        <ol class="notes-list" id="notes-list"></ol>
        <div class="notes-empty" id="notes-empty" hidden>
          <div class="empty-icon">${icon('note')}</div>
          <p><strong>No notes yet</strong></p>
          <p>Highlight text in your study material to create notes, or use the button above to save the sentence being read.</p>
        </div>
      </aside>
    </div>
  </div>`;

  // ---------- Setup ----------

  const reader = new Reader($('#reading', main), doc.text);
  reader.autoScroll = settings.autoScroll;
  speech.load(doc.text);

  const total = reader.words.length;
  const playBtn = $('#play', main);
  const position = $('#position', main);
  const posText = $('#pos-text', main);
  const timeLeft = $('#time-left', main);
  const status = $('#player-status', main);
  const player = $('#player', main);

  const progress = await repo.getProgress(doc.id);
  let index = progress && !progress.completed ? Math.min(progress.wordIndex, total - 1) : 0;
  const finishedBefore = !!progress?.completed;
  repo.markOpened(doc.id).catch(() => {});

  // ---------- Progress saving ----------

  let lastSaved = index;
  const saveProgress = (extra = {}) => {
    if (extra.completed === undefined && index === lastSaved) return;
    lastSaved = index;
    repo.saveProgress(doc.id, { wordIndex: index, completed: false, ...extra }).catch(() => {});
  };
  const saveSoon = debounce(saveProgress, 1500);

  // ---------- UI updates ----------

  function updatePosition() {
    const pct = total > 1 ? (index / (total - 1)) * 100 : 0;
    position.value = index;
    position.style.setProperty('--pct', `${pct}%`);
    const text = `Word ${(index + 1).toLocaleString()} of ${total.toLocaleString()}`;
    position.setAttribute('aria-valuetext', `${text}, ${Math.round(pct)}%`);
    posText.textContent = text;
    timeLeft.textContent = `${formatDuration(minutesFor(total - index, getSettings().rate))} left`;
  }

  function updatePlayState(state) {
    const playing = state === 'playing';
    let label = 'Play';
    if (playing) label = 'Pause';
    else if (state === 'ended') label = 'Play again';
    else if (index > 0) label = 'Resume';
    $('#play-label', main).textContent = label;
    playBtn.querySelector('.play-icon').innerHTML = icon(playing ? 'pause' : 'play');
    player.classList.toggle('is-playing', playing);

    if (playing) status.textContent = 'Playing…';
    else if (state === 'ended') status.textContent = 'Finished. Press Play again to start over.';
    else if (state === 'paused') status.textContent = 'Paused.';
    else if (index > 0) status.textContent = `You stopped at word ${(index + 1).toLocaleString()}. Press Resume to continue.`;
    else if (finishedBefore) status.textContent = 'You’ve listened to this before. Press Play to start again.';
    else status.textContent = 'Press Play to start listening.';
  }

  reader.highlight(index);
  updatePosition();
  updatePlayState('idle');
  if (index > 0) speech.seek(index);

  // ---------- Speech events ----------

  const onWord = (e) => {
    index = e.detail.index;
    reader.highlight(index);
    updatePosition();
    if (speech.state === 'playing') saveSoon();
  };
  const onState = (e) => {
    const state = e.detail.state;
    updatePlayState(state);
    if (state === 'paused') {
      saveSoon.flush();
      announce('Paused');
    } else if (state === 'ended') {
      saveProgress({ completed: true });
      announce('Finished reading');
    } else if (state === 'playing') {
      announce('Playing');
    }
  };
  const onError = (e) => toast(e.detail.message, { type: 'error' });

  speech.addEventListener('word', onWord);
  speech.addEventListener('state', onState);
  speech.addEventListener('error', onError);

  // ---------- Controls ----------

  playBtn.addEventListener('click', () => {
    if (speech.state === 'ended') speech.play(0);
    else speech.toggle();
  });
  $('#stop', main).addEventListener('click', () => {
    speech.stop();
    index = 0;
    reader.highlight(0);
    updatePosition();
    updatePlayState('idle');
    saveProgress();
    announce('Stopped. Back at the start.');
  });
  $('#prev', main).addEventListener('click', () => speech.skip(-1));
  $('#next', main).addEventListener('click', () => speech.skip(1));

  // Range input: drag, click, or arrow keys. Only restart speech once the
  // person lets go, so dragging doesn't stutter.
  position.addEventListener('input', () => {
    index = Number(position.value);
    reader.highlight(index);
    updatePosition();
  });
  position.addEventListener('change', () => {
    speech.seek(Number(position.value));
    saveProgress();
  });

  $('#speed', main).addEventListener('change', (e) => updateSettings({ rate: Number(e.target.value) }));
  $('#open-settings', main).addEventListener('click', openSettings);

  const onSettings = (e) => {
    const s = e.detail;
    reader.autoScroll = s.autoScroll;
    const sel = $('#speed', main);
    if (![...sel.options].some((o) => Number(o.value) === s.rate)) {
      sel.insertAdjacentHTML('beforeend', `<option value="${s.rate}">${s.rate}×</option>`);
    }
    sel.value = String(s.rate);
    updatePosition();
  };
  settingsEvents.addEventListener('change', onSettings);

  // Click a word to read from there (but not when selecting text).
  $('#reading', main).addEventListener('click', (e) => {
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) return;
    const i = reader.wordIndexFromNode(e.target);
    if (i === null) return;
    index = i;
    reader.highlight(i);
    updatePosition();
    if (speech.supported) speech.play(i);
  });

  // ---------- Rename ----------

  const titleRow = $('#title-row', main);
  const renameForm = $('#rename-form', main);
  const renameInput = $('#rename-input', main);
  $('#rename-btn', main).addEventListener('click', () => {
    renameInput.value = $('#session-title', main).textContent;
    titleRow.hidden = true;
    renameForm.hidden = false;
    renameInput.focus();
    renameInput.select();
  });
  const closeRename = () => {
    renameForm.hidden = true;
    titleRow.hidden = false;
    $('#rename-btn', main).focus();
  };
  $('#rename-cancel', main).addEventListener('click', closeRename);
  renameInput.addEventListener('keydown', (e) => e.key === 'Escape' && closeRename());
  renameForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const updated = await repo.renameDocument(doc.id, renameInput.value);
    $('#session-title', main).textContent = updated.title;
    document.title = `${updated.title} — Ôdēō`;
    closeRename();
    announce(`Renamed to ${updated.title}`);
  });

  // ---------- Notes ----------

  const list = $('#notes-list', main);
  const empty = $('#notes-empty', main);
  const countEl = $('#notes-count', main);
  const pop = $('#selection-pop', main);
  const addNoteLabel = $('#add-note-label', main);
  let notes = [];
  let selection = null;

  async function loadNotes() {
    notes = await repo.listNotes(doc.id);
    renderNotes();
  }

  function renderNotes() {
    countEl.textContent = plural(notes.length, 'note');
    empty.hidden = notes.length > 0;
    reader.markNotes(notes);

    // Keep existing items (and anything typed in them) where possible.
    const existing = new Map($$('.note', list).map((li) => [li.dataset.id, li]));
    const frag = document.createDocumentFragment();
    notes.forEach((n, i) => {
      let li = existing.get(n.id);
      if (!li) li = noteElement(n);
      li.querySelector('.note-num').textContent = `Note ${i + 1}`;
      frag.append(li);
    });
    list.replaceChildren(frag);
  }

  function noteElement(n) {
    const li = document.createElement('li');
    li.className = 'note';
    li.dataset.id = n.id;
    li.innerHTML = `
      <p class="note-meta"><span class="note-num"></span> · <time datetime="${n.createdAt}">${formatDateTime(n.createdAt)}</time></p>
      <blockquote class="note-quote">${esc(n.quote)}</blockquote>
      <div class="field field--compact">
        <label for="nc-${n.id}">Your thoughts</label>
        <textarea id="nc-${n.id}" rows="2" placeholder="Add a comment (optional)">${esc(n.comment)}</textarea>
        <p class="hint note-saved" aria-hidden="true"></p>
      </div>
      <div class="note-actions">
        <button type="button" class="btn btn--ghost btn--sm" data-act="play">${icon('play')}Play from here</button>
        <button type="button" class="btn btn--ghost btn--sm btn--danger-text" data-act="delete">${icon('trash')}Delete</button>
      </div>`;

    const ta = li.querySelector('textarea');
    const saved = li.querySelector('.note-saved');
    const save = debounce(async () => {
      await repo.updateNote(n.id, { comment: ta.value });
      n.comment = ta.value;
      saved.textContent = 'Saved';
    }, 600);
    ta.addEventListener('input', () => {
      saved.textContent = 'Saving…';
      save();
    });
    ta.addEventListener('blur', () => save.flush());

    li.querySelector('[data-act="play"]').addEventListener('click', () => {
      index = n.startWord;
      reader.highlight(index);
      updatePosition();
      if (speech.supported) speech.play(n.startWord);
    });
    li.querySelector('[data-act="delete"]').addEventListener('click', async () => {
      const ok = await confirmDialog({
        title: 'Delete this note?',
        body: `“${n.quote.length > 80 ? n.quote.slice(0, 80) + '…' : n.quote}” will be removed. This can’t be undone.`,
      });
      if (!ok) return;
      const pos = notes.findIndex((x) => x.id === n.id);
      await repo.deleteNote(n.id);
      notes = notes.filter((x) => x.id !== n.id);
      renderNotes();
      announce('Note deleted');
      // Move focus somewhere sensible.
      const next = $$('.note', list)[Math.min(pos, notes.length - 1)];
      (next?.querySelector('[data-act="play"]') || $('#add-note', main)).focus();
    });
    return li;
  }

  async function createNote(start, end) {
    try {
      const note = await repo.createNote({ documentId: doc.id, quote: reader.quote(start, end), startWord: start, endWord: end });
      notes = [...notes, note].sort((a, b) => a.startWord - b.startWord);
      renderNotes();
      window.getSelection()?.removeAllRanges();
      hidePop();
      announce('Note saved');
      const li = list.querySelector(`[data-id="${note.id}"]`);
      li?.classList.add('is-new');
      li?.scrollIntoView({ block: 'nearest' });
      return li;
    } catch (err) {
      if (err instanceof StorageFullError) toast('Your library is full. Delete some items to save notes.', { type: 'error' });
      else throw err;
    }
  }

  function hidePop() {
    pop.hidden = true;
    selection = null;
    addNoteLabel.textContent = 'Add note from current sentence';
  }

  // Track text selection inside the reading area.
  const onSelection = debounce(() => {
    const r = reader.selectionRange();
    if (!r) return hidePop();
    selection = r;
    addNoteLabel.textContent = 'Save selected text as note';
    const box = $('.reading', main).getBoundingClientRect();
    pop.hidden = false;
    const popW = pop.offsetWidth;
    const left = Math.min(Math.max(8, r.rect.left - box.left + r.rect.width / 2 - popW / 2), box.width - popW - 8);
    pop.style.setProperty('--x', `${left}px`);
    pop.style.setProperty('--y', `${r.rect.bottom - box.top + 8}px`);
  }, 150);
  document.addEventListener('selectionchange', onSelection);

  // Keep the selection when pressing the buttons.
  pop.addEventListener('mousedown', (e) => e.preventDefault());
  $('#add-note', main).addEventListener('mousedown', (e) => selection && e.preventDefault());

  $('#pop-save', main).addEventListener('click', async () => {
    if (!selection) return;
    const li = await createNote(selection.start, selection.end);
    li?.querySelector('textarea')?.focus();
  });

  // Keyboard-friendly way to make a note: saves the selection, or else the
  // sentence currently being read.
  $('#add-note', main).addEventListener('click', async () => {
    let start;
    let end;
    if (selection) ({ start, end } = selection);
    else {
      const c = speech.chunks[chunkIndexForWord(speech.chunks, index)];
      if (!c) return;
      start = c.startWord;
      end = c.endWord;
    }
    const li = await createNote(start, end);
    li?.querySelector('textarea')?.focus();
  });

  await loadNotes();

  const onRepoChange = (e) => {
    if (e.detail.origin === 'remote' && e.detail.collection === 'notes') loadNotes();
  };
  repo.addEventListener('change', onRepoChange);

  // ---------- Sticky player offset (so focused items aren't hidden under it) ----------

  const root = document.documentElement;
  const topbar = $('.topbar');
  const updateOffset = () => {
    const tb = topbar.offsetHeight || 0;
    const sticky = getComputedStyle(player).position === 'sticky';
    root.style.setProperty('--player-top', `${tb}px`);
    root.style.setProperty('--sticky-top', `${tb + (sticky ? player.offsetHeight : 0)}px`);
  };
  const ro = new ResizeObserver(updateOffset);
  ro.observe(player);
  window.addEventListener('resize', updateOffset);
  updateOffset();

  // ---------- Save on leave ----------

  const onHide = () => {
    if (document.visibilityState === 'hidden') saveSoon.flush();
  };
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', saveSoon.flush);

  return () => {
    saveSoon.flush();
    // Detach first so stopping doesn't reset the saved position to the start.
    speech.removeEventListener('word', onWord);
    speech.removeEventListener('state', onState);
    speech.removeEventListener('error', onError);
    speech.stop();
    settingsEvents.removeEventListener('change', onSettings);
    repo.removeEventListener('change', onRepoChange);
    document.removeEventListener('selectionchange', onSelection);
    document.removeEventListener('visibilitychange', onHide);
    window.removeEventListener('pagehide', saveSoon.flush);
    window.removeEventListener('resize', updateOffset);
    ro.disconnect();
    root.style.removeProperty('--sticky-top');
    root.style.removeProperty('--player-top');
  };
}
