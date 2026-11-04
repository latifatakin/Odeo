// Settings: a list of sections on the left, the chosen section on the right.
// Each section is a column of rows: name and a short line on the left, the
// control (dropdown, switch or button) on the right. Inspired by the user's
// Speechify reference for layout only; colours and hover follow Ôdēō.
// Changes apply right away and save.
//
// Phones and tablets (under 900px) get a grouped list menu instead
// (#/settings), and each section opens as its own screen (#/settings/reading)
// with a Back link, so the phone's own Back button works too.

import { repo } from '../storage/repo.js';
import { speech } from '../speech.js';
import { getSettings, updateSettings, settingsEvents } from '../settings.js';
import { selectRow, switchRow, sizeRow, bindSettings, nextPrefix } from '../settings-ui.js';
import { voiceShortName, languageName } from '../covers.js';
import { $, $$, esc, icon, plural } from '../ui.js';

const TAB_KEY = 'odeo:settings-tab';
const formatMB = (bytes) => `${(bytes / 1024 / 1024).toFixed(bytes < 1024 * 1024 ? 2 : 1)} MB`;

const SECTIONS = [
  { id: 'general', label: 'General', icon: 'settings' },
  { id: 'reading', label: 'Reading', icon: 'text-size' },
  { id: 'listening', label: 'Listening', icon: 'volume' },
  { id: 'data', label: 'Your data', icon: 'lock' },
];

// Phone menu groups
const MENU = [
  { label: 'Preferences', items: ['general', 'reading', 'listening'] },
  { label: 'Privacy and help', items: ['data', 'help'] },
];
const HELP = { id: 'help', label: 'Help', icon: 'help', href: '#/help' };

