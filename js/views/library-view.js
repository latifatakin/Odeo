// My library: one toolbar row (search, a sort menu, a filter menu), then the list,
// with a More menu on each row for Rename and Delete.

import { repo } from '../storage/repo.js';
import { getSettings } from '../settings.js';
import { minutesFor } from '../text.js';
import { docRowHTML, applyPct, progressPct, kindLabel } from '../covers.js';
import { $, $$, esc, icon, announce, confirmDialog, formatDate, plural, debounce } from '../ui.js';
import { addBoxHTML, bindAddBox } from '../add-box.js';

const SORT_KEY = 'odeo:library-sort';
const ORDER_KEY = 'odeo:library-order';

const SORTS = {
  opened: { label: 'Recents', icon: 'clock', defaultOrder: 'desc' },
  added: { label: 'Date added', icon: 'calendar', defaultOrder: 'desc' },
  title: { label: 'Name', icon: 'sort-az', defaultOrder: 'asc' },
};
const FILTERS = {
  all: { label: 'All', icon: 'library', empty: 'Nothing here yet' },
  unread: { label: 'Unread', icon: 'unread', empty: 'Nothing unread' },
  uploads: { label: 'Uploads', icon: 'upload', empty: 'No uploads yet' },
  links: { label: 'Links', icon: 'link', empty: 'No links yet' },
};

// Empty state: a heading, then the same upload prompt as Home.
function addPanelHTML(heading, sub) {
  return `<section class="lib-empty" aria-labelledby="lib-empty-h">
    <h2 class="lib-empty-title" id="lib-empty-h">${esc(heading)}</h2>
    <p class="lib-empty-sub">${esc(sub)}</p>
    ${addBoxHTML('lib')}
  </section>`;
}
const orderLabel = (sort, order) =>
  sort === 'title' ? (order === 'asc' ? 'A to Z' : 'Z to A') : order === 'desc' ? 'New to old' : 'Old to new';
