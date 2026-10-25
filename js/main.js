import { repo } from './storage/repo.js';
import { initSettings } from './settings.js';
import { route, startRouter } from './router.js';
import { $, $$, esc, icon, formatShortDate, plural } from './ui.js';

route('text', () => import('./views/text-view.js'));
route('file', () => import('./views/file-view.js'));
route('library', () => import('./views/library-view.js'));
route('session', () => import('./views/session-view.js'));

// ---------- Mobile drawer ----------

const sidebar = $('#sidebar');
const backdrop = $('.backdrop');
const menuBtn = $('.menu-open');
const phone = window.matchMedia('(max-width: 767.98px)');

function setDrawer(open, { restoreFocus = true } = {}) {
  const isOpen = sidebar.classList.contains('is-open');
  if (open === isOpen) return;
  sidebar.classList.toggle('is-open', open);
  backdrop.hidden = !open;
  menuBtn.setAttribute('aria-expanded', String(open));
  // While the drawer is open, the rest of the page can't be reached.
  $('#main').inert = open;
  $('.topbar').inert = open;
  if (open) {
    sidebar.setAttribute('role', 'dialog');
    sidebar.setAttribute('aria-modal', 'true');
    sidebar.setAttribute('aria-label', 'Menu');
    $('.sidebar-close').focus();
  } else {
    sidebar.removeAttribute('role');
    sidebar.removeAttribute('aria-modal');
    sidebar.setAttribute('aria-label', 'Sidebar');
    if (restoreFocus) menuBtn.focus();
  }
}

menuBtn.addEventListener('click', () => setDrawer(true));
$('.sidebar-close').addEventListener('click', () => setDrawer(false));
backdrop.addEventListener('click', () => setDrawer(false));
sidebar.addEventListener('keydown', (e) => {
  if (!sidebar.classList.contains('is-open')) return;
  if (e.key === 'Escape') setDrawer(false);
  if (e.key === 'Tab') {
    // Keep focus inside the drawer.
    const items = $$('a, button', sidebar).filter((el) => el.offsetParent !== null);
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});
sidebar.addEventListener('click', (e) => {
  if (e.target.closest('a')) setDrawer(false, { restoreFocus: false });
});
phone.addEventListener('change', () => setDrawer(false, { restoreFocus: false }));

// ---------- Recents ----------

async function renderRecents() {
  const docs = (await repo.listDocuments()).sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt)).slice(0, 5);
  const box = $('#recents');
  if (!docs.length) {
    setHTML(box, `<div class="recents-empty">
      <div class="empty-icon">${icon('book')}</div>
      <strong>No sessions yet</strong>
      Create your first session
    </div>`);
    return;
  }
  const current = location.hash.startsWith('#/session/') ? location.hash.split('/')[2] : null;
  setHTML(box, `<ul>${docs
    .map(
      (d) => `<li><a href="#/session/${d.id}" data-id="${d.id}" ${d.id === current ? 'aria-current="page"' : ''}>
        <span class="recent-title">${esc(d.title)}</span>
        <span class="recent-meta">
          <span>${icon('calendar')}${formatShortDate(d.lastOpenedAt)}</span>
          <span>${icon('comment')}<span class="sr-only">${plural(d.noteCount, 'note')}</span><span aria-hidden="true">${d.noteCount}</span></span>
        </span>
      </a></li>`
    )
    .join('')}</ul>`);
}

// Only replace the list when it changed, so a focused link keeps focus.
function setHTML(el, html) {
  if (el.dataset.html === html) return;
  el.dataset.html = html;
  el.innerHTML = html;
}

// ---------- Offline banner ----------

function updateOnline() {
  $('#offline-banner').hidden = navigator.onLine;
}
window.addEventListener('online', updateOnline);
window.addEventListener('offline', updateOnline);

// ---------- Start ----------

async function start() {
  await repo.init();
  await initSettings();
  repo.addEventListener('change', (e) => {
    if (['documents', 'notes', 'progress'].includes(e.detail.collection)) renderRecents();
  });
  await renderRecents();
  updateOnline();
  startRouter();

  // Offline support. Skipped on localhost so edits show up straight away;
  // add ?sw to the address to test offline mode locally.
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  if ('serviceWorker' in navigator && location.protocol !== 'file:' && (!local || location.search.includes('sw'))) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

start();
