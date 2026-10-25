// Reading settings: font, spacing, theme, voice and speed.

import { repo, DEFAULT_SETTINGS } from './storage/repo.js';
import { speech } from './speech.js';
import { $, $$, esc, debounce, closeOnBackdrop, announce } from './ui.js';

let current = { ...DEFAULT_SETTINGS };
export const settingsEvents = new EventTarget();
export const getSettings = () => current;

const save = debounce((values) => repo.saveSettings(values).catch(() => {}), 400);

export async function initSettings() {
  current = await repo.getSettings();
  apply();
  speech.rate = current.rate;
  speech.voiceURI = current.voiceURI;
  bindDialog();
  speech.addEventListener('voices', fillVoices);
  fillVoices();

  repo.addEventListener('change', async (e) => {
    if (e.detail.collection === 'settings' && e.detail.origin === 'remote') {
      current = await repo.getSettings();
      apply();
      syncForm();
      settingsEvents.dispatchEvent(new CustomEvent('change', { detail: current }));
    }
  });

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', apply);
}

export function updateSettings(patch) {
  const prev = current;
  current = { ...current, ...patch };
  apply();
  if (patch.rate !== undefined && patch.rate !== prev.rate) speech.setRate(current.rate);
  if (patch.voiceURI !== undefined && patch.voiceURI !== prev.voiceURI) speech.setVoice(current.voiceURI);
  save(current);
  settingsEvents.dispatchEvent(new CustomEvent('change', { detail: current }));
}

function apply() {
  const root = document.documentElement;
  root.dataset.font = current.font;
  if (current.theme === 'system') root.removeAttribute('data-theme');
  else root.dataset.theme = current.theme;
  root.style.setProperty('--read-size', `${current.fontSize}px`);
  root.style.setProperty('--read-line', String(current.lineHeight));
  root.style.setProperty('--read-letter', `${current.letterSpacing}em`);
  root.style.setProperty('--read-word', `${(current.letterSpacing * 2 + 0.06).toFixed(2)}em`);

  const dark =
    current.theme === 'dark' ||
    (current.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  $$('meta[name="theme-color"]').forEach((m) => (m.content = dark ? '#241c36' : '#f3edff'));
}

// ---------- Dialog ----------

const outputs = {
  fontSize: (v) => `${v}px`,
  lineHeight: (v) => `${Number(v).toFixed(1)}×`,
  letterSpacing: (v) => (Number(v) === 0 ? 'none' : `${Number(v).toFixed(2)} em`),
  rate: (v) => `${Number(v).toFixed(1)}×`,
};
const outputIds = { fontSize: 'set-size-out', lineHeight: 'set-line-out', letterSpacing: 'set-letter-out', rate: 'set-rate-out' };

function syncForm() {
  const form = $('#settings-form');
  for (const el of form.elements) {
    if (!el.name || !(el.name in current)) continue;
    if (el.type === 'radio') el.checked = el.value === String(current[el.name]);
    else if (el.type === 'checkbox') el.checked = !!current[el.name];
    else if (el.tagName === 'SELECT') el.value = current[el.name] ?? '';
    else el.value = current[el.name];
  }
  for (const [name, id] of Object.entries(outputIds)) {
    $('#' + id).textContent = outputs[name](current[name]);
    const input = form.elements[name];
    input.setAttribute('aria-valuetext', outputs[name](current[name]));
  }
}

function fillVoices() {
  const select = $('#set-voice');
  if (!speech.supported) {
    select.innerHTML = '<option value="">Speech isn’t available in this browser</option>';
    select.disabled = true;
    return;
  }
  const voices = speech.voices;
  if (!voices.length) {
    select.innerHTML = '<option value="">Default voice</option>';
    return;
  }
  const local = voices.filter((v) => v.localService);
  const online = voices.filter((v) => !v.localService);
  const opt = (v) =>
    `<option value="${esc(v.voiceURI)}">${esc(v.name)} — ${esc(v.lang)}${v.localService ? '' : ' (online)'}</option>`;
  select.innerHTML =
    (local.length ? `<optgroup label="On this device">${local.map(opt).join('')}</optgroup>` : '') +
    (online.length ? `<optgroup label="Online">${online.map(opt).join('')}</optgroup>` : '');
  select.value = current.voiceURI || speech.currentVoice()?.voiceURI || '';
}

let opener = null;

export function openSettings() {
  const dlg = $('#settings-dialog');
  opener = document.activeElement;
  syncForm();
  fillVoices();
  dlg.showModal();
}

function bindDialog() {
  const dlg = $('#settings-dialog');
  const form = $('#settings-form');
  closeOnBackdrop(dlg);

  $$('.settings-open').forEach((b) => b.addEventListener('click', openSettings));

  form.addEventListener('input', (e) => {
    const el = e.target;
    if (!el.name) return;
    let value;
    if (el.type === 'checkbox') value = el.checked;
    else if (el.type === 'range') value = Number(el.value);
    else value = el.value || null;
    if (el.name in outputIds) {
      $('#' + outputIds[el.name]).textContent = outputs[el.name](value);
      el.setAttribute('aria-valuetext', outputs[el.name](value));
    }
    updateSettings({ [el.name]: value });
  });

  $('#voice-test').addEventListener('click', () => speech.sample('Hello! This is how I sound when I read to you.'));

  $('#settings-reset').addEventListener('click', () => {
    updateSettings({ ...DEFAULT_SETTINGS });
    syncForm();
    fillVoices();
    announce('Settings reset to defaults');
  });

  dlg.addEventListener('close', () => {
    save.flush(current);
    if (opener && opener.isConnected) opener.focus();
  });
}
