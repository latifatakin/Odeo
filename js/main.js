import { repo } from './storage/repo.js';
import { initSettings } from './settings.js';
import { initImporters } from './importers.js';
import { readingSettingsHTML, bindSettings, nextPrefix } from './settings-ui.js';
import { route, startRouter } from './router.js';
import { $, closeOnBackdrop } from './ui.js';

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
  btn.querySelector('.nav-label').textContent = collapsed ? 'Expand menu' : 'Collapse menu';
  btn.setAttribute('aria-label', collapsed ? 'Expand menu' : 'Collapse menu');
}
$('#nav-collapse').removeAttribute('aria-pressed');
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
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

start();
