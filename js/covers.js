// File-type tiles, progress, voice letters and language names.

import { esc } from './ui.js';

const KIND = { paste: 'Text', pdf: 'PDF', txt: 'TXT', sample: 'Text' };
export const kindLabel = (doc) => KIND[doc.source?.type] || 'Text';
// Pasted text sits on secondary-soft, files on primary-soft.
export const isPasted = (doc) => ['paste', 'sample'].includes(doc.source?.type || 'paste');

export function progressPct(doc) {
  const p = doc.progress;
  if (p?.completed) return 100;
  if (!p || doc.wordCount < 2) return 0;
  return Math.round((p.wordIndex / (doc.wordCount - 1)) * 100);
}

export function typeTileHTML(doc) {
  return `<span class="type-tile${isPasted(doc) ? ' type-tile--text' : ''}" aria-hidden="true">${esc(kindLabel(doc))}</span>`;
}

export function progressHTML(pct) {
  return `<span class="progress-line" aria-hidden="true"><span data-pct="${pct}"></span></span>`;
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

// Friendly voice name: "Google UK English Female" -> "UK English Female"
export function voiceShortName(v) {
  return v.name.replace(/^(Microsoft|Google|Apple)\s+/i, '').replace(/\s*\(.*$/, '').replace(/\s+Online.*$/i, '').trim() || v.name;
}

// Voices show the first letter of their name in a primary-soft circle.
export function avatarHTML(v) {
  const name = v ? voiceShortName(v) : '?';
  return `<span class="avatar" aria-hidden="true">${esc(name.charAt(0).toUpperCase())}</span>`;
}
