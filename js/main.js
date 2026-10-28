import { repo } from './storage/repo.js';
import { initSettings } from './settings.js';
import { initImporters } from './importers.js';
import { readingSettingsHTML, bindSettings, nextPrefix } from './settings-ui.js';
import { route, startRouter } from './router.js';
import { $, closeOnBackdrop, toast } from './ui.js';

route('home', () => import('./views/home-view.js'));
route('text', () => import('./views/text-view.js'));
route('file', () => import('./views/file-view.js'));
route('library', () => import('./views/library-view.js'));
route('notes', () => import('./views/notes-view.js'));
route('settings', () => import('./views/settings-view.js'));
route('help', () => import('./views/help-view.js'));
route('session', () => import('./views/session-view.js'));

// ---------- Side navigation: collapse to the rail, remember the choice ----------

function syncCollapse() {
  const btn = $('#nav-collapse');
  let collapsed = false;
  try {
    collapsed = localStorage.getItem('odeo:nav') === 'collapsed';
  } catch {}
  const label = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
  btn.setAttribute('aria-label', label);
  btn.setAttribute('title', label);
  btn.setAttribute('aria-expanded', String(!collapsed));
  btn.querySelector('use').setAttribute('href', collapsed ? '#i-chevron-right' : '#i-chevron-left');
}
$('#nav-collapse').addEventListener('click', () => {
  try {
    const collapsed = localStorage.getItem('odeo:nav') === 'collapsed';
    localStorage.setItem('odeo:nav', collapsed ? 'open' : 'collapsed');
  } catch {}
  window.odeoNavMode?.();
  syncCollapse();
  $('#nav-collapse').focus();
});
syncCollapse();

// ---------- Reading settings sheet ----------

export function openReadingSettings() {
  const dlg = $('#reading-dialog');
  const body = dlg.querySelector('[data-reading-settings]');
  const opener = document.activeElement;
  body.innerHTML = `<div class="settings">${readingSettingsHTML(nextPrefix())}</div>`;
  const unbind = bindSettings(body);
  dlg.addEventListener(
    'close',
    () => {
      unbind();
      if (opener?.isConnected) opener.focus();
    },
    { once: true }
  );
  dlg.showModal();
}

function initReadingSheet() {
  const dlg = $('#reading-dialog');
  closeOnBackdrop(dlg);
  dlg.querySelector('.sheet-close').addEventListener('click', () => dlg.close());
  document.addEventListener('click', (e) => {
    if (e.target.closest('.reading-open')) openReadingSettings();
  });
}

// ---------- Offline notice ----------

function updateOnline() {
  $('#offline-banner').hidden = navigator.onLine;
}
window.addEventListener('online', updateOnline);
window.addEventListener('offline', updateOnline);

async function start() {
  await repo.init();
  await initSettings();
  initImporters();
  initReadingSheet();
  updateOnline();
  startRouter();

  // Offline support. Skipped on localhost so edits show up straight away;
  // add ?sw to the address to test offline mode locally.
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  if ('serviceWorker' in navigator && location.protocol !== 'file:' && (!local || location.search.includes('sw'))) {
    initUpdates();
  }
}

// New versions: the service worker installs a new deploy in the background.
// When it takes over, reload once at a calm moment so people see the update,
// never while audio is playing, someone is typing, or a sheet is open.
const UPDATED_FLAG = 'odeo:updated';

function safeToReload() {
  if (window.speechSynthesis?.speaking) return false;
  if (document.querySelector('dialog[open]')) return false;
  if (['text', 'file'].includes(document.body.dataset.view)) return false;
  const el = document.activeElement;
  if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return false;
  return true;
}

function initUpdates() {
  const sw = navigator.serviceWorker;
  const hadController = Boolean(sw.controller); // false on a first visit: nothing to refresh
  let pending = false;

  const tryReload = () => {
    if (!pending || !safeToReload()) return;
    pending = false;
    try { sessionStorage.setItem(UPDATED_FLAG, '1'); } catch {}
    location.reload();
  };

  sw.addEventListener('controllerchange', () => {
    if (!hadController || pending) return;
    pending = true;
    tryReload();
    if (pending) {
      document.addEventListener('routechange', tryReload);
      document.addEventListener('focusout', () => setTimeout(tryReload, 0));
      setInterval(tryReload, 3000);
    }
  });

  sw.register('sw.js', { updateViaCache: 'none' })
    .then((reg) => {
      // Look for a new deploy whenever someone comes back to the tab.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
    })
    .catch(() => {});

  try {
    if (sessionStorage.getItem(UPDATED_FLAG)) {
      sessionStorage.removeItem(UPDATED_FLAG);
      toast('Ôdēō has been updated.');
    }
  } catch {}
}

start();
