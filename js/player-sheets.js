// Speed and voice sheets that open from the player bar and Settings.

import { speech } from './speech.js';
import { getSettings, updateSettings, MIN_RATE, MAX_RATE } from './settings.js';
import { minutesFor } from './text.js';
import { avatarHTML, voiceShortName, languageName } from './covers.js';
import { esc, icon, announce, closeOnBackdrop } from './ui.js';

export { MIN_RATE, MAX_RATE };
const SPEEDS = [0.8, 1, 1.2, 1.4, 1.6, 1.8, 2];

function makeSheet(id, title, bodyHTML) {
  document.getElementById(id)?.remove();
  const dlg = document.createElement('dialog');
  dlg.id = id;
  dlg.className = 'sheet';
  dlg.setAttribute('aria-labelledby', `${id}-title`);
  dlg.innerHTML = `
    <div class="sheet-grab" aria-hidden="true"></div>
    <div class="sheet-head">
      <h2 class="h4" id="${id}-title">${title}</h2>
      <button type="button" class="close-btn" data-close aria-label="Close">${icon('x')}</button>
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

export function openSpeedSheet({ wordsLeft }) {
  const dlg = makeSheet(
    'speed-sheet',
    'Speed',
    `<div class="speed-sheet">
      <fieldset class="setting-group">
        <legend class="sr-only">Reading speed</legend>
        <div class="chips">
          ${SPEEDS.map(
            (r) => `<label class="chip"><input type="radio" name="speed" value="${r}" /><span>${icon('check')}${r.toFixed(1)}×</span></label>`
          ).join('')}
        </div>
      </fieldset>
      <p class="speed-readout" id="speed-readout" aria-live="polite"></p>
      <label class="toggle-row" for="auto-speed">
        <span class="toggle-text"><span>Speed up gradually</span><span class="helper">Adds 0.1× every 600 words, up to ${MAX_RATE.toFixed(1)}×.</span></span>
        <input type="checkbox" class="toggle" role="switch" id="auto-speed" />
      </label>
    </div>`
  );

  const draw = () => {
    const r = getSettings().rate;
    dlg.querySelectorAll('input[name="speed"]').forEach((el) => (el.checked = Number(el.value) === r));
    const mins = Math.max(1, Math.round(minutesFor(wordsLeft(), r)));
    dlg.querySelector('#speed-readout').textContent = `${r.toFixed(1)}× · about ${mins} min to finish`;
    dlg.querySelector('#auto-speed').checked = !!getSettings().autoSpeed;
  };
  dlg.addEventListener('change', (e) => {
    if (e.target.name === 'speed') {
      updateSettings({ rate: Number(e.target.value) });
      draw();
    } else if (e.target.id === 'auto-speed') {
      updateSettings({ autoSpeed: e.target.checked });
      announce(e.target.checked ? 'Speed will go up a little as you listen' : 'Speed stays where you set it');
    }
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
    'Voice',
    `<div class="voice-tools">
      <div class="field">
        <label for="voice-search">Search voices</label>
        <div class="search">${icon('search')}<input id="voice-search" type="search" autocomplete="off" /></div>
      </div>
      <div class="voice-filters">
        <div class="field">
          <label for="voice-lang">Language</label>
          <select id="voice-lang" class="select">
            <option value="">All languages</option>
            ${langs.map((l) => `<option value="${esc(l)}" ${l === userLang ? 'selected' : ''}>${esc(languageName(l))}</option>`).join('')}
          </select>
        </div>
      </div>
      <label class="toggle-row" for="voice-offline">
        <span class="toggle-text"><span>Only voices that work offline</span></span>
        <input type="checkbox" class="toggle" role="switch" id="voice-offline" />
      </label>
    </div>
    <div id="voice-results"></div>`
  );

  const results = dlg.querySelector('#voice-results');
  const search = dlg.querySelector('#voice-search');
  const lang = dlg.querySelector('#voice-lang');
  const offline = dlg.querySelector('#voice-offline');

  const row = (v) => {
    const chosen = speech.currentVoice()?.voiceURI === v.voiceURI;
    const name = voiceShortName(v);
    return `<li class="voice-row">
      <button type="button" class="voice-pick" aria-pressed="${chosen}" data-uri="${esc(v.voiceURI)}">
        ${avatarHTML(v)}
        <span><span class="voice-name">${esc(name)}</span>
        <span class="voice-meta">${esc(languageName(v.lang))}${v.localService ? ' · Works offline' : ' · Needs internet'}</span></span>
        ${chosen ? `<span class="voice-check">${icon('check')}</span>` : '<span></span>'}
      </button>
      <button type="button" class="icon-btn" data-sample="${esc(v.voiceURI)}" aria-label="Hear ${esc(name)}">${icon('volume')}</button>
    </li>`;
  };

  const draw = () => {
    if (!speech.supported || !speech.voices.length) {
      results.innerHTML = `<p class="voice-empty">${speech.supported ? 'Voices are still loading. Try again in a moment.' : 'This browser can’t read aloud, so there are no voices to choose.'}</p>`;
      return;
    }
    const q = search.value.trim().toLowerCase();
    const l = lang.value;
    const list = speech.voices.filter(
      (v) =>
        (!offline.checked || v.localService) &&
        (!l || v.lang.replace('_', '-').split('-')[0] === l) &&
        (!q || v.name.toLowerCase().includes(q) || languageName(v.lang).toLowerCase().includes(q))
    );
    const recents = (getSettings().recentVoices || []).map((uri) => speech.voices.find((v) => v.voiceURI === uri)).filter(Boolean).slice(0, 3);
    results.innerHTML =
      (recents.length && !q
        ? `<section class="voice-section" aria-labelledby="vr-h"><h3 class="h6" id="vr-h">Recent</h3><ul class="voice-list">${recents.map(row).join('')}</ul></section>`
        : '') +
      `<section class="voice-section" aria-labelledby="va-h"><h3 class="h6" id="va-h">${list.length ? `${list.length} ${list.length === 1 ? 'voice' : 'voices'} on this device` : 'No voices match'}</h3>
        <ul class="voice-list">${list.map(row).join('')}</ul></section>`;
  };

  results.addEventListener('click', (e) => {
    const sample = e.target.closest('[data-sample]');
    if (sample) {
      const v = speech.voices.find((x) => x.voiceURI === sample.dataset.sample);
      if (v) speech.sample(`Hi, I’m ${voiceShortName(v)}. Ready when you are.`, v);
      return;
    }
    const b = e.target.closest('.voice-pick');
    if (!b) return;
    const uri = b.dataset.uri;
    const recent = [uri, ...(getSettings().recentVoices || []).filter((u) => u !== uri)].slice(0, 4);
    updateSettings({ voiceURI: uri, recentVoices: recent });
    const v = speech.voices.find((x) => x.voiceURI === uri);
    announce(`${voiceShortName(v)} chosen`);
    draw();
    results.querySelector(`.voice-pick[data-uri="${CSS.escape(uri)}"]`)?.focus();
    document.dispatchEvent(new CustomEvent('odeo:voice'));
  });
  search.addEventListener('input', draw);
  lang.addEventListener('change', draw);
  offline.addEventListener('change', draw);
  speech.addEventListener('voices', draw);
  dlg.addEventListener('close', () => speech.removeEventListener('voices', draw));
  draw();
}
