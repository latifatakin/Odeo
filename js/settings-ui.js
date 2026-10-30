// Settings controls, shared by the Settings page and the Reading settings sheet.
// Every change applies right away and saves; there is no Save button.

import { getSettings, updateSettings, settingsEvents, resetReading, MIN_SIZE, MAX_SIZE } from './settings.js';
import { esc, icon, announce } from './ui.js';

let uid = 0;

const GROUPS = {
  font: {
    legend: 'Font',
    options: [
      { value: 'body', label: 'Atkinson Hyperlegible', cls: 'chip-body' },
      { value: 'dyslexic', label: 'OpenDyslexic', cls: 'chip-dyslexic' },
      { value: 'comic', label: 'Comic', cls: 'chip-comic' },
    ],
  },
  lineHeight: {
    legend: 'Line spacing',
    options: [
      { value: 1.7, label: 'Standard' },
      { value: 2, label: 'Roomy' },
      { value: 2.4, label: 'Extra roomy' },
    ],
  },
  letterSpacing: {
    legend: 'Letter spacing',
    options: [
      { value: 0, label: 'Standard' },
      { value: 0.05, label: 'Wider' },
      { value: 0.12, label: 'Widest' },
    ],
  },
  readingTheme: {
    legend: 'Page colour',
    options: [
      { value: 'cream', label: 'Cream' },
      { value: 'sand', label: 'Sand' },
    ],
  },
  theme: {
    legend: 'Light or dark',
    options: [
      { value: 'system', label: 'Match device' },
      { value: 'light', label: 'Light' },
      { value: 'dark', label: 'Dark' },
    ],
  },
  motion: {
    legend: 'Motion',
    options: [
      { value: 'system', label: 'Match device' },
      { value: 'reduce', label: 'Reduce motion' },
      { value: 'allow', label: 'Allow motion' },
    ],
  },
};

function chipGroup(key, prefix) {
  const g = GROUPS[key];
  return `<fieldset class="setting-group">
    <legend class="h6">${g.legend}</legend>
    <div class="chips">
      ${g.options
        .map(
          (o) => `<label class="chip"><input type="radio" name="${prefix}-${key}" data-setting="${key}" value="${o.value}" />
            <span class="${o.cls || ''}">${icon('check')}${esc(o.label)}</span></label>`
        )
        .join('')}
    </div>
  </fieldset>`;
}

function toggleRow(key, label, hint, prefix) {
  const id = `${prefix}-${key}`;
  return `<label class="toggle-row" for="${id}">
    <span class="toggle-text"><span>${label}</span>${hint ? `<span class="helper">${hint}</span>` : ''}</span>
    <input type="checkbox" class="toggle" role="switch" id="${id}" data-setting="${key}" />
  </label>`;
}

// Reading controls: font, size, spacing, page colour, follow along.
export function readingSettingsHTML(prefix) {
  return `
    ${chipGroup('font', prefix)}
    <div class="setting-group">
      <h3 class="h6" id="${prefix}-size-label">Text size</h3>
      <div class="stepper" role="group" aria-labelledby="${prefix}-size-label">
        <button type="button" class="icon-btn" data-size="-2" aria-label="Smaller text">${icon('minus')}</button>
        <output data-size-out aria-live="polite"></output>
        <button type="button" class="icon-btn" data-size="2" aria-label="Larger text">${icon('plus')}</button>
      </div>
    </div>
    ${chipGroup('lineHeight', prefix)}
    ${chipGroup('letterSpacing', prefix)}
    ${chipGroup('readingTheme', prefix)}
    ${toggleRow('autoScroll', 'Follow along as it reads', 'Keeps the word being read on screen.', prefix)}
    <p class="preview" aria-hidden="true">Reading should feel easy. Change anything until it does.</p>
    <div><button type="button" class="btn btn--ghost" data-reset-reading>Reset reading settings</button></div>`;
}

export function displaySettingsHTML(prefix) {
  return `${chipGroup('theme', prefix)}${chipGroup('motion', prefix)}`;
}

export function listeningToggleHTML(prefix) {
  return toggleRow('autoSpeed', 'Speed up gradually', 'Adds 0.1× every 600 words, up to 2.0×.', prefix);
}

// Wire up any settings controls inside a container. Returns a cleanup function.
export function bindSettings(container) {
  const sync = () => {
    const s = getSettings();
    container.querySelectorAll('input[data-setting]').forEach((el) => {
      const v = s[el.dataset.setting];
      if (el.type === 'checkbox') el.checked = !!v;
      else el.checked = String(v) === el.value;
    });
    const out = container.querySelector('[data-size-out]');
    if (out) {
      out.textContent = `${s.fontSize}px`;
      container.querySelector('[data-size="-2"]').disabled = s.fontSize <= MIN_SIZE;
      container.querySelector('[data-size="2"]').disabled = s.fontSize >= MAX_SIZE;
    }
  };

  const onChange = (e) => {
    const el = e.target.closest('input[data-setting]');
    if (!el) return;
    const key = el.dataset.setting;
    let value;
    if (el.type === 'checkbox') value = el.checked;
    else value = ['lineHeight', 'letterSpacing'].includes(key) ? Number(el.value) : el.value;
    updateSettings({ [key]: value });
  };
  const onClick = (e) => {
    const step = e.target.closest('[data-size]');
    if (step) {
      const next = getSettings().fontSize + Number(step.dataset.size);
      updateSettings({ fontSize: next });
      announce(`Text size ${getSettings().fontSize} pixels`);
    }
    if (e.target.closest('[data-reset-reading]')) {
      resetReading();
      announce('Reading settings reset');
    }
  };

  container.addEventListener('change', onChange);
  container.addEventListener('click', onClick);
  settingsEvents.addEventListener('change', sync);
  sync();
  return () => {
    container.removeEventListener('change', onChange);
    container.removeEventListener('click', onClick);
    settingsEvents.removeEventListener('change', sync);
  };
}

export const nextPrefix = () => `s${++uid}`;
