// Reading preferences and the Appearance sheet.

import { repo, DEFAULT_SETTINGS } from './storage/repo.js';
import { speech } from './speech.js';
import { $, $$, debounce, closeOnBackdrop, announce } from './ui.js';

let current = { ...DEFAULT_SETTINGS };
export const settingsEvents = new EventTarget();
export const getSettings = () => current;

const save = debounce((values) => repo.saveSettings(values).catch(() => {}), 400);
const SIZES = [14, 16, 18, 20, 22, 24, 27, 30, 34, 38];

export async function initSettings() {
  current = await repo.getSettings();
  apply();
  speech.rate = current.rate;
  speech.voiceURI = current.voiceURI;
  bindDialog();

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
  root.dataset.reading = current.readingTheme;
  if (current.fontEverywhere) root.dataset.fontEverywhere = 'true';
  else delete root.dataset.fontEverywhere;
  if (current.theme === 'system') root.removeAttribute('data-theme');
  else root.dataset.theme = current.theme;
  root.style.setProperty('--read-size', `${current.fontSize}px`);
  root.style.setProperty('--read-line', String(current.lineHeight));
  root.style.setProperty('--read-letter', `${current.letterSpacing}em`);
  // Word gaps grow much faster than letter gaps so words stay clearly separate.
  root.style.setProperty('--read-word', `${(0.16 + current.letterSpacing * 3.5).toFixed(2)}em`);
  root.style.setProperty('--read-weight', current.bold ? '700' : '400');

  const dark =
    current.theme === 'dark' ||
    (current.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  $$('meta[name="theme-color"]').forEach((m) => (m.content = dark ? '#121019' : '#ffffff'));
}

// ---------- Appearance sheet ----------

const sizePct = (px) => `${Math.round((px / 20) * 100)}%`;
const outputs = {
  lineHeight: (v) => `${Number(v).toFixed(1)}×`,
  letterSpacing: (v) => (Number(v) === 0 ? 'none' : Number(v) <= 0.05 ? 'a little' : Number(v) <= 0.1 ? 'roomy' : 'extra roomy'),
};
const outputIds = { lineHeight: 'set-line-out', letterSpacing: 'set-letter-out' };

function syncForm() {
  const form = $('#appearance-form');
  for (const el of form.elements) {
    if (!el.name || !(el.name in current)) continue;
    if (el.type === 'radio') el.checked = el.value === String(current[el.name]);
    else if (el.type === 'checkbox') el.checked = !!current[el.name];
    else el.value = current[el.name];
  }
  for (const [name, id] of Object.entries(outputIds)) {
    $('#' + id).textContent = outputs[name](current[name]);
    form.elements[name].setAttribute('aria-valuetext', outputs[name](current[name]));
  }
  $('#size-out').textContent = sizePct(current.fontSize);
}

let opener = null;

export function openAppearance() {
  const dlg = $('#appearance-dialog');
  opener = document.activeElement;
  syncForm();
  dlg.showModal();
}

function bindDialog() {
  const dlg = $('#appearance-dialog');
  const form = $('#appearance-form');
  closeOnBackdrop(dlg);

  document.addEventListener('click', (e) => {
    if (e.target.closest('.appearance-open')) openAppearance();
  });

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

  form.querySelectorAll('[data-step="fontSize"]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const dir = Number(btn.dataset.dir);
      const i = SIZES.reduce(
        (best, s, k) => (Math.abs(s - current.fontSize) < Math.abs(SIZES[best] - current.fontSize) ? k : best),
        0
      );
      const next = SIZES[Math.max(0, Math.min(SIZES.length - 1, i + dir))];
      updateSettings({ fontSize: next });
      $('#size-out').textContent = sizePct(next);
    })
  );

  $('#settings-reset').addEventListener('click', () => {
    const { voiceURI, recentVoices, rate, autoSpeed } = current;
    updateSettings({ ...DEFAULT_SETTINGS, voiceURI, recentVoices, rate, autoSpeed });
    syncForm();
    announce('Appearance reset');
  });

  dlg.addEventListener('close', () => {
    save.flush(current);
    if (opener && opener.isConnected) opener.focus();
  });
}
