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

// ---------- Settings menu (pop-up from the Settings row) ----------

function initSettingsMenu() {
  const btn = $('#settings-menu-btn');
  const menu = $('#settings-menu');
  const items = () => [...menu.querySelectorAll('[role="menuitem"]')];

  const open = (focusIndex = 0) => {
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    items()[focusIndex]?.focus();
  };
  const close = ({ focusButton = false } = {}) => {
    if (menu.hidden) return;
    menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    if (focusButton) btn.focus();
  };

  btn.addEventListener('click', () => (menu.hidden ? open() : close()));
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      open(e.key === 'ArrowUp' ? items().length - 1 : 0);
    }
  });
  menu.addEventListener('keydown', (e) => {
    const list = items();
    const i = list.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') list[(i + 1) % list.length].focus();
    else if (e.key === 'ArrowUp') list[(i - 1 + list.length) % list.length].focus();
    else if (e.key === 'Home') list[0].focus();
    else if (e.key === 'End') list[list.length - 1].focus();
    else if (e.key === 'Escape') close({ focusButton: true });
    else if (e.key === 'Tab') close();
    else return;
    if (e.key !== 'Tab') e.preventDefault();
  });
  menu.addEventListener('click', (e) => {
    if (e.target.closest('[role="menuitem"]')) close();
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#settings-menu, #settings-menu-btn')) close();
  });
  document.addEventListener('routechange', () => close());
}

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
  initSettingsMenu();
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
