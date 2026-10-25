// Generated covers and voice avatars: a tint picked from the id, so the
// same item always gets the same colour.

import { esc } from './ui.js';

export function tintFor(key = '') {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return (h % 5) + 1;
}

const KIND = { paste: 'Text', pdf: 'PDF', txt: 'TXT', sample: 'Sample' };
export const kindLabel = (doc) => KIND[doc.source?.type] || 'Text';

export function progressPct(doc) {
  const p = doc.progress;
  if (p?.completed) return 100;
  if (!p || doc.wordCount < 2) return 0;
  return Math.round((p.wordIndex / (doc.wordCount - 1)) * 100);
}

export function coverHTML(doc, { small = false } = {}) {
  const pct = progressPct(doc);
  return `<div class="cover${small ? ' cover--sm' : ''}" data-tint="${tintFor(doc.id)}" aria-hidden="true">
    <span class="cover-kind">${esc(kindLabel(doc))}</span>
    ${small ? `<span class="cover-initial">${esc((doc.title.match(/[\p{L}\p{N}]/u) || ['•'])[0].toUpperCase())}</span>` : `<span class="cover-title">${esc(doc.title)}</span>`}
    ${pct > 0 ? `<span class="cover-progress"><span data-pct="${pct}"></span></span>` : ''}
  </div>`;
}

// Inline styles are blocked by the security policy, so widths are set here.
export function applyPct(root) {
  root.querySelectorAll('[data-pct]').forEach((el) => el.style.setProperty('--pct', `${el.dataset.pct}%`));
}

const LANG_NAMES = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(undefined, { type: 'language' }) : null;
const REGION_NAMES = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(undefined, { type: 'region' }) : null;

export function languageName(lang = '') {
  const [l, r] = lang.replace('_', '-').split('-');
  let name = l;
  try {
    name = LANG_NAMES?.of(l) || l;
  } catch {}
  if (r) {
    let region = r;
    try {
      region = REGION_NAMES?.of(r.toUpperCase()) || r;
    } catch {}
    return `${name} (${region})`;
  }
  return name;
}

// Short, friendly voice name: "Google UK English Female" → "UK English Female"
export function voiceShortName(v) {
  return v.name.replace(/^(Microsoft|Google|Apple)\s+/i, '').replace(/\s*\(.*$/, '').replace(/\s+Online.*$/i, '').trim() || v.name;
}

export function avatarHTML(v) {
  const name = v ? voiceShortName(v) : '?';
  return `<span class="avatar" data-tint="${tintFor(v?.voiceURI || name)}" aria-hidden="true">${esc(name.charAt(0).toUpperCase())}</span>`;
}