const check = () => `<span class="menu-check">${icon('check')}</span>`;
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
  let order = 'desc';
  let filter = 'all';
  try {
    sort = SORTS[localStorage.getItem(SORT_KEY)] ? localStorage.getItem(SORT_KEY) : 'opened';
    order = ['asc', 'desc'].includes(localStorage.getItem(ORDER_KEY)) ? localStorage.getItem(ORDER_KEY) : SORTS[sort].defaultOrder;
  } catch {}
  const rate = getSettings().rate;

  main.innerHTML = `
  <div class="page page--narrow">
    <header class="page-head">
      <h1>My library</h1>
      <p>Everything you’ve listened to. It all plays offline, too.</p>
    </header>

    <div class="library-tools" id="lib-tools">
      <div class="search lib-search" role="search">
        ${icon('search')}
        <label class="sr-only" for="lib-search">Search your library</label>
        <input id="lib-search" type="search" placeholder="Search" autocomplete="off" />
      </div>

      <div class="tool-menu">
        <button type="button" class="tool-btn" id="sort-btn" aria-haspopup="menu" aria-expanded="false" aria-controls="sort-menu">
          <span class="sort-ico" id="sort-ico" aria-hidden="true"></span><span class="sort-label">Sort by</span><span class="sr-only">, <span id="sort-label"></span></span>${icon('chevron-down')}
        </button>
        <div class="menu menu--tool" id="sort-menu" role="menu" aria-label="Sort" hidden>
          <p class="menu-label" id="sort-by-label">Sort by</p>
          <div role="group" aria-labelledby="sort-by-label">
            ${Object.entries(SORTS).map(([k, s]) => `<button type="button" role="menuitemradio" data-sort="${k}">${icon(s.icon)}<span>${s.label}</span>${check()}</button>`).join('')}
          </div>
          <p class="menu-label" id="order-label">Order</p>
          <div role="group" aria-labelledby="order-label">
            <button type="button" role="menuitemradio" data-order="desc">${icon('arrow-down')}<span data-order-text></span>${check()}</button>
            <button type="button" role="menuitemradio" data-order="asc">${icon('arrow-up')}<span data-order-text></span>${check()}</button>
          </div>
        </div>
      </div>

      <div class="tool-menu">
        <button type="button" class="icon-btn tool-icon" id="filter-btn" aria-haspopup="menu" aria-expanded="false" aria-controls="filter-menu" aria-label="Filter">
          ${icon('filter')}<span class="filter-dot" aria-hidden="true" hidden></span>
        </button>
        <div class="menu menu--tool" id="filter-menu" role="menu" aria-label="Filter" hidden>
          ${Object.entries(FILTERS).map(([k, f]) => `<button type="button" role="menuitemradio" data-filter="${k}">${icon(f.icon)}<span>${f.label}</span>${check()}</button>`).join('')}
        </div>
      </div>
    </div>

    <p class="sr-only" id="lib-results" role="status"></p>
    <ul class="lib-list section" id="lib-list"></ul>
    <div id="lib-empty" class="section"></div>
    <p class="caption storage-line" id="lib-storage"></p>
  </div>`;

  const list = $('#lib-list', main);
  const emptyBox = $('#lib-empty', main);
  const search = $('#lib-search', main);
  let docs = [];

  const state = (d) => (d.progress?.completed ? 'done' : progressPct(d) > 0 ? 'progress' : 'new');

  async function load() {
    docs = await repo.listDocuments();
    const usage = await repo.usage();
    const hasDocs = docs.length > 0;
    $('#lib-tools', main).hidden = !hasDocs;
    $('#lib-storage', main).textContent = `${plural(docs.length, 'item')} saved on this device. Using ${formatMB(usage.bytes)} of about ${formatMB(usage.quota)}.`;
    draw();
  }

  function filtered() {
    const q = search.value.trim().toLowerCase();
    const keep = {
      all: () => true,
      unread: (d) => state(d) === 'new',
      uploads: (d) => ['pdf', 'txt'].includes(d.source?.type),
      links: (d) => d.source?.type === 'link',
    }[filter];
    const out = docs.filter((d) => keep(d) && (!q || d.title.toLowerCase().includes(q) || d.text.toLowerCase().includes(q)));
    const byKey = {
      title: (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
      added: (a, b) => a.createdAt.localeCompare(b.createdAt),
      opened: (a, b) => a.lastOpenedAt.localeCompare(b.lastOpenedAt),
    }[sort];
    out.sort((a, b) => (order === 'asc' ? byKey(a, b) : byKey(b, a)));
    return out;
  }

  function draw() {
    const q = search.value.trim();
    const items = filtered();
    closeMenus();
    if (!items.length) {
      list.innerHTML = '';
      // Search with no match: a short message. Empty library or empty filter: ways to add something.
      if (q) {
        emptyBox.innerHTML = `<div class="lib-empty lib-empty--search">
          <h2 class="lib-empty-title">Nothing matches “${esc(q)}”</h2>
          <p class="lib-empty-sub">Try another word.</p>
        </div>`;
      } else {
        const heading = !docs.length ? 'Add your first file' : FILTERS[filter].empty;
        emptyBox.innerHTML = addPanelHTML(heading, !docs.length ? 'Everything you add is saved here, so you can listen any time, even offline.' : 'Add something new to listen to.');
        bindAddBox(emptyBox);
      }
      return;
    }
    emptyBox.innerHTML = '';
    list.innerHTML = items
      .map((d) => {
        const pct = progressPct(d);
        const s = state(d);
        const mins = Math.max(1, Math.round(minutesFor(d.wordCount, rate)));
        return docRowHTML(d, {
          titleHTML: highlight(d.title, q),
          meta: `${esc(kindLabel(d))} · ${mins} min listen · Added ${formatDate(d.createdAt)}${s === 'done' ? ' · Finished' : s === 'progress' ? ` · ${pct}% listened` : ''}${d.noteCount ? ` · ${plural(d.noteCount, 'note')}` : ''}`,
          progress: s === 'progress' ? pct : null,
          extra: `<form class="rename-inline" hidden>
              <label class="sr-only" for="rn-${d.id}">New title for ${esc(d.title)}</label>
              <input id="rn-${d.id}" class="input" type="text" maxlength="120" value="${esc(d.title)}" autocomplete="off" />
              <button type="submit" class="btn btn--primary">Save</button>
              <button type="button" class="btn btn--secondary" data-act="cancel">Cancel</button>
            </form>
            ${q && !d.title.toLowerCase().includes(q.toLowerCase()) ? `<p class="lib-snippet">${snippet(d.text, q)}</p>` : ''}`,
          actions: `<div class="lib-actions">
            <button type="button" class="icon-btn" data-act="more" aria-haspopup="menu" aria-expanded="false" aria-label="More options for ${esc(d.title)}">${icon('more')}</button>
            <ul class="menu" role="menu" hidden>
              <li role="none"><button type="button" role="menuitem" data-act="rename">${icon('pencil')}Rename</button></li>
              <li role="none"><button type="button" role="menuitem" class="danger" data-act="delete">${icon('trash')}Delete</button></li>
            </ul>
          </div>`,
        });
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
    toolMenus.forEach((m) => m.close());
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

  // ---------- Toolbar menus (sort and filter) ----------
  // Menu buttons: click or arrow keys open; arrows, Home and End move; Enter or
  // Space picks; Escape closes and returns to the button; Tab closes.
  const toolMenus = [];
  function toolMenu(btn, menu, onPick) {
    const items = () => $$('[role^="menuitem"]', menu);
    const close = (focusBtn = false) => {
      if (menu.hidden) return;
      menu.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      if (focusBtn) btn.focus();
    };
    let byPointer = false;
    const open = () => {
      toolMenus.forEach((m) => m.close());
      closeMenus();
      menu.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      const list = items();
      // Show the focus ring only for keyboard users; a mouse or touch open stays clean.
      (list.find((i) => i.getAttribute('aria-checked') === 'true') || list[0]).focus({ focusVisible: !byPointer });
      byPointer = false;
    };
    btn.addEventListener('pointerdown', () => (byPointer = true));
    btn.addEventListener('click', () => (menu.hidden ? open() : close()));
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        open();
      }
    });
    menu.addEventListener('keydown', (e) => {
      const list = items();
      const i = list.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') list[(i + 1) % list.length].focus();
      else if (e.key === 'ArrowUp') list[(i - 1 + list.length) % list.length].focus();
      else if (e.key === 'Home') list[0].focus();
      else if (e.key === 'End') list[list.length - 1].focus();
      else if (e.key === 'Escape') close(true);
      else if (e.key === 'Tab') return close();
      else return;
      e.preventDefault();
    });
    menu.addEventListener('click', (e) => {
      const item = e.target.closest('[role^="menuitem"]');
      if (!item) return;
      onPick(item);
      close(true);
    });
    const api = { close, el: menu, btn };
    toolMenus.push(api);
    return api;
  }

  function syncSortMenu() {
    $('#sort-label', main).textContent = SORTS[sort].label;
    $('#sort-ico', main).innerHTML = icon(SORTS[sort].icon); // shown instead of the word on narrow phones
    $$('[data-sort]', main).forEach((b) => b.setAttribute('aria-checked', String(b.dataset.sort === sort)));
    $$('[data-order]', main).forEach((b) => {
      b.setAttribute('aria-checked', String(b.dataset.order === order));
      b.querySelector('[data-order-text]').textContent = orderLabel(sort, b.dataset.order);
    });
  }
  function setFilter(next) {
    filter = next;
    $$('[data-filter]', main).forEach((b) => b.setAttribute('aria-checked', String(b.dataset.filter === filter)));
    const on = filter !== 'all';
    $('#filter-btn', main).setAttribute('aria-label', on ? `Filter: ${FILTERS[filter].label}` : 'Filter');
    $('#filter-btn', main).classList.toggle('is-on', on);
    $('.filter-dot', main).hidden = !on;
    draw();
    announceResults();
  }

  toolMenu($('#sort-btn', main), $('#sort-menu', main), (item) => {
    if (item.dataset.sort) {
      sort = item.dataset.sort;
      order = SORTS[sort].defaultOrder; // each sort starts in its natural order
    } else order = item.dataset.order;
    try {
      localStorage.setItem(SORT_KEY, sort);
      localStorage.setItem(ORDER_KEY, order);
    } catch {}
    syncSortMenu();
    draw();
  });
  toolMenu($('#filter-btn', main), $('#filter-menu', main), (item) => setFilter(item.dataset.filter));
  syncSortMenu();
  $$('[data-filter]', main).forEach((b) => b.setAttribute('aria-checked', String(b.dataset.filter === filter)));

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
    if (!e.target.closest('.tool-menu')) toolMenus.forEach((m) => m.close());
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
