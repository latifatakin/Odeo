// File-type tiles, progress, voice letters and language names.

import { esc, icon } from './ui.js';

const KIND = { paste: 'Text', pdf: 'PDF', txt: 'TXT', sample: 'Text', link: 'Web' };
export const kindLabel = (doc) => KIND[doc.source?.type] || 'Text';
// Pasted text sits on secondary-soft, files and links on the neutral --ui-active.
export const isPasted = (doc) => ['paste', 'sample'].includes(doc.source?.type || 'paste');

export function progressPct(doc) {
  const p = doc.progress;
  if (p?.completed) return 100;
  if (!p || doc.wordCount < 2) return 0;
  return Math.round((p.wordIndex / (doc.wordCount - 1)) * 100);
}

// File tiles: a rounded square with the file type's icon over a soft wave.
// Pasted text is warm yellow; files and links are neutral (purple is for calls to action).
const TILE_ICON = { pdf: 'file-pdf', txt: 'file-txt', link: 'globe', paste: 'file-text', sample: 'file-text' };
export function typeTileHTML(doc) {
  const type = doc.source?.type || 'paste';
  return `<span class="type-tile type-tile--${isPasted(doc) ? 'text' : 'file'}" aria-hidden="true">${icon(TILE_ICON[type] || 'file-text')}</span>`;
}

// One list row for Continue listening and My library: tile, title, details,
// an optional progress line, extra content and actions. The title link covers the row.
export function docRowHTML(doc, { titleHTML = esc(doc.title), level = 2, meta = '', progress = null, extra = '', actions = '' } = {}) {
  return `<li class="lib-row" data-id="${doc.id}">
    ${typeTileHTML(doc)}
    <div class="lib-main">
      <h${level} class="lib-title"><a href="#/session/${doc.id}">${titleHTML}</a></h${level}>
      <p class="lib-meta">${meta}</p>
      ${progress === null ? '' : `<div class="lib-progress">${progressHTML(progress)}</div>`}
      ${extra}
    </div>
    ${actions}
  </li>`;
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

// Voices show the first letter of their name in a neutral circle.
export function avatarHTML(v) {
  const name = v ? voiceShortName(v) : '?';
  return `<span class="avatar" aria-hidden="true">${esc(name.charAt(0).toUpperCase())}</span>`;
}
