// Notes: every saved note, grouped by what it came from.

import { repo } from '../storage/repo.js';
import { typeTileHTML } from '../covers.js';
import { $, esc, icon, formatDateTime, plural, debounce } from '../ui.js';

export async function render(main) {
  main.innerHTML = `
  <div class="page page--narrow">
    <header class="page-head">
      <h1>Notes</h1>
      <p>Everything you’ve saved while listening. Jump back to any moment to hear it again.</p>
    </header>
    <div class="field">
      <label for="notes-search">Search notes</label>
      <div class="search">${icon('search')}<input id="notes-search" type="search" autocomplete="off" /></div>
    </div>
    <p class="sr-only" id="notes-results" role="status"></p>
    <div id="notes-groups" class="section"></div>
  </div>`;

  const box = $('#notes-groups', main);
  const search = $('#notes-search', main);
  const [docs, allNotes] = await Promise.all([repo.listDocuments(), repo.listAllNotes()]);
  const byDoc = new Map(docs.map((d) => [d.id, d]));

  function draw() {
    const q = search.value.trim().toLowerCase();
    const notes = allNotes.filter((n) => byDoc.has(n.documentId) && (!q || n.quote.toLowerCase().includes(q) || (n.comment || '').toLowerCase().includes(q)));
    if (!allNotes.length) {
      box.innerHTML = `<div class="empty">
        ${icon('notes')}
        <h2 class="h5">No notes yet</h2>
        <p>While you listen, select any text and choose Save note. It will show up here.</p>
        <div class="empty-actions"><a class="btn btn--primary" href="#/home">Find something to listen to</a></div>
      </div>`;
      return;
    }
    if (!notes.length) {
      box.innerHTML = `<div class="empty">${icon('search')}<h2 class="h5">Nothing matches “${esc(search.value.trim())}”</h2><p>Try another word.</p></div>`;
      return;
    }
    const groups = new Map();
    for (const n of notes) {
      if (!groups.has(n.documentId)) groups.set(n.documentId, []);
      groups.get(n.documentId).push(n);
    }
    box.innerHTML = [...groups.entries()]
      .sort((a, b) => byDoc.get(b[0]).lastOpenedAt.localeCompare(byDoc.get(a[0]).lastOpenedAt))
      .map(([docId, list]) => {
        const d = byDoc.get(docId);
        return `<section class="note-group" aria-labelledby="ng-${docId}">
          <div class="note-group-head">
            ${typeTileHTML(d)}
            <div>
              <h2 class="h5" id="ng-${docId}"><a href="#/session/${docId}">${esc(d.title)}</a></h2>
              <p class="caption">${plural(list.length, 'note')}</p>
            </div>
          </div>
          <ol class="notes-list">
            ${list
              .sort((a, b) => a.startWord - b.startWord)
              .map(
                (n) => `<li class="note">
                  <p class="caption"><time datetime="${n.createdAt}">${formatDateTime(n.createdAt)}</time></p>
                  <blockquote class="note-quote">${esc(n.quote)}</blockquote>
                  ${n.comment ? `<p class="note-comment">${esc(n.comment)}</p>` : ''}
                  <div class="note-actions">
                    <a class="btn btn--secondary" href="#/session/${docId}/${n.startWord}">${icon('play')}Play from here</a>
                  </div>
                </li>`
              )
              .join('')}
          </ol>
        </section>`;
      })
      .join('');
  }

  const announceResults = debounce(() => {
    if (!search.value.trim()) return;
    const n = box.querySelectorAll('.note').length;
    $('#notes-results', main).textContent = n ? `${plural(n, 'note')} found` : 'No notes found';
  }, 500);
  search.addEventListener('input', debounce(() => {
    draw();
    announceResults();
  }, 150));
  draw();
}
