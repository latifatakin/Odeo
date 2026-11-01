// Notes: every saved note as a card on one board, newest first.
// Follows the Notes page spec (notes-page-design.md, 1 Nov 2026):
// - each document has one note colour, and its name is always on the card
// - every card has a visible border; colours can be turned off in Settings
// - long notes fade after 6 lines with Show more; nothing is cut off for good
// - each card is one button that plays the note here, with the reader's
//   sentence and word highlight and a small player

import { repo } from '../storage/repo.js';
import { speech } from '../speech.js';
import { Reader } from '../reader.js';
import { navigate } from '../router.js';
import { chunkIndexForWord } from '../text.js';
import { $, $$, esc, icon, announce, toast, formatDate, plural, debounce } from '../ui.js';

const ALL = 'all';

function cardHTML(n, d) {
  const date = formatDate(n.createdAt);
  const label = `Note from ${d.title}, saved ${date}: ${n.quote}${n.comment ? `. ${n.comment}` : ''}. Press to play.`;
  return `<li class="sticky" data-id="${n.id}" data-color="${d.noteColor ?? 0}">
    <button type="button" class="sticky-play" aria-label="${esc(label)}"></button>
    <div class="sticky-text" id="nt-${n.id}" aria-hidden="true">${esc(n.quote)}</div>
    <button type="button" class="sticky-more-text" aria-expanded="false" aria-controls="nt-${n.id}" hidden>Show more</button>
    ${n.comment ? `<p class="sticky-comment" aria-hidden="true">${esc(n.comment)}</p>` : ''}
    <div class="sticky-foot">
      <p class="sticky-meta" aria-hidden="true">
        <span class="sticky-source" title="${esc(d.title)}">${esc(d.title)}</span>
        <time class="sticky-date" datetime="${n.createdAt}">${date}</time>
      </p>
      <div class="sticky-actions">
        <button type="button" class="icon-btn" data-act="more" aria-haspopup="menu" aria-expanded="false" aria-label="More options for this note from ${esc(d.title)}">${icon('more')}</button>
        <ul class="menu" role="menu" hidden>
          <li role="none"><button type="button" role="menuitem" data-act="play">${icon('play')}Play</button></li>
          <li role="none"><button type="button" role="menuitem" data-act="open">${icon('book')}Go to this part of the document</button></li>
          <li role="none"><button type="button" role="menuitem" data-act="copy">${icon('copy')}Copy</button></li>
          <li role="none"><button type="button" role="menuitem" class="danger" data-act="delete">${icon('trash')}Delete</button></li>
        </ul>
      </div>
    </div>
    <div class="sticky-confirm" role="group" aria-label="Delete this note?" hidden>
      <p><strong>Delete this note?</strong> You can’t undo this.</p>
      <div class="sticky-confirm-actions">
        <button type="button" class="btn btn--danger" data-act="confirm-delete">${icon('trash')}Delete</button>
        <button type="button" class="btn btn--secondary" data-act="cancel-delete">Cancel</button>
      </div>
    </div>
  </li>`;
}

