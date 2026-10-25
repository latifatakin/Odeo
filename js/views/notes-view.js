// Notes: every saved note, grouped by what it came from.

import { repo } from '../storage/repo.js';
import { coverHTML, applyPct } from '../covers.js';
import { $, esc, icon, formatDateTime, plural, debounce } from '../ui.js';

export async function render(main) {
  main.innerHTML = `
  <div class="page page--narrow">
    <header class="page-head">
      <h1>Notes</h1>
      <p>Everything you’ve highlighted, in one place. Jump back to any moment to hear it again.</p>
    </header>
    <div class="library-tools">
      <div class="search">
        ${icon('search')}
        <label class="sr-only" for="notes-search">Search notes</label>
        <input id="notes-search" type="search" autocomplete="off" placeholder="Search your notes" />
      </div>
    </div>
    <p class="sr-only" id="notes-results" role="status"></p>
    <div id="notes-groups"></div>
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
        <div class="empty-icon">${icon('notes')}</div>
        <h2>No notes yet</h2>
        <p>While you listen, select any text and tap <strong>Save as note</strong>. It’ll show up here.</p>
        <div class="empty-actions"><a class="btn btn--primary" href="#/home">Find something to listen to</a></div>
      </div>`;
      return;
    }
    if (!notes.length) {
      box.innerHTML = `<div class="empty"><div class="empty-icon">${icon('search')}</div>
        <h2>Nothing matches “${esc(search.value.trim())}”</h2><p>Try another word.</p></div>`;
      return;
    }

    const groups = new Map();
    for (const n of notes) {
      if (!groups.has(n.documentId)) groups.set(n.documentId, []);
      groups.get(n.documentId).push(n);
    }
    const ordered = [...groups.entries()].sort((a, b) => byDoc.get(b[0]).lastOpenedAt.localeCompare(byDoc.get(a[0]).lastOpenedAt));
    box.innerHTML = ordered
      .map(([docId, list]) => {
        const d = byDoc.get(docId);
        return `<section class="note-group" aria-labelledby="ng-${docId}">
          <div class="note-group-head">
            ${coverHTML(d, { small: true })}
            <div>
              <h2 id="ng-${docId}"><a href="#/session/${docId}">${esc(d.title)}</a></h2>
              <p class="hint">${plural(list.length, 'note')}</p>
            </div>
          </div>
          <ol class="notes-list">
            ${list
              .sort((a, b) => a.startWord - b.startWord)
              .map(
                (n) => `<li class="note">
                  <p class="note-meta"><time datetime="${n.createdAt}">${formatDateTime(n.createdAt)}</time></p>
                  <blockquote class="note-quote">${esc(n.quote)}</blockquote>
                  ${n.comment ? `<p>${esc(n.comment)}</p>` : ''}
                  <div class="note-foot">
                    <a class="btn btn--soft btn--sm" href="#/session/${docId}/${n.startWord}">${icon('play')}Play from here</a>
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
    const q = search.value.trim();
    if (!q) return;
    const n = box.querySelectorAll('.note').length;
    $('#notes-results', main).textContent = n ? `${plural(n, 'note')} found` : 'No notes found';
  }, 500);

  search.addEventListener('input', debounce(() => {
    draw();
    applyPct(main);
    announceResults();
  }, 150));
  draw();
  applyPct(main);
}