export async function render(main, params = []) {
  const p = nextPrefix();
  const sub = SECTIONS.some((s) => s.id === params[0]) ? params[0] : null;
  let tab = 'general';
  try {
    tab = SECTIONS.some((s) => s.id === sessionStorage.getItem(TAB_KEY)) ? sessionStorage.getItem(TAB_KEY) : 'general';
  } catch {}
  if (sub) tab = sub;

  const menuRow = (id) => {
    const s = SECTIONS.find((x) => x.id === id) || HELP;
    return `<li><a class="settings-menu-row" href="${s.href || `#/settings/${s.id}`}">${icon(s.icon)}<span>${s.label}</span>${icon('chevron-right')}</a></li>`;
  };

  main.innerHTML = `
  <div class="page settings-page" ${sub ? `data-sub="${sub}"` : ''}>
    <a class="back-link settings-back" href="#/settings">${icon('chevron-left')}Back to settings</a>
    <header class="page-head">
      <h1>Settings</h1>
      <p>Make Ôdēō comfortable for you. Changes save straight away.</p>
    </header>

    <nav class="settings-menu" aria-label="Settings sections">
      ${MENU.map(
        (g, i) => `<h2 class="settings-menu-label" id="sm-${i}">${g.label}</h2>
        <ul class="settings-menu-group" aria-labelledby="sm-${i}">${g.items.map(menuRow).join('')}</ul>`
      ).join('')}
    </nav>

    <div class="settings-layout" id="settings-root">
      <nav class="settings-nav" aria-label="Settings sections">
        <ul>
          ${SECTIONS.map(
            (s) => `<li><button type="button" class="settings-tab" data-tab="${s.id}" aria-controls="set-${s.id}">${icon(s.icon)}<span>${s.label}</span></button></li>`
          ).join('')}
          <li><a class="settings-tab" href="#/help">${icon('help')}<span>Help</span></a></li>
        </ul>
      </nav>

      <div class="settings-panels">
        <section class="settings-panel" id="set-general" aria-labelledby="set-general-h" tabindex="-1">
          <h2 class="settings-panel-title" id="set-general-h">General</h2>
          ${selectRow('theme', 'App theme', 'Light, dark, or the same as your device.', p)}
          ${selectRow('motion', 'Motion', 'Turn off moving effects if they bother you.', p)}
          ${switchRow('noteColors', 'Color notes by document', 'On the Notes page, each document’s notes share one color.', p)}
        </section>

        <section class="settings-panel" id="set-reading" aria-labelledby="set-reading-h" tabindex="-1">
          <h2 class="settings-panel-title" id="set-reading-h">Reading</h2>
          ${selectRow('font', 'Font', 'Atkinson Hyperlegible is made to be easy to read.', p)}
          ${sizeRow(p)}
          ${selectRow('lineHeight', 'Line spacing', 'Space between lines of text.', p)}
          ${selectRow('letterSpacing', 'Letter spacing', 'Space between letters and words.', p)}
          ${selectRow('readingTheme', 'Page colour', 'The colour behind the text you listen to.', p)}
          ${switchRow('autoScroll', 'Follow along as it reads', 'Keeps the word being read on screen.', p)}
          <div class="set-row set-row--stack">
            <p class="set-label">Preview</p>
            <p class="preview">Reading should feel easy. Change anything until it does.</p>
            <div><button type="button" class="btn btn--secondary" data-reset-reading>Reset reading settings</button></div>
          </div>
        </section>

        <section class="settings-panel" id="set-listening" aria-labelledby="set-listening-h" tabindex="-1">
          <h2 class="settings-panel-title" id="set-listening-h">Listening</h2>
          <div class="set-row">
            <div class="set-text">
              <label class="set-label" for="${p}-voice">Voice</label>
              <p class="set-hint" id="voice-current"></p>
            </div>
            <div class="select-wrap select-wrap--voice">
              <select class="select" id="${p}-voice" aria-describedby="voice-current"></select>
              ${icon('chevron-down')}
            </div>
          </div>
          ${selectRow('rate', 'Speed', 'How fast the voice reads.', p)}
          ${switchRow('autoSpeed', 'Speed up gradually', 'Adds 0.1× every 600 words, up to 2.0×.', p)}
        </section>

        <section class="settings-panel" id="set-data" aria-labelledby="set-data-h" tabindex="-1">
          <h2 class="settings-panel-title" id="set-data-h">Your data</h2>
          <div class="set-row">
            <div class="set-text">
              <span class="set-label">Saved on this device</span>
              <p class="set-hint">Everything stays on this device. Nothing is uploaded, and there’s no account.</p>
            </div>
            ${icon('lock')}
          </div>
          <div class="set-row">
            <div class="set-text">
              <span class="set-label">Storage</span>
              <p class="set-hint" id="storage-line">Checking…</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>`;

  const root = $('#settings-root', main);
  const unbind = bindSettings(root);

  // ---------- Sections ----------
  function show(id, { focus = false } = {}) {
    tab = id;
    try {
      sessionStorage.setItem(TAB_KEY, id);
    } catch {}
    $$('[data-tab]', main).forEach((b) => {
      if (b.dataset.tab === id) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    });
    $$('.settings-panel', main).forEach((s) => (s.hidden = s.id !== `set-${id}`));
    if (focus) $(`#set-${id}`, main).focus({ preventScroll: true });
  }
  $('.settings-nav', main).addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (b) show(b.dataset.tab, { focus: true });
  });
  show(tab);

  // ---------- Listening ----------
  // Voice dropdown: your language first, then the others, each in its own group.
  const voiceSelect = $(`#${p}-voice`, main);
  const drawVoices = () => {
    const current = speech.currentVoice();
    if (!speech.supported || !speech.voices.length) {
      voiceSelect.innerHTML = `<option value="">${speech.supported ? 'Voices are still loading…' : 'Not available in this browser'}</option>`;
      voiceSelect.disabled = true;
    } else {
      const userLang = (navigator.language || 'en').split('-')[0];
      const byLang = new Map();
      for (const v of speech.voices) {
        const l = v.lang.replace('_', '-').split('-')[0];
        if (!byLang.has(l)) byLang.set(l, []);
        byLang.get(l).push(v);
      }
      const langs = [...byLang.keys()].sort((a, b) =>
        a === userLang ? -1 : b === userLang ? 1 : languageName(a).localeCompare(languageName(b))
      );
      voiceSelect.innerHTML = langs
        .map(
          (l) => `<optgroup label="${esc(languageName(l))}">${byLang
            .get(l)
            .map((v) => {
              // The group already names the language, so show the country only
              const region = languageName(v.lang).match(/\((.*)\)$/)?.[1];
              return `<option value="${esc(v.voiceURI)}">${esc(voiceShortName(v))}${region && !/^\d+$/.test(region) ? ` · ${esc(region)}` : ''}</option>`;
            })
            .join('')}</optgroup>`
        )
        .join('');
      voiceSelect.disabled = false;
      if (current) voiceSelect.value = current.voiceURI;
    }
    $('#voice-current', main).textContent = current
      ? current.localService
        ? 'Works offline.'
        : 'Needs internet.'
      : 'Voices come from your device.';
  };
  voiceSelect.addEventListener('change', () => {
    const uri = voiceSelect.value;
    const recent = [uri, ...(getSettings().recentVoices || []).filter((u) => u !== uri)].slice(0, 4);
    updateSettings({ voiceURI: uri, recentVoices: recent });
    document.dispatchEvent(new CustomEvent('odeo:voice'));
  });
  drawVoices();
  const onSettings = () => {
    const c = speech.currentVoice();
    if (c && voiceSelect.value !== c.voiceURI) drawVoices();
  };
  settingsEvents.addEventListener('change', onSettings);
  speech.addEventListener('voices', drawVoices);

  const [docs, usage] = await Promise.all([repo.listDocuments(), repo.usage()]);
  $('#storage-line', main).textContent = `${plural(docs.length, 'item')} saved. Using ${formatMB(usage.bytes)} of about ${formatMB(usage.quota)}.`;

  return () => {
    unbind();
    settingsEvents.removeEventListener('change', onSettings);
    speech.removeEventListener('voices', drawVoices);
  };
}