export async function render(main) {
  main.innerHTML = `
  <div class="page">
    <header class="page-head">
      <h1>Notes</h1>
      <p>Everything you’ve saved while listening. Press a note to hear it again.</p>
    </header>
    <div class="notes-tools">
      <div class="field">
        <label for="notes-search">Search your notes</label>
        <div class="search">${icon('search')}<input id="notes-search" type="search" placeholder="Search" autocomplete="off" /></div>
      </div>
      <div class="doc-chips" id="doc-chips" role="group" aria-label="Show notes from"></div>
    </div>
    <p class="sr-only" id="notes-results" role="status"></p>
    <div id="notes-board" class="sticky-board section"></div>
  </div>

  <section class="player note-player" id="note-player" aria-label="Note player" hidden>
    <div class="note-player-row">
      <p class="note-player-title"><span class="sr-only">Playing a note from </span><span id="np-source"></span></p>
      <button type="button" class="play-btn" id="np-play" aria-label="Pause">${icon('pause')}</button>
      <button type="button" class="close-btn" id="np-close" aria-label="Stop and close player">${icon('x')}</button>
    </div>
  </section>`;

  const box = $('#notes-board', main);
  const search = $('#notes-search', main);
  const chipsBox = $('#doc-chips', main);
  const player = $('#note-player', main);
  const page = $('.page', main);
  let docs = [];
  let allNotes = [];
  let byDoc = new Map();
  let docFilter = ALL;

  async function load() {
    [docs, allNotes] = await Promise.all([repo.listDocuments(), repo.listAllNotes()]);
    byDoc = new Map(docs.map((d) => [d.id, d]));
    allNotes = allNotes.filter((n) => byDoc.has(n.documentId));
    if (docFilter !== ALL && !allNotes.some((n) => n.documentId === docFilter)) docFilter = ALL;
    drawChips();
    draw();
  }

  // ---------- Document chips ----------
  function drawChips() {
    const ids = [...new Set([...allNotes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((n) => n.documentId))];
    chipsBox.hidden = ids.length < 2;
    const chip = (id, label, color) => {
      const on = docFilter === id;
      return `<button type="button" class="doc-chip" data-doc="${id}" aria-pressed="${on}">
        ${on ? icon('check') : color == null ? '' : `<span class="doc-dot" data-color="${color}" aria-hidden="true"></span>`}<span>${esc(label)}</span>
      </button>`;
    };
    chipsBox.innerHTML = chip(ALL, 'All notes', null) + ids.map((id) => chip(id, byDoc.get(id).title, byDoc.get(id).noteColor ?? 0)).join('');
  }
  chipsBox.addEventListener('click', (e) => {
    const b = e.target.closest('[data-doc]');
    if (!b) return;
    docFilter = b.dataset.doc;
    drawChips();
    draw();
    chipsBox.querySelector(`[data-doc="${docFilter}"]`)?.focus();
    announceResults();
  });

  // ---------- Board ----------
  function shown() {
    const q = search.value.trim().toLowerCase();
    return allNotes
      .filter((n) => docFilter === ALL || n.documentId === docFilter)
      .filter((n) => !q || n.quote.toLowerCase().includes(q) || (n.comment || '').toLowerCase().includes(q) || byDoc.get(n.documentId).title.toLowerCase().includes(q))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  function draw() {
    stopPlayback();
    const notes = shown();
    if (!allNotes.length) {
      box.innerHTML = `<div class="empty">
        ${icon('notes')}
        <h2 class="h5">No notes yet</h2>
        <p>While listening, select some text and choose Save note.</p>
        <div class="empty-actions"><a class="btn btn--primary" href="#/library">Go to my library</a></div>
      </div>`;
      return;
    }
    if (!notes.length) {
      box.innerHTML = `<div class="empty">${icon('search')}<h2 class="h5">Nothing matches “${esc(search.value.trim())}”</h2><p>Try another word.</p></div>`;
      return;
    }
    box.innerHTML = `<h2 class="sr-only">${plural(notes.length, 'note')}</h2>
      <ul class="sticky-grid">${notes.map((n) => cardHTML(n, byDoc.get(n.documentId))).join('')}</ul>`;
    measure();
  }

  // Show more only where the text is longer than 6 lines.
  function measure() {
    for (const card of $$('.sticky', box)) {
      const text = card.querySelector('.sticky-text');
      const btn = card.querySelector('.sticky-more-text');
      if (card.classList.contains('is-open')) continue;
      const long = text.scrollHeight > text.clientHeight + 1;
      card.classList.toggle('is-clamped', long);
      btn.hidden = !long;
    }
  }
  const ro = new ResizeObserver(debounce(measure, 100));
  ro.observe(box);

  function setOpen(card, open) {
    card.classList.toggle('is-open', open);
    const btn = card.querySelector('.sticky-more-text');
    btn.setAttribute('aria-expanded', String(open));
    btn.textContent = open ? 'Show less' : 'Show more';
    if (!open) measure();
  }

  // ---------- Playing a note here ----------
  let playing = null; // { card, note, reader }
  const playBtn = $('#np-play', main);

  function stopPlayback() {
    if (!playing) return;
    const { card, note, opened } = playing;
    playing = null;
    speech.stop();
    player.hidden = true;
    page.classList.remove('has-player');
    if (card.isConnected) {
      card.classList.remove('is-playing');
      card.querySelector('.sticky-text').textContent = note.quote;
      if (opened) setOpen(card, false);
    }
  }

  function playNote(card) {
    const note = allNotes.find((n) => n.id === card.dataset.id);
    if (!note) return;
    if (!speech.supported) {
      toast('Speech isn’t available in this browser. Try the latest Chrome, Edge, Safari or Firefox.', { type: 'error' });
      return;
    }
    if (playing?.card === card) {
      speech.play(0);
      return;
    }
    stopPlayback();
    const d = byDoc.get(note.documentId);
    // Open long notes while they play, so the highlighted word is always visible.
    const opened = card.classList.contains('is-clamped') && !card.classList.contains('is-open');
    if (opened) setOpen(card, true);
    const reader = new Reader(card.querySelector('.sticky-text'), note.quote);
    reader.autoScroll = false;
    playing = { card, note, reader, opened };
    card.classList.add('is-playing');
    $('#np-source', main).textContent = d.title;
    player.hidden = false;
    page.classList.add('has-player');
    speech.load(note.quote);
    speech.play(0);
    announce(`Playing note from ${d.title}`);
  }

  const onWord = (e) => {
    if (!playing) return;
    const i = e.detail.index;
    playing.reader.highlight(i);
    const c = speech.chunks[chunkIndexForWord(speech.chunks, i)];
    if (c) playing.reader.markSentence(c.startWord, c.endWord);
  };
  const onState = (e) => {
    if (!playing) return;
    const state = e.detail.state;
    const isOn = state === 'playing';
    playBtn.innerHTML = icon(isOn ? 'pause' : 'play');
    playBtn.setAttribute('aria-label', isOn ? 'Pause' : state === 'ended' ? 'Play again' : 'Play');
    if (state === 'ended') announce('Finished the note');
  };
  const onError = (e) => playing && toast(e.detail.message, { type: 'error' });
  speech.addEventListener('word', onWord);
  speech.addEventListener('state', onState);
  speech.addEventListener('error', onError);

  playBtn.addEventListener('click', () => (speech.state === 'ended' ? speech.play(0) : speech.toggle()));
  $('#np-close', main).addEventListener('click', () => {
    const card = playing?.card;
    stopPlayback();
    card?.querySelector('.sticky-play')?.focus();
  });

  // ---------- Card actions ----------
  function closeMenus(except) {
    $$('.sticky .menu', box).forEach((m) => {
      if (m === except) return;
      m.hidden = true;
      m.previousElementSibling?.setAttribute('aria-expanded', 'false');
      m.closest('.sticky')?.classList.remove('has-menu');
    });
  }
  function openMenu(btn) {
    const menu = btn.nextElementSibling;
    closeMenus(menu);
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    btn.closest('.sticky').classList.add('has-menu');
    menu.querySelector('[role="menuitem"]').focus();
  }

  box.addEventListener('click', async (e) => {
    const card = e.target.closest('.sticky');
    if (!card) return;
    const note = allNotes.find((n) => n.id === card.dataset.id);
    const more = card.querySelector('[data-act="more"]');

    if (e.target.closest('.sticky-play') || e.target.closest('.sticky-source')) {
      closeMenus();
      return playNote(card);
    }
    if (e.target.closest('.sticky-more-text')) {
      setOpen(card, !card.classList.contains('is-open'));
      return;
    }
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === 'more') {
      if (btn.getAttribute('aria-expanded') === 'true') closeMenus();
      else openMenu(btn);
      return;
    }
    closeMenus();
    if (act === 'play') {
      playNote(card);
      card.querySelector('.sticky-play').focus();
    } else if (act === 'open') {
      navigate(`session/${note.documentId}/${note.startWord}`);
    } else if (act === 'copy') {
      try {
        await navigator.clipboard.writeText(note.quote);
        toast('Note copied');
      } catch {
        toast('Couldn’t copy. Select the text in the reader and copy it there.', { type: 'error' });
      }
      more.focus();
    } else if (act === 'delete') {
      card.classList.add('is-confirming');
      card.querySelector('.sticky-confirm').hidden = false;
      card.querySelector('[data-act="cancel-delete"]').focus();
    } else if (act === 'cancel-delete') {
      card.classList.remove('is-confirming');
      card.querySelector('.sticky-confirm').hidden = true;
      more.focus();
    } else if (act === 'confirm-delete') {
      const cards = $$('.sticky', box);
      const pos = cards.indexOf(card);
      if (playing?.card === card) stopPlayback();
      await repo.deleteNote(note.id);
      allNotes = allNotes.filter((n) => n.id !== note.id);
      drawChips();
      draw();
      announce('Note deleted');
      const left = $$('.sticky-play', box);
      (left[Math.min(pos, left.length - 1)] || search).focus();
    }
  });

  // Menu keyboard: arrows move, Escape closes and returns to the button, Tab closes.
  box.addEventListener('keydown', (e) => {
    const menu = e.target.closest('.menu');
    if (menu) {
      const items = $$('[role="menuitem"]', menu);
      const i = items.indexOf(e.target);
      if (e.key === 'ArrowDown') items[(i + 1) % items.length].focus();
      else if (e.key === 'ArrowUp') items[(i - 1 + items.length) % items.length].focus();
      else if (e.key === 'Home') items[0].focus();
      else if (e.key === 'End') items[items.length - 1].focus();
      else if (e.key === 'Escape') {
        closeMenus();
        menu.previousElementSibling.focus();
      } else if (e.key === 'Tab') return closeMenus();
      else return;
      e.preventDefault();
    } else if (e.key === 'Escape' && e.target.closest('.sticky-confirm')) {
      e.target.closest('.sticky').querySelector('[data-act="cancel-delete"]').click();
    }
  });
  const onDocClick = (e) => {
    if (!e.target.closest('.sticky-actions')) closeMenus();
  };
  document.addEventListener('click', onDocClick);

  // ---------- Search ----------
  const announceResults = debounce(() => {
    if (!search.value.trim() && docFilter === ALL) return;
    const n = box.querySelectorAll('.sticky').length;
    $('#notes-results', main).textContent = n ? `${plural(n, 'note')} shown` : 'No notes found';
  }, 500);
  search.addEventListener('input', debounce(() => {
    draw();
    announceResults();
  }, 150));

  const onChange = (e) => ['notes', 'documents'].includes(e.detail.collection) && e.detail.origin === 'remote' && load();
  repo.addEventListener('change', onChange);
  await load();

  return () => {
    stopPlayback();
    ro.disconnect();
    speech.removeEventListener('word', onWord);
    speech.removeEventListener('state', onState);
    speech.removeEventListener('error', onError);
    repo.removeEventListener('change', onChange);
    document.removeEventListener('click', onDocClick);
  };
}
