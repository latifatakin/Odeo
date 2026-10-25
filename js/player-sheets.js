// Speed and Voice sheets that open from the floating player.

import { speech } from './speech.js';
import { getSettings, updateSettings } from './settings.js';
import { minutesFor } from './text.js';
import { avatarHTML, voiceShortName, languageName } from './covers.js';
import { esc, icon, announce, closeOnBackdrop } from './ui.js';

export const MIN_RATE = 0.5;
export const MAX_RATE = 2.5;
const PRESETS = [0.8, 1, 1.2, 1.5, 2, 2.5];
const clampRate = (r) => Math.round(Math.min(MAX_RATE, Math.max(MIN_RATE, r)) * 10) / 10;

function makeSheet(id, title, bodyHTML) {
  document.getElementById(id)?.remove();
  const dlg = document.createElement('dialog');
  dlg.id = id;
  dlg.className = 'sheet sheet--player';
  dlg.setAttribute('aria-labelledby', `${id}-title`);
  dlg.innerHTML = `
    <div class="sheet-head">
      <h2 id="${id}-title">${title}</h2>
      <button type="button" class="icon-btn" data-close aria-label="Close">${icon('x')}</button>
    </div>
    <div class="sheet-body">${bodyHTML}</div>`;
  document.body.append(dlg);
  const opener = document.activeElement;
  dlg.querySelector('[data-close]').addEventListener('click', () => dlg.close());
  closeOnBackdrop(dlg);
  dlg.addEventListener('close', () => {
    dlg.remove();
    if (opener?.isConnected) opener.focus();
  });
  dlg.showModal();
  return dlg;
}

// ---------- Speed ----------

function speedName(r) {
  if (r < 0.9) return 'Relaxed';
  if (r < 1.1) return 'Normal';
  if (r < 1.45) return 'Brisk';
  if (r < 1.95) return 'Fast';
  return 'Speedy';
}
function speedBoost(r) {
  const pct = Math.round((r - 1) * 100);
  if (pct > 0) return `${pct}% faster than normal`;
  if (pct < 0) return `${-pct}% slower, easier to follow`;
  return 'Natural talking pace';
}

export function openSpeedSheet({ wordsLeft }) {
  const dlg = makeSheet(
    'speed-sheet',
    'Reading speed',
    `<div class="speed-sheet">
      <div class="speed-readout">
        <span class="speed-name" id="speed-name"></span>
        <span class="speed-sub" id="speed-duration"></span>
      </div>
      <div class="speed-main">
        <button type="button" class="stepper-btn" data-dir="-1" aria-label="Slower">${icon('minus')}</button>
        <output class="speed-value" id="speed-value" aria-live="polite"></output>
        <button type="button" class="stepper-btn" data-dir="1" aria-label="Faster">${icon('plus')}</button>
      </div>
      <div class="preset-grid" role="group" aria-label="Quick speeds">
        ${PRESETS.map((p) => `<button type="button" class="preset" data-rate="${p}">${p.toFixed(1)}×</button>`).join('')}
      </div>
      <div class="auto-speed">
        <span class="tile-icon" aria-hidden="true">${icon('gauge')}</span>
        <span class="auto-speed-text">
          <label for="auto-speed">Speed up gradually</label>
          <span id="auto-speed-hint">Adds 0.1× every 600 words, up to ${MAX_RATE}×</span>
        </span>
        <input type="checkbox" id="auto-speed" class="switch" role="switch" aria-describedby="auto-speed-hint" />
      </div>
    </div>`
  );

  const draw = () => {
    const r = getSettings().rate;
    dlg.querySelector('#speed-value').textContent = `${r.toFixed(1)}×`;
    dlg.querySelector('#speed-name').textContent = speedName(r);
    dlg.querySelector('#speed-duration').textContent = `${speedBoost(r)} · about ${Math.max(1, Math.round(minutesFor(wordsLeft(), r)))} min to finish`;
    dlg.querySelectorAll('.preset').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.rate) === r)));
    dlg.querySelector('[data-dir="-1"]').disabled = r <= MIN_RATE;
    dlg.querySelector('[data-dir="1"]').disabled = r >= MAX_RATE;
    dlg.querySelector('#auto-speed').checked = !!getSettings().autoSpeed;
  };
  const set = (r) => {
    updateSettings({ rate: clampRate(r) });
    draw();
  };

  dlg.querySelectorAll('[data-dir]').forEach((b) => b.addEventListener('click', () => set(getSettings().rate + 0.1 * Number(b.dataset.dir))));
  dlg.querySelectorAll('.preset').forEach((b) => b.addEventListener('click', () => set(Number(b.dataset.rate))));
  dlg.querySelector('#auto-speed').addEventListener('change', (e) => {
    updateSettings({ autoSpeed: e.target.checked });
    announce(e.target.checked ? 'Ôdēō will speed up a little as you go' : 'Speed stays where you set it');
  });
  draw();
}

