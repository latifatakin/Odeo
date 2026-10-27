// My library: search, filter, sort, and a More menu for Rename and Delete.

import { repo } from '../storage/repo.js';
import { getSettings } from '../settings.js';
import { minutesFor } from '../text.js';
import { typeTileHTML, progressHTML, applyPct, progressPct } from '../covers.js';
import { $, $$, esc, icon, announce, confirmDialog, formatDate, plural, debounce } from '../ui.js';

const SORT_KEY = 'odeo:library-sort';
const formatMB = (bytes) => `${(bytes / 1024 / 1024).toFixed(bytes < 1024 * 1024 ? 2 : 1)} MB`;

function highlight(text, q) {
  const at = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (at < 0) return esc(text);
  return esc(text.slice(0, at)) + `<mark>${esc(text.slice(at, at + q.length))}</mark>` + esc(text.slice(at + q.length));
}
function snippet(text, q) {
  const clean = text.replace(/\s+/g, ' ');
  const at = clean.toLowerCase().indexOf(q.toLowerCase());
  if (at < 0) return '';
  const from = Math.max(0, at - 40);
  return (from > 0 ? '…' : '') + highlight(clean.slice(from, at + q.length + 120), q);
}

export async function render(main) {
  let sort = 'opened';
  try {
    sort = localStorage.getItem(SORT_KEY) || 'opened';
  } catch {}
  const rate = getSettings().rate;

  main.innerHTML = `
  <div class="page page--narrow">
    <header class="page-head">
      <h1>My library</h1>
      <p>Everything you’ve listened to. It all plays offline, too.</p>
    </header>

    <div class="library-tools" role="search" id="lib-tools">
      <div class="field">
        <label for="lib-search">Search</label>
        <div class="search">
          ${icon('search')}
          <input id="lib-search" type="search" autocomplete="off" />
        </div>
      </div>
      <div class="field">
        <label for="lib-sort">Sort by</label>
        <select id="lib-sort" class="select">
          <option value="opened">Recently opened</option>
          <option value="added">Recently added</option>
          <option value="title">Title A to Z</option>
        </select>
      </div>
    </div>
    <fieldset class="chips" id="lib-filter" data-tools>
      <legend class="sr-only">Show</legend>
      <label class="chip"><input type="radio" name="lf" value="all" checked /><span>${icon('check')}All</span></label>
      <label class="chip"><input type="radio" name="lf" value="progress" /><span>${icon('check')}In progress</span></label>
      <label class="chip"><input type="radio" name="lf" value="new" /><span>${icon('check')}Not started</span></label>
      <label class="chip"><input type="radio" name="lf" value="done" /><span>${icon('check')}Finished</span></label>
    </fieldset>

    <p class="sr-only" id="lib-results" role="status"></p>
    <ul class="lib-list section" id="lib-list"></ul>
    <div id="lib-empty" class="section"></div>
    <p class="caption storage-line" id="lib-storage"></p>
  </div>`;

  const list = $('#lib-list', main);
  const emptyBox = $('#lib-empty', main);
  const search = $('#lib-search', main);
  const sortSel = $('#lib-sort', main);
  sortSel.value = sort;
  let docs = [];

  const state = (d) => (d.progress?.completed ? 'done' : progressPct(d) > 0 ? 'progress' : 'new');

  async function load() {
    docs = await repo.listDocuments();
    const usage = await repo.usage();
    const hasDocs = docs.length > 0;
    $('#lib-tools', main).hidden = !hasDocs;
    $('#lib-filter', main).hidden = !hasDocs;
    $('#lib-storage', main).textContent = `${plural(docs.length, 'item')} saved on this device. Using ${formatMB(usage.bytes)} of about ${formatMB(usage.quota)}.`;
    draw();
  }

  function filtered() {
    const q = search.value.trim().toLowerCase();
    const f = main.querySelector('input[name="lf"]:checked').value;
    const out = docs.filter((d) => (f === 'all' || state(d) === f) && (!q || d.title.toLowerCase().includes(q) || d.text.toLowerCase().includes(q)));
    if (sort === 'title') out.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
    else if (sort === 'added') out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    else out.sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt));
    return out;
  }

  function draw() {
    const q = search.value.trim();
    const items = filtered();
    closeMenus();
    if (!docs.length) {
      list.innerHTML = '';
      emptyBox.innerHTML = `<div class="empty">
        ${icon('book')}
        <h2 class="h5">Your library is empty</h2>
        <p>Everything you listen to is saved here, so you can pick up where you stopped.</p>
        <div class="empty-actions">
          <a class="btn btn--primary" href="#/text">Paste text</a>
          <button type="button" class="btn btn--secondary" data-add="file">Upload a file</button>
        </div>
      </div>`;
      return;
    }
    if (!items.length) {
      list.innerHTML = '';
      emptyBox.innerHTML = `<div class="empty">
        ${icon('search')}
        <h2 class="h5">${q ? `Nothing matches “${esc(q)}”` : 'Nothing in this list yet'}</h2>
        <p>Try another word or a different filter.</p>
        <button type="button" class="btn btn--secondary" id="clear-search">Show everything</button>
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
      .map((d) => {
        const pct = progressPct(d);
        const s = state(d);
        const mins = Math.max(1, Math.round(minutesFor(d.wordCount, rate)));
        return `<li class="lib-row" data-id="${d.id}">
          ${typeTileHTML(d)}
          <div class="lib-main">
            <h2 class="lib-title"><a href="#/session/${d.id}">${highlight(d.title, q)}</a></h2>
            <form class="rename-inline" hidden>
              <label class="sr-only" for="rn-${d.id}">New title for ${esc(d.title)}</label>
              <input id="rn-${d.id}" class="input" type="text" maxlength="120" value="${esc(d.title)}" autocomplete="off" />
              <button type="submit" class="btn btn--primary">Save</button>
              <button type="button" class="btn btn--secondary" data-act="cancel">Cancel</button>
            </form>
            <p class="lib-meta">Added ${formatDate(d.createdAt)} · ${mins} min listen${s === 'done' ? ' · Finished' : s === 'progress' ? ` · ${pct}% listened` : ''}${d.noteCount ? ` · ${plural(d.noteCount, 'note')}` : ''}</p>
            ${q && !d.title.toLowerCase().includes(q.toLowerCase()) ? `<p class="lib-snippet">${snippet(d.text, q)}</p>` : ''}
            ${s === 'progress' ? `<div class="lib-progress">${progressHTML(pct)}</div>` : ''}
          </div>
          <div class="lib-actions">
            <button type="button" class="icon-btn" data-act="more" aria-haspopup="menu" aria-expanded="false" aria-label="More options for ${esc(d.title)}">${icon('more')}</button>
            <ul class="menu" role="menu" hidden>
              <li role="none"><button type="button" role="menuitem" data-act="rename">${icon('pencil')}Rename</button></li>
              <li role="none"><button type="button" role="menuitem" class="danger" data-act="delete">${icon('trash')}Delete</button></li>
            </ul>
          </div>
        </li>`;
      })
      .join('');
    applyPct(list);
  }

  function closeMenus(except) {
    $$('.menu', list).forEach((m) => {
      if (m === except) return;
      m.hidden = true;
      m.previousElementSibling?.setAttribute('aria-expanded', 'false');
    });
  }
  function openMenu(btn) {
    const menu = btn.nextElementSibling;
    closeMenus(menu);
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    menu.querySelector('[role="menuitem"]').focus();
  }

  const announceResults = debounce(() => {
    const n = filtered().length;
    $('#lib-results', main).textContent = `${plural(n, 'item')} shown`;
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
    const row = btn.closest('.lib-row');
    const id = row.dataset.id;
    const doc = docs.find((d) => d.id === id);
    const act = btn.dataset.act;
    const form = row.querySelector('.rename-inline');
    const title = row.querySelector('.lib-title');
    const more = row.querySelector('[data-act="more"]');

    if (act === 'more') {
      if (btn.getAttribute('aria-expanded') === 'true') closeMenus();
      else openMenu(btn);
    } else if (act === 'rename') {
      closeMenus();
      title.hidden = true;
      form.hidden = false;
      form.querySelector('input').focus();
      form.querySelector('input').select();
    } else if (act === 'cancel') {
      form.hidden = true;
      title.hidden = false;
      more.focus();
    } else if (act === 'delete') {
      closeMenus();
      const ok = await confirmDialog({
        title: `Delete “${doc.title}”?`,
        body: `This removes it, your place in it${doc.noteCount ? ` and ${plural(doc.noteCount, 'note')}` : ''} from this device. You can’t undo this.`,
      });
      if (!ok) return more.focus();
      const pos = filtered().findIndex((d) => d.id === id);
      await repo.deleteDocument(id);
      await load();
      announce(`Deleted ${doc.title}`);
      const links = $$('.lib-title a', list);
      (links[Math.min(pos, links.length - 1)] || search).focus();
    }
  });

  // Menu keyboard: arrows move, Escape closes and returns to the button.
  list.addEventListener('keydown', (e) => {
    const menu = e.target.closest('.menu');
    if (menu) {
      const items = $$('[role="menuitem"]', menu);
      const i = items.indexOf(e.target);
      if (e.key === 'ArrowDown') items[(i + 1) % items.length].focus();
      else if (e.key === 'ArrowUp') items[(i - 1 + items.length) % items.length].focus();
      else if (e.key === 'Escape') {
        closeMenus();
        menu.previousElementSibling.focus();
      } else return;
      e.preventDefault();
    } else if (e.key === 'Escape' && e.target.closest('.rename-inline')) {
      e.target.closest('.lib-row').querySelector('[data-act="cancel"]').click();
    }
  });
  const onDocClick = (e) => {
    if (!e.target.closest('.lib-actions')) closeMenus();
  };
  document.addEventListener('click', onDocClick);

  list.addEventListener('submit', async (e) => {
    e.preventDefault();
    const row = e.target.closest('.lib-row');
    const updated = await repo.renameDocument(row.dataset.id, e.target.querySelector('input').value);
    docs.find((d) => d.id === row.dataset.id).title = updated.title;
    draw();
    announce(`Renamed to ${updated.title}`);
    $(`.lib-row[data-id="${row.dataset.id}"] [data-act="more"]`, list)?.focus();
  });

  const onChange = (e) => e.detail.origin === 'remote' && load();
  repo.addEventListener('change', onChange);
  await load();
  return () => {
    repo.removeEventListener('change', onChange);
    document.removeEventListener('click', onDocClick);
  };
}
