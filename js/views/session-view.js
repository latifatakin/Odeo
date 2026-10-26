// The reader: one column on the page surface, with the player bar floating below.

import { repo, StorageFullError } from '../storage/repo.js';
import { speech } from '../speech.js';
import { Reader } from '../reader.js';
import { navigate, previousHash } from '../router.js';
import { getSettings, updateSettings, settingsEvents, MAX_RATE } from '../settings.js';
import { chunkIndexForWord, minutesFor } from '../text.js';
import { openSpeedSheet, openVoiceSheet } from '../player-sheets.js';
import { avatarHTML, kindLabel, voiceShortName } from '../covers.js';
import { $, $$, esc, icon, announce, toast, confirmDialog, formatDateTime, formatDuration, plural, debounce } from '../ui.js';

const NOTES_KEY = 'odeo:notes-open';
const AUTO_SPEED_EVERY = 600;

export async function render(main, [id, startAt]) {
  const doc = await repo.getDocument(id);
  if (!doc) {
    main.innerHTML = `<div class="page page--narrow"><div class="empty">
      ${icon('search')}
      <h1 class="h3">We couldn’t find that one</h1>
      <p>It may have been deleted. Everything you’ve saved is in My library.</p>
      <div class="empty-actions"><a class="btn btn--primary" href="#/library">Open My library</a></div>
    </div></div>`;
    return;
  }

  let notesOpen = false;
  try {
    notesOpen = localStorage.getItem(NOTES_KEY) === '1';
  } catch {}

  main.innerHTML = `
  <div class="reader${notesOpen ? ' notes-open' : ''}" id="reader">
    <div class="reader-top">
      <button type="button" class="back-link btn--ghost" id="back">${icon('chevron-left')}Back</button>
      <div class="reader-top-actions">
        <button type="button" class="icon-btn" id="notes-toggle" aria-expanded="${notesOpen}" aria-controls="notes-panel" aria-label="Notes">${icon('notes')}</button>
        <button type="button" class="icon-btn reading-open" aria-haspopup="dialog" aria-label="Reading settings">${icon('text-size')}</button>
      </div>
    </div>

    <div class="reader-body">
      <article class="page-sheet" aria-labelledby="doc-title">
        <header class="doc-head">
          <div class="doc-title-row" id="title-row">
            <h1 class="h3" id="doc-title">${esc(doc.title)}</h1>
            <button type="button" class="icon-btn" id="rename-btn" aria-label="Rename">${icon('pencil')}</button>
          </div>
          <form class="rename-form" id="rename-form" hidden>
            <label class="sr-only" for="rename-input">Title</label>
            <input id="rename-input" class="input" type="text" maxlength="120" autocomplete="off" />
            <button type="submit" class="btn btn--primary">Save</button>
            <button type="button" class="btn btn--secondary" id="rename-cancel">Cancel</button>
          </form>
          <p class="doc-meta">${esc(kindLabel(doc))}${doc.source?.pages ? ` · ${plural(doc.source.pages, 'page')}` : ''} · ${plural(doc.wordCount, 'word')} · <span id="doc-duration"></span></p>
          <p class="helper">Tap any word to listen from there. Select text to save a note.</p>
        </header>
        ${
          speech.supported
            ? ''
            : `<div class="notice" role="note">${icon('alert')}<p><strong>Speech isn’t available.</strong> You can still read and save notes. For listening, try the latest Chrome, Edge, Safari or Firefox.</p></div>`
        }
        <div class="reading-text" id="reading"></div>
        <div class="selection-pop" id="selection-pop" hidden>
          <button type="button" class="btn btn--secondary" id="pop-save">${icon('note-plus')}Save note</button>
        </div>
      </article>

      <aside class="notes-panel" id="notes-panel" aria-labelledby="notes-heading">
        <div class="notes-panel-head">
          <h2 class="h5" id="notes-heading" tabindex="-1">Notes <span class="caption" id="notes-count"></span></h2>
          <button type="button" class="close-btn" id="notes-close" aria-label="Close notes">${icon('x')}</button>
        </div>
        <button type="button" class="btn btn--secondary btn--block" id="add-note">${icon('note-plus')}<span id="add-note-label">Save this sentence</span></button>
        <ol class="notes-list" id="notes-list"></ol>
        <div class="notes-empty" id="notes-empty" hidden>
          <strong>No notes yet</strong>
          <p>Select any text while you listen, then choose Save note.</p>
        </div>
      </aside>
    </div>
  </div>

  <section class="player" id="player" aria-labelledby="player-title">
    <div class="player-head">
      <h2 class="player-title" id="player-title">${esc(doc.title)}</h2>
      <p class="player-time"><span id="elapsed">0:00</span> · <span id="remaining"></span> left</p>
    </div>
    <div class="player-track">
      <label for="position" class="sr-only">Position</label>
      <input type="range" id="position" class="range" min="0" max="${Math.max(0, doc.wordCount - 1)}" step="1" value="0" />
    </div>
    <div class="player-controls">
      <button type="button" class="voice-btn" id="voice-btn" aria-haspopup="dialog"></button>
      <button type="button" class="icon-btn skip-btn" id="back10" aria-label="Back 10 seconds" ${speech.supported ? '' : 'disabled'}>${icon('back10')}</button>
      <button type="button" class="play-btn" id="play" aria-label="Play" ${speech.supported ? '' : 'disabled'}>${icon('play')}</button>
      <button type="button" class="icon-btn skip-btn" id="fwd10" aria-label="Forward 10 seconds" ${speech.supported ? '' : 'disabled'}>${icon('fwd10')}</button>
      <button type="button" class="speed-btn" id="speed-btn" aria-haspopup="dialog"></button>
    </div>
    <p class="sr-only" id="player-status" role="status"></p>
  </section>`;

  const root = $('#reader', main);
  const reader = new Reader($('#reading', main), doc.text);
  reader.autoScroll = getSettings().autoScroll;
  speech.load(doc.text);

  const total = reader.words.length;
  const playBtn = $('#play', main);
  const position = $('#position', main);
  const player = $('#player', main);

  const progress = await repo.getProgress(doc.id);
  const jump = startAt !== undefined && !Number.isNaN(Number(startAt)) ? Math.min(Number(startAt), total - 1) : null;
  let index = jump ?? (progress && !progress.completed ? Math.min(progress.wordIndex, total - 1) : 0);
  repo.markOpened(doc.id).catch(() => {});

  // ---------- Progress ----------
  let lastSaved = index;
  const saveProgress = (extra = {}) => {
    if (extra.completed === undefined && index === lastSaved) return;
    lastSaved = index;
    repo.saveProgress(doc.id, { wordIndex: index, completed: false, ...extra }).catch(() => {});
  };
  const saveSoon = debounce(saveProgress, 1500);

  // ---------- UI ----------
  function updateVoice() {
    const v = speech.currentVoice();
    const btn = $('#voice-btn', main);
    btn.innerHTML = avatarHTML(v);
    btn.setAttribute('aria-label', v ? `Voice: ${voiceShortName(v)}` : 'Voice');
  }
  function updateSpeed() {
    const r = getSettings().rate;
    const btn = $('#speed-btn', main);
    btn.textContent = `${r.toFixed(1)}×`;
    btn.setAttribute('aria-label', `Speed ${r.toFixed(1)}×`);
    $('#doc-duration', main).textContent = `${Math.max(1, Math.round(minutesFor(total, r)))} min listen`;
  }
  function updatePosition() {
    const rate = getSettings().rate;
    const pct = total > 1 ? (index / (total - 1)) * 100 : 0;
    position.value = index;
    position.style.setProperty('--pct', `${pct}%`);
    position.setAttribute('aria-valuetext', `Word ${(index + 1).toLocaleString()} of ${total.toLocaleString()}`);
    $('#elapsed', main).textContent = formatDuration(minutesFor(index, rate));
    $('#remaining', main).textContent = formatDuration(minutesFor(total - index, rate));
    const c = speech.chunks[chunkIndexForWord(speech.chunks, index)];
    if (c) reader.markSentence(c.startWord, c.endWord);
  }
  function updatePlayState(state) {
    const playing = state === 'playing';
    playBtn.setAttribute('aria-label', playing ? 'Pause' : state === 'ended' ? 'Play again' : 'Play');
    playBtn.innerHTML = icon(playing ? 'pause' : 'play');
  }

  reader.highlight(index);
  updateVoice();
  updateSpeed();
  updatePosition();
  updatePlayState('idle');
  if (index > 0) speech.seek(index);
  if (index > 0) requestAnimationFrame(() => reader.spans[index]?.scrollIntoView({ block: 'center' }));

  // ---------- Speech events ----------
  let autoMark = index;
  const onWord = (e) => {
    index = e.detail.index;
    reader.highlight(index);
    updatePosition();
    if (speech.state !== 'playing') return;
    saveSoon();
    const s = getSettings();
    if (s.autoSpeed && index - autoMark >= AUTO_SPEED_EVERY && s.rate < MAX_RATE) {
      autoMark = index;
      const next = Math.min(MAX_RATE, Math.round((s.rate + 0.1) * 10) / 10);
      updateSettings({ rate: next });
      toast(`Speeding up to ${next.toFixed(1)}×`);
    }
  };
  const onState = (e) => {
    const state = e.detail.state;
    updatePlayState(state);
    if (state === 'paused') {
      saveSoon.flush();
      announce('Paused');
    } else if (state === 'ended') {
      saveProgress({ completed: true });
      toast(`Done. You finished ${doc.title}.`);
    } else if (state === 'playing') {
      autoMark = index;
      announce('Playing');
    }
  };
  const onError = (e) => toast(e.detail.message, { type: 'error' });
  speech.addEventListener('word', onWord);
  speech.addEventListener('state', onState);
  speech.addEventListener('error', onError);
  speech.addEventListener('voices', updateVoice);

  // ---------- Controls ----------
  const togglePlay = () => (speech.state === 'ended' ? speech.play(0) : speech.toggle());
  playBtn.addEventListener('click', togglePlay);
  $('#back10', main).addEventListener('click', () => speech.skipSeconds(-10));
  $('#fwd10', main).addEventListener('click', () => speech.skipSeconds(10));
  $('#speed-btn', main).addEventListener('click', () => openSpeedSheet({ wordsLeft: () => total - index }));
  $('#voice-btn', main).addEventListener('click', openVoiceSheet);
  const onVoicePicked = () => updateVoice();
  document.addEventListener('odeo:voice', onVoicePicked);

  position.addEventListener('input', () => {
    index = Number(position.value);
    reader.highlight(index);
    updatePosition();
  });
  position.addEventListener('change', () => {
    speech.seek(Number(position.value));
    saveProgress();
  });

  $('#back', main).addEventListener('click', () => {
    const prev = previousHash();
    if (prev && !prev.startsWith('#/session/')) history.back();
    else navigate('library');
  });

  // Space plays and pauses; Left and Right skip 10 seconds.
  const onKey = (e) => {
    if (!speech.supported || e.altKey || e.ctrlKey || e.metaKey) return;
    if (document.querySelector('dialog[open]')) return;
    if (e.target.closest('input, textarea, select, button, a, [contenteditable], [role="menuitem"]')) return;
    if (e.key === ' ') {
      e.preventDefault();
      togglePlay();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      speech.skipSeconds(-10);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      speech.skipSeconds(10);
    }
  };
  document.addEventListener('keydown', onKey);

  const onSettings = (e) => {
    reader.autoScroll = e.detail.autoScroll;
    updateSpeed();
    updateVoice();
    updatePosition();
  };
  settingsEvents.addEventListener('change', onSettings);

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
    renameInput.value = $('#doc-title', main).textContent;
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
    doc.title = updated.title;
    $('#doc-title', main).textContent = updated.title;
    $('#player-title', main).textContent = updated.title;
    document.title = `${updated.title} — Ôdēō`;
    closeRename();
    announce(`Renamed to ${updated.title}`);
  });

  // ---------- Notes panel ----------
  const panel = $('#notes-panel', main);
  const toggle = $('#notes-toggle', main);
  function setNotes(open, { focus = true } = {}) {
    root.classList.toggle('notes-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    try {
      localStorage.setItem(NOTES_KEY, open ? '1' : '0');
    } catch {}
    if (!focus) return;
    if (open) $('#notes-heading', main).focus();
    else toggle.focus();
  }
  toggle.addEventListener('click', () => setNotes(!root.classList.contains('notes-open')));
  $('#notes-close', main).addEventListener('click', () => setNotes(false));
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !root.classList.contains('is-wide')) setNotes(false);
  });

  const list = $('#notes-list', main);
  const empty = $('#notes-empty', main);
  const countEl = $('#notes-count', main);
  const pop = $('#selection-pop', main);
  const addNoteLabel = $('#add-note-label', main);
  let notes = [];
  let selection = null;

  function renderNotes() {
    countEl.textContent = notes.length ? `(${notes.length})` : '';
    toggle.setAttribute('aria-label', notes.length ? `Notes, ${plural(notes.length, 'note')}` : 'Notes');
    empty.hidden = notes.length > 0;
    reader.markNotes(notes);
    const existing = new Map($$('.note', list).map((li) => [li.dataset.id, li]));
    const frag = document.createDocumentFragment();
    notes.forEach((n) => frag.append(existing.get(n.id) || noteElement(n)));
    list.replaceChildren(frag);
  }

  function noteElement(n) {
    const li = document.createElement('li');
    li.className = 'note';
    li.dataset.id = n.id;
    li.innerHTML = `
      <p class="caption"><time datetime="${n.createdAt}">${formatDateTime(n.createdAt)}</time></p>
      <blockquote class="note-quote">${esc(n.quote)}</blockquote>
      <div class="field">
        <label for="nc-${n.id}">Your thoughts</label>
        <textarea id="nc-${n.id}" class="input" rows="2">${esc(n.comment)}</textarea>
        <p class="caption note-saved" aria-hidden="true"></p>
      </div>
      <div class="note-actions">
        <button type="button" class="btn btn--ghost" data-act="play">${icon('play')}Play</button>
        <button type="button" class="btn btn--ghost-danger" data-act="delete">${icon('trash')}Delete</button>
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
        body: `“${n.quote.length > 80 ? n.quote.slice(0, 80) + '…' : n.quote}” will be gone. You can’t undo this.`,
      });
      if (!ok) return;
      const pos = notes.findIndex((x) => x.id === n.id);
      await repo.deleteNote(n.id);
      notes = notes.filter((x) => x.id !== n.id);
      renderNotes();
      announce('Note deleted');
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
      if (!root.classList.contains('notes-open')) setNotes(true, { focus: false });
      toast('Note saved');
      const li = list.querySelector(`[data-id="${note.id}"]`);
      li?.scrollIntoView({ block: 'nearest' });
      return li;
    } catch (err) {
      if (err instanceof StorageFullError) toast('Your library is full. Delete a few things to save notes.', { type: 'error' });
      else throw err;
    }
  }

  function hidePop() {
    pop.hidden = true;
    selection = null;
    addNoteLabel.textContent = 'Save this sentence';
  }
  const onSelection = debounce(() => {
    const r = reader.selectionRange();
    if (!r) return hidePop();
    selection = r;
    addNoteLabel.textContent = 'Save selected text';
    const box = $('.page-sheet', main).getBoundingClientRect();
    pop.hidden = false;
    const w = pop.offsetWidth;
    const left = Math.min(Math.max(8, r.rect.left - box.left + r.rect.width / 2 - w / 2), box.width - w - 8);
    pop.style.setProperty('--x', `${left}px`);
    pop.style.setProperty('--y', `${r.rect.bottom - box.top + 10}px`);
  }, 150);
  document.addEventListener('selectionchange', onSelection);
  pop.addEventListener('mousedown', (e) => e.preventDefault());
  $('#add-note', main).addEventListener('mousedown', (e) => selection && e.preventDefault());
  $('#pop-save', main).addEventListener('click', async () => {
    if (!selection) return;
    const li = await createNote(selection.start, selection.end);
    li?.querySelector('textarea')?.focus();
  });
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

  notes = await repo.listNotes(doc.id);
  renderNotes();
  const onRepoChange = async (e) => {
    if (e.detail.origin === 'remote' && e.detail.collection === 'notes') {
      notes = await repo.listNotes(doc.id);
      renderNotes();
    }
  };
  repo.addEventListener('change', onRepoChange);

  // ---------- Layout: notes beside the page when there's room ----------
  const updateWidth = () => root.classList.toggle('is-wide', root.clientWidth >= 1040);
  const ro = new ResizeObserver(updateWidth);
  ro.observe(root);
  updateWidth();

  const onHide = () => document.visibilityState === 'hidden' && saveSoon.flush();
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', saveSoon.flush);

  return () => {
    saveSoon.flush();
    speech.removeEventListener('word', onWord);
    speech.removeEventListener('state', onState);
    speech.removeEventListener('error', onError);
    speech.removeEventListener('voices', updateVoice);
    speech.stop();
    settingsEvents.removeEventListener('change', onSettings);
    repo.removeEventListener('change', onRepoChange);
    document.removeEventListener('odeo:voice', onVoicePicked);
    document.removeEventListener('selectionchange', onSelection);
    document.removeEventListener('visibilitychange', onHide);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('pagehide', saveSoon.flush);
    ro.disconnect();
    document.getElementById('speed-sheet')?.close();
    document.getElementById('voice-sheet')?.close();
  };
}
