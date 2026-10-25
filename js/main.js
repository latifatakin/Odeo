import { repo } from './storage/repo.js';
import { initSettings } from './settings.js';
import { initImporters } from './importers.js';
import { route, startRouter } from './router.js';
import { $ } from './ui.js';

route('home', () => import('./views/home-view.js'));
route('text', () => import('./views/text-view.js'));
route('file', () => import('./views/file-view.js'));
route('library', () => import('./views/library-view.js'));
route('notes', () => import('./views/notes-view.js'));
route('session', () => import('./views/session-view.js'));

function updateOnline() {
  $('#offline-banner').hidden = navigator.onLine;
}
window.addEventListener('online', updateOnline);
window.addEventListener('offline', updateOnline);

async function start() {
  await repo.init();
  await initSettings();
  initImporters();
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
