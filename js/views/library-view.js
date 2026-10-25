// Library: search, filter, rename, delete and resume saved items.

import { repo } from '../storage/repo.js';
import { getSettings } from '../settings.js';
import { minutesFor } from '../text.js';
import { coverHTML, applyPct, progressPct, kindLabel } from '../covers.js';
import { $, $$, esc, icon, announce, confirmDialog, formatDate, formatRelative, plural, debounce } from '../ui.js';

const SORT_KEY = 'odeo:library-sort';
const formatMB = (bytes) => `${(bytes / 1024 / 1024).toFixed(bytes < 1024 * 1024 ? 2 : 1)} MB`;

function snippet(text, query) {
  const clean = text.replace(/\s+/g, ' ');
  const at = query ? clean.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (at < 0) return esc(clean.slice(0, 200));
  const from = Math.max(0, at - 40);
  return (from > 0 ? '…' : '') + esc(clean.slice(from, at)) + `<mark>${esc(clean.slice(at, at + query.length))}</mark>` + esc(clean.slice(at + query.length, at + 160));
}
function highlight(title, query) {
  const at = query ? title.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (at < 0) return esc(title);
  return esc(title.slice(0, at)) + `<mark>${esc(title.slice(at, at + query.length))}</mark>` + esc(title.slice(at + query.length));
}

