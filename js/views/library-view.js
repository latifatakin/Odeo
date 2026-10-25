// My library: search, rename, delete and resume saved sessions.

import { repo } from '../storage/repo.js';
import { $, $$, esc, icon, announce, confirmDialog, formatDate, formatRelative, plural, debounce } from '../ui.js';

const SOURCE_LABEL = { paste: 'Text', pdf: 'PDF', txt: 'TXT', sample: 'Sample' };
const SORT_KEY = 'odeo:library-sort';

const formatMB = (bytes) => `${(bytes / 1024 / 1024).toFixed(bytes < 1024 * 1024 ? 2 : 1)} MB`;

function snippet(text, query) {
  const clean = text.replace(/\s+/g, ' ');
  if (!query) return esc(clean.slice(0, 160)) + (clean.length > 160 ? '…' : '');
  const at = clean.toLowerCase().indexOf(query.toLowerCase());
  if (at < 0) return esc(clean.slice(0, 160)) + (clean.length > 160 ? '…' : '');
  const from = Math.max(0, at - 60);
  const to = Math.min(clean.length, at + query.length + 100);
  return (
    (from > 0 ? '…' : '') +
    esc(clean.slice(from, at)) +
    `<mark>${esc(clean.slice(at, at + query.length))}</mark>` +
    esc(clean.slice(at + query.length, to)) +
    (to < clean.length ? '…' : '')
  );
}

function highlightTitle(title, query) {
  if (!query) return esc(title);
  const at = title.toLowerCase().indexOf(query.toLowerCase());
  if (at < 0) return esc(title);
  return esc(title.slice(0, at)) + `<mark>${esc(title.slice(at, at + query.length))}</mark>` + esc(title.slice(at + query.length));
}

