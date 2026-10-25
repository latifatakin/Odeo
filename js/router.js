// Hash router: #/text, #/file, #/library, #/session/<id>
// Hash routes work on any static host with no server rules.

import { $$ } from './ui.js';

const routes = new Map();
let cleanup = null;
let firstRender = true;
let navToken = 0;

export function route(name, loader) {
  routes.set(name, loader);
}

export function navigate(path, { replace = false } = {}) {
  const hash = `#/${path}`;
  if (location.hash === hash) return render();
  if (replace) {
    history.replaceState(null, '', hash);
    render();
  } else location.hash = hash;
}

export function currentRoute() {
  const [name = 'text', ...rest] = location.hash.replace(/^#\/?/, '').split('/');
  return { name: routes.has(name) ? name : 'text', params: rest.map(decodeURIComponent) };
}

async function render() {
  const token = ++navToken;
  const { name, params } = currentRoute();
  const main = document.getElementById('main');

  if (cleanup) {
    try {
      await cleanup();
    } catch {}
    cleanup = null;
  }
  if (token !== navToken) return;

  const view = await routes.get(name)();
  if (token !== navToken) return;

  main.innerHTML = '';
  const result = await view.render(main, params);
  cleanup = typeof result === 'function' ? result : null;

  // Navigation state
  $$('.nav a').forEach((a) => {
    const active = a.dataset.route === name || (name === 'session' && a.dataset.route === 'library');
    if (a.dataset.route === name) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
    a.classList.toggle('is-section', active && a.dataset.route !== name);
  });
  $$('.recents a').forEach((a) => {
    if (name === 'session' && a.dataset.id === params[0]) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });

  // Move focus to the new page's heading so screen reader and keyboard users
  // start at the top of the new content (not on first load).
  const h1 = main.querySelector('h1');
  if (h1) {
    document.title = `${h1.textContent.trim()} — Ôdēō`;
    if (!firstRender) {
      h1.setAttribute('tabindex', '-1');
      h1.focus({ preventScroll: true });
    }
  }
  if (!firstRender) window.scrollTo(0, 0);
  firstRender = false;
  document.dispatchEvent(new CustomEvent('routechange', { detail: { name, params } }));
}

export function startRouter() {
  window.addEventListener('hashchange', render);
  render();
}
