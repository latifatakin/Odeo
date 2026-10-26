// Small UI helpers shared by every view.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export const icon = (name, cls = '') =>
  `<svg class="icon ${cls}" aria-hidden="true" focusable="false"><use href="#i-${name}"></use></svg>`;

// Screen reader announcements. Clearing first makes repeated messages speak again.
export function announce(message, { assertive = false } = {}) {
  const el = document.getElementById(assertive ? 'announcer-assertive' : 'announcer-polite');
  el.textContent = '';
  setTimeout(() => (el.textContent = message), 60);
}

// A visible message that also gets announced.
export function toast(message, { type = 'info', duration = 6000 } = {}) {
  const region = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.innerHTML = `${icon(type === 'error' ? 'alert' : 'check-circle')}<span>${esc(message)}</span>
    <button type="button" class="icon-btn" aria-label="Dismiss message">${icon('x')}</button>`;
  region.append(el);
  announce(message, { assertive: type === 'error' });

  let timer;
  const close = () => el.remove();
  const start = () => (timer = setTimeout(close, duration));
  const stop = () => clearTimeout(timer);
  el.querySelector('button').addEventListener('click', close);
  // Pause the timer while someone is reading or focused on it.
  el.addEventListener('mouseenter', stop);
  el.addEventListener('mouseleave', start);
  el.addEventListener('focusin', stop);
  el.addEventListener('focusout', start);
  start();
}

// Only one confirmation can be waiting at a time, so an answer can never
// apply to an earlier request by mistake.
let pendingConfirm = null;

export function confirmDialog({ title, body, confirmLabel = 'Delete' }) {
  const dlg = document.getElementById('confirm-dialog');
  if (!dlg.dataset.bound) {
    dlg.dataset.bound = '1';
    dlg.addEventListener('close', () => {
      const p = pendingConfirm;
      pendingConfirm = null;
      p?.resolve(dlg.returnValue === 'confirm');
      if (p?.opener?.isConnected) p.opener.focus();
    });
  }
  if (pendingConfirm) {
    pendingConfirm.resolve(false);
    pendingConfirm = null;
  }

  dlg.querySelector('#confirm-title').textContent = title;
  dlg.querySelector('#confirm-body').textContent = body;
  dlg.querySelector('#confirm-ok').textContent = confirmLabel;
  dlg.returnValue = '';
  const opener = document.activeElement;
  return new Promise((resolve) => {
    pendingConfirm = { resolve, opener };
    if (!dlg.open) dlg.showModal();
  });
}

// Close a modal <dialog> when its backdrop is clicked.
export function closeOnBackdrop(dlg) {
  dlg.addEventListener('click', (e) => {
    if (e.target !== dlg) return;
    const r = dlg.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) dlg.close('close');
  });
}

const dateFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const shortFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });
const timeFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export const formatDate = (iso) => dateFmt.format(new Date(iso));
export const formatShortDate = (iso) => shortFmt.format(new Date(iso));
export const formatDateTime = (iso) => timeFmt.format(new Date(iso));

export function formatRelative(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  if (diff < 86400 * 7) {
    const d = Math.floor(diff / 86400);
    return d === 1 ? 'yesterday' : `${d} days ago`;
  }
  return formatDate(iso);
}

export function formatDuration(minutes) {
  const total = Math.max(0, Math.round(minutes * 60));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function plural(n, one, many = one + 's') {
  return `${n} ${n === 1 ? one : many}`;
}

export function debounce(fn, ms) {
  let t;
  const wrapped = (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
  wrapped.flush = (...args) => {
    clearTimeout(t);
    fn(...args);
  };
  return wrapped;
}

export function titleFromText(text, max = 48) {
  const firstLine = text.trim().split(/\n/)[0].replace(/\s+/g, ' ');
  if (firstLine.length <= max) return firstLine || 'Untitled';
  const cut = firstLine.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(' ') > 20 ? cut.lastIndexOf(' ') : max).trim() + '…';
}