export async function render(main) {
  let sort = 'opened';
  try {
    sort = localStorage.getItem(SORT_KEY) || 'opened';
  } catch {}

  main.innerHTML = `
  <div class="page">
    <header class="page-head">
      <h1>My library</h1>
      <p id="lib-summary">Everything is saved on this device and works offline.</p>
    </header>

    <div class="library-tools" role="search">
      <div class="field search-field">
        <label for="lib-search">Search your library</label>
        <div class="input-icon">
          ${icon('search')}
          <input id="lib-search" type="search" autocomplete="off" placeholder="Search titles and text" />
        </div>
      </div>
      <div class="field sort-field">
        <label for="lib-sort">Sort by</label>
        <select id="lib-sort">
          <option value="opened">Last opened</option>
          <option value="added">Date added</option>
          <option value="title">Title (A–Z)</option>
        </select>
      </div>
    </div>

    <p class="sr-only" id="lib-results" role="status"></p>
    <ul class="library-list" id="lib-list"></ul>
    <div id="lib-empty"></div>
  </div>`;

  const list = $('#lib-list', main);
  const emptyBox = $('#lib-empty', main);
  const search = $('#lib-search', main);
  const sortSel = $('#lib-sort', main);
  const results = $('#lib-results', main);
  sortSel.value = sort;
  let docs = [];

  async function load() {
    docs = await repo.listDocuments();
    const usage = await repo.usage();
    $('#lib-summary', main).textContent =
      `${plural(docs.length, 'item')} saved on this device. Using ${formatMB(usage.bytes)} of about ${formatMB(usage.quota)}. Saved items play offline.`;
    draw();
  }

  function filtered() {
    const q = search.value.trim().toLowerCase();
    let out = q ? docs.filter((d) => d.title.toLowerCase().includes(q) || d.text.toLowerCase().includes(q)) : docs.slice();
    if (sort === 'title') out.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
    else if (sort === 'added') out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    else out.sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt));
    return out;
  }

  function draw() {
    const q = search.value.trim();
    const items = filtered();

    if (!docs.length) {
      list.innerHTML = '';
      emptyBox.innerHTML = `<div class="empty card">
        <div class="empty-icon">${icon('book')}</div>
        <h2>Your library is empty</h2>
        <p>Everything you listen to is saved here, so you can pick up where you left off.</p>
        <div class="empty-actions">
          <a class="btn btn--primary" href="#/text">${icon('text')}Paste text</a>
          <a class="btn btn--secondary" href="#/file">${icon('upload')}Upload a file</a>
        </div>
      </div>`;
      return;
    }
    if (!items.length) {
      list.innerHTML = '';
      emptyBox.innerHTML = `<div class="empty card">
        <div class="empty-icon">${icon('search')}</div>
        <h2>No matches for “${esc(q)}”</h2>
        <p>Try a different word, or check the spelling.</p>
        <button type="button" class="btn btn--secondary" id="clear-search">Clear search</button>
      </div>`;
      $('#clear-search', main).addEventListener('click', () => {
        search.value = '';
        draw();
        search.focus();
      });
      return;
    }

    emptyBox.innerHTML = '';
    list.innerHTML = items
      .map((d) => {
        const p = d.progress;
        const pct = p?.completed ? 100 : p && d.wordCount > 1 ? Math.round((p.wordIndex / (d.wordCount - 1)) * 100) : 0;
        const started = p && (p.wordIndex > 0 || p.completed);
        const action = p?.completed ? 'Play again' : started ? 'Resume' : 'Start';
        const progressText = p?.completed ? 'Finished' : started ? `${pct}% listened` : 'Not started';
        return `<li class="lib-item card" data-id="${d.id}">
          <div class="lib-main">
            <h2 class="lib-title"><a href="#/session/${d.id}">${highlightTitle(d.title, q)}</a></h2>
            <form class="rename-form rename-form--inline" hidden>
              <label class="sr-only" for="rn-${d.id}">New title for ${esc(d.title)}</label>
              <input id="rn-${d.id}" type="text" maxlength="120" value="${esc(d.title)}" autocomplete="off" />
              <button type="submit" class="btn btn--primary btn--sm">Save</button>
              <button type="button" class="btn btn--ghost btn--sm" data-act="cancel">Cancel</button>
            </form>
            <p class="lib-meta">
              <span>Added <time datetime="${d.createdAt}">${formatDate(d.createdAt)}</time></span>
              <span>${esc(SOURCE_LABEL[d.source?.type] || 'Text')}</span>
              <span>${plural(d.wordCount, 'word')}</span>
              <span>${plural(d.noteCount, 'note')}</span>
            </p>
            <p class="lib-snippet">${snippet(d.text, q)}</p>
            <div class="lib-progress">
              <span class="bar" aria-hidden="true"><span data-pct="${pct}"></span></span>
              <span>${progressText} · opened ${formatRelative(d.lastOpenedAt)}</span>
            </div>
          </div>
          <div class="lib-actions">
            <a class="btn btn--primary btn--sm" href="#/session/${d.id}">${icon('play')}${action}<span class="sr-only">: ${esc(d.title)}</span></a>
            <button type="button" class="btn btn--ghost btn--sm" data-act="rename">${icon('pencil')}Rename<span class="sr-only">: ${esc(d.title)}</span></button>
            <button type="button" class="btn btn--ghost btn--sm btn--danger-text" data-act="delete">${icon('trash')}Delete<span class="sr-only">: ${esc(d.title)}</span></button>
          </div>
        </li>`;
      })
      .join('');
    // Inline styles are blocked by the security policy, so set widths here.
    $$('[data-pct]', list).forEach((el) => el.style.setProperty('--pct', `${el.dataset.pct}%`));
  }

  const announceResults = debounce(() => {
    const q = search.value.trim();
    if (!q) return (results.textContent = '');
    const n = filtered().length;
    results.textContent = n ? `${plural(n, 'result')} for ${q}` : `No results for ${q}`;
  }, 500);

  search.addEventListener('input', debounce(() => {
    draw();
    announceResults();
  }, 150));

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
    const act = btn.dataset.act;
    const form = li.querySelector('.rename-form');
    const titleEl = li.querySelector('.lib-title');

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
        body: `This removes the text, your place in it and ${plural(doc.noteCount, 'note')} from this device. This can’t be undone.`,
      });
      if (!ok) return;
      const items = filtered();
      const pos = items.findIndex((d) => d.id === id);
      await repo.deleteDocument(id);
      docs = docs.filter((d) => d.id !== id);
      await load();
      announce(`Deleted ${doc.title}`);
      const links = $$('.lib-title a', list);
      (links[Math.min(pos, links.length - 1)] || search).focus();
    }
  });

  list.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && e.target.closest('.rename-form')) {
      e.target.closest('.lib-item').querySelector('[data-act="cancel"]').click();
    }
  });

  list.addEventListener('submit', async (e) => {
    e.preventDefault();
    const li = e.target.closest('.lib-item');
    const input = e.target.querySelector('input');
    const updated = await repo.renameDocument(li.dataset.id, input.value);
    const doc = docs.find((d) => d.id === li.dataset.id);
    doc.title = updated.title;
    draw();
    announce(`Renamed to ${updated.title}`);
    $(`.lib-item[data-id="${li.dataset.id}"] [data-act="rename"]`, list)?.focus();
  });

  const onChange = (e) => {
    if (e.detail.origin === 'remote') load();
  };
  repo.addEventListener('change', onChange);

  await load();
  return () => repo.removeEventListener('change', onChange);
}