// ---------- Voice ----------

export function openVoiceSheet() {
  const userLang = (navigator.language || 'en').split('-')[0];
  const langs = [...new Set(speech.voices.map((v) => v.lang.replace('_', '-').split('-')[0]))].sort((a, b) =>
    a === userLang ? -1 : b === userLang ? 1 : languageName(a).localeCompare(languageName(b))
  );

  const dlg = makeSheet(
    'voice-sheet',
    'Choose a voice',
    `<div class="voice-tools">
      <div class="search">
        ${icon('search')}
        <label class="sr-only" for="voice-search">Search voices</label>
        <input id="voice-search" type="search" autocomplete="off" placeholder="Search voices" />
      </div>
      <div class="voice-filters">
        <label class="chip"><input type="radio" name="vf" value="all" checked /><span>All voices</span></label>
        <label class="chip"><input type="radio" name="vf" value="local" /><span>Works offline</span></label>
        <label class="sr-only" for="voice-lang">Language</label>
        <select id="voice-lang" class="select">
          <option value="">All languages</option>
          ${langs.map((l) => `<option value="${esc(l)}" ${l === userLang ? 'selected' : ''}>${esc(languageName(l))}</option>`).join('')}
        </select>
      </div>
    </div>
    <div id="voice-results"></div>`
  );

  const results = dlg.querySelector('#voice-results');
  const search = dlg.querySelector('#voice-search');
  const lang = dlg.querySelector('#voice-lang');

  const item = (v) => {
    const selected = speech.currentVoice()?.voiceURI === v.voiceURI;
    return `<li><button type="button" class="voice-item" aria-pressed="${selected}" data-uri="${esc(v.voiceURI)}">
      ${avatarHTML(v)}
      <span><span class="voice-name">${esc(voiceShortName(v))}</span>
      <span class="voice-meta">${esc(languageName(v.lang))} · ${v.localService ? 'Works offline' : 'Needs internet'}</span></span>
      ${selected ? `<span class="voice-check" aria-hidden="true">${icon('check')}</span>` : '<span></span>'}
    </button></li>`;
  };

  const draw = () => {
    if (!speech.supported || !speech.voices.length) {
      results.innerHTML = `<p class="voice-empty">${speech.supported ? 'Voices are still loading. Try again in a moment.' : 'This browser can’t read aloud, so there are no voices to pick.'}</p>`;
      return;
    }
    const q = search.value.trim().toLowerCase();
    const filter = dlg.querySelector('input[name="vf"]:checked').value;
    const l = lang.value;
    const list = speech.voices.filter(
      (v) =>
        (filter === 'all' || v.localService) &&
        (!l || v.lang.replace('_', '-').split('-')[0] === l) &&
        (!q || v.name.toLowerCase().includes(q) || languageName(v.lang).toLowerCase().includes(q))
    );
    const recents = (getSettings().recentVoices || [])
      .map((uri) => speech.voices.find((v) => v.voiceURI === uri))
      .filter(Boolean)
      .slice(0, 3);

    results.innerHTML =
      (recents.length && !q
        ? `<section class="voice-section" aria-labelledby="vr-h"><h3 id="vr-h">Recent</h3>
            <ul class="voice-list voice-recents">${recents.map(item).join('')}</ul></section>`
        : '') +
      `<section class="voice-section" aria-labelledby="va-h"><h3 id="va-h">${list.length ? `${list.length} ${list.length === 1 ? 'voice' : 'voices'}` : 'No voices match'}</h3>
        <ul class="voice-list">${list.map(item).join('')}</ul></section>`;
  };

  results.addEventListener('click', (e) => {
    const b = e.target.closest('.voice-item');
    if (!b) return;
    const uri = b.dataset.uri;
    const recent = [uri, ...(getSettings().recentVoices || []).filter((u) => u !== uri)].slice(0, 4);
    const wasPlaying = speech.state === 'playing';
    updateSettings({ voiceURI: uri, recentVoices: recent });
    const v = speech.voices.find((x) => x.voiceURI === uri);
    if (!wasPlaying && v) speech.sample(`Hi! I’m ${voiceShortName(v)}. Ready when you are.`);
    announce(`${voiceShortName(v)} selected`);
    draw();
    results.querySelector(`.voice-item[data-uri="${CSS.escape(uri)}"]`)?.focus();
    document.dispatchEvent(new CustomEvent('odeo:voice'));
  });
  search.addEventListener('input', draw);
  lang.addEventListener('change', draw);
  dlg.querySelectorAll('input[name="vf"]').forEach((r) => r.addEventListener('change', draw));
  speech.addEventListener('voices', draw);
  dlg.addEventListener('close', () => speech.removeEventListener('voices', draw));
  draw();
}