export async function render(main) {
  let sort = 'opened';
  try {
    sort = localStorage.getItem(SORT_KEY) || 'opened';
  } catch {}

  main.innerHTML = `
  <div class="page page--narrow">
    <header class="page-head page-head--row">
      <div>
        <h1>Library</h1>
        <p>Everything you’ve listened to. It all works offline, too.</p>
      </div>
      <button type="button" class="btn btn--primary add-open" aria-haspopup="dialog">${icon('plus')}Add new</button>
    </header>

    <div class="library-tools" role="search">
      <div class="search">
        ${icon('search')}
        <label class="sr-only" for="lib-search">Search your library</label>
        <input id="lib-search" type="search" autocomplete="off" placeholder="Search titles and text" />
      </div>
      <div>
        <label class="sr-only" for="lib-sort">Sort by</label>
        <select id="lib-sort" class="select">
          <option value="opened">Recently opened</option>
          <option value="added">Recently added</option>
          <option value="title">Title A–Z</option>
        </select>
      </div>
    </div>
    <fieldset class="chips" id="lib-filter">
      <legend class="sr-only">Show</legend>
      <label class="chip"><input type="radio" name="lf" value="all" checked /><span>All</span></label>
      <label class="chip"><input type="radio" name="lf" value="progress" /><span>In progress</span></label>
      <label class="chip"><input type="radio" name="lf" value="new" /><span>Not started</span></label>
      <label class="chip"><input type="radio" name="lf" value="done" /><span>Finished</span></label>
    </fieldset>

    <p class="sr-only" id="lib-results" role="status"></p>
    <ul class="lib-list" id="lib-list"></ul>
    <div id="lib-empty"></div>
    <p class="storage-line" id="lib-storage"></p>
  </div>`;

  const list = $('#lib-list', main);
  const emptyBox = $('#lib-empty', main);
  const search = $('#lib-search', main);
  const sortSel = $('#lib-sort', main);
  sortSel.value = sort;
  let docs = [];

  async function load() {
    docs = await repo.listDocuments();
    const usage = await repo.usage();
    $('#lib-storage', main).textContent = `${plural(docs.length, 'item')} on this device · ${formatMB(usage.bytes)} of about ${formatMB(usage.quota)} used`;
    draw();
  }

  const state = (d) => (d.progress?.completed ? 'done' : progressPct(d) > 0 ? 'progress' : 'new');

  function filtered() {
    const q = search.value.trim().toLowerCase();
    const f = main.querySelector('input[name="lf"]:checked').value;
    const out = docs.filter((d) => (f === 'all' || state(d) === f) && (!q || d.title.toLowerCase().includes(q) || d.text.toLowerCase().includes(q)));
    if (sort === 'title') out.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
    else if (sort === 'added') out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    else out.sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt));
    return out;
  }

  function progressText(d) {
    const s = state(d);
    if (s === 'done') return 'Finished';
    const left = Math.max(1, Math.round(minutesFor(d.wordCount - (d.progress?.wordIndex || 0), getSettings().rate)));
    return s === 'progress' ? `${progressPct(d)}% · ${left} min left` : `${left} min listen`;
  }

  function draw() {
    const q = search.value.trim();
    const items = filtered();
    if (!docs.length) {
      list.innerHTML = '';
      emptyBox.innerHTML = `<div class="empty">
        <div class="empty-icon">${icon('library')}</div>
        <h2>Nothing here yet</h2>
        <p>Everything you listen to lands here, so you can jump back in right where you stopped.</p>
        <div class="empty-actions">
          <a class="btn btn--primary" href="#/text">${icon('type')}Type or paste</a>
          <button type="button" class="btn btn--ghost" data-import="file">${icon('folder')}Upload a file</button>
        </div>
      </div>`;
      return;
    }
    if (!items.length) {
      list.innerHTML = '';
      emptyBox.innerHTML = `<div class="empty">
        <div class="empty-icon">${icon('search')}</div>
        <h2>${q ? `No matches for “${esc(q)}”` : 'Nothing in this list'}</h2>
        <p>Try another word or a different filter.</p>
        <button type="button" class="btn btn--ghost" id="clear-search">Show everything</button>
      </div>`;
      $('#clear-search', main).addEventListener('click', () => {
        search.value = '';
        main.querySelector('input[name="lf"][value="all"]').checked = true;
        draw();
        search.focus();
      });
      return;
    }
    emptyBox.innerHTML = '';
    list.innerHTML = items
      .map(
        (d) => `<li class="lib-item" data-id="${d.id}">
          ${coverHTML(d, { small: true })}
          <div class="lib-main">
            <h2 class="lib-title"><a href="#/session/${d.id}">${highlight(d.title, q)}</a></h2>
            <form class="rename-inline" hidden>
              <label class="sr-only" for="rn-${d.id}">New title for ${esc(d.title)}</label>
              <input id="rn-${d.id}" class="input" type="text" maxlength="120" value="${esc(d.title)}" autocomplete="off" />
              <button type="submit" class="btn btn--primary btn--sm">Save</button>
              <button type="button" class="btn btn--ghost btn--sm" data-act="cancel">Cancel</button>
            </form>
            <p class="lib-meta">
              <span>${esc(kindLabel(d))}</span>
              <span>${plural(d.wordCount, 'word')}</span>
              ${d.noteCount ? `<span>${plural(d.noteCount, 'note')}</span>` : ''}
              <span title="Added ${formatDate(d.createdAt)}">Opened ${formatRelative(d.lastOpenedAt)}</span>
            </p>
            ${q ? `<p class="lib-snippet">${snippet(d.text, q)}</p>` : ''}
            <p class="lib-meta"><span>${progressText(d)}</span></p>
            ${state(d) === 'progress' ? `<span class="lib-bar" aria-hidden="true"><span data-pct="${progressPct(d)}"></span></span>` : ''}
          </div>
          <div class="lib-actions">
            <button type="button" class="icon-btn" data-act="rename" aria-label="Rename ${esc(d.title)}">${icon('pencil')}</button>
            <button type="button" class="icon-btn danger" data-act="delete" aria-label="Delete ${esc(d.title)}">${icon('trash')}</button>
          </div>
        </li>`
      )
      .join('');
    applyPct(list);
  }

  const announceResults = debounce(() => {
    const q = search.value.trim();
    const n = filtered().length;
    $('#lib-results', main).textContent = q ? (n ? `${plural(n, 'result')} for ${q}` : `No results for ${q}`) : `${plural(n, 'item')} shown`;
  }, 500);

  search.addEventListener('input', debounce(() => {
    draw();
    announceResults();
  }, 150));
  $('#lib-filter', main).addEventListener('change', () => {
    draw();
    announceResults();
  });
  sortSel.addEventListener('change', () => {
    sort = sortSel.value;
    try {
      localStorage.setItem(SORT_KEY, sort);
    } catch {}
    draw();
  });

  list.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const li = btn.closest('.lib-item');
    const id = li.dataset.id;
    const doc = docs.find((d) => d.id === id);
    const form = li.querySelector('.rename-inline');
    const titleEl = li.querySelector('.lib-title');
    const act = btn.dataset.act;

    if (act === 'rename') {
      titleEl.hidden = true;
      form.hidden = false;
      const input = form.querySelector('input');
      input.value = doc.title;
      input.focus();
      input.select();
    } else if (act === 'cancel') {
      form.hidden = true;
      titleEl.hidden = false;
      li.querySelector('[data-act="rename"]').focus();
    } else if (act === 'delete') {
      const ok = await confirmDialog({
        title: `Delete “${doc.title}”?`,
        body: `This removes the text, your place in it${doc.noteCount ? ` and ${plural(doc.noteCount, 'note')}` : ''} from this device. It can’t be undone.`,
      });
      if (!ok) return;
      const pos = filtered().findIndex((d) => d.id === id);
      await repo.deleteDocument(id);
      await load();
      announce(`Deleted ${doc.title}`);
      const links = $$('.lib-title a', list);
      (links[Math.min(pos, links.length - 1)] || search).focus();
    }
  });

  list.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && e.target.closest('.rename-inline')) e.target.closest('.lib-item').querySelector('[data-act="cancel"]').click();
  });

  list.addEventListener('submit', async (e) => {
    e.preventDefault();
    const li = e.target.closest('.lib-item');
    const updated = await repo.renameDocument(li.dataset.id, e.target.querySelector('input').value);
    docs.find((d) => d.id === li.dataset.id).title = updated.title;
    draw();
    announce(`Renamed to ${updated.title}`);
    $(`.lib-item[data-id="${li.dataset.id}"] [data-act="rename"]`, list)?.focus();
  });

  const onChange = (e) => e.detail.origin === 'remote' && load();
  repo.addEventListener('change', onChange);
  await load();
  return () => repo.removeEventListener('change', onChange);
}
