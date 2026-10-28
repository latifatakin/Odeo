// Settings: reading, display, listening. Changes apply right away and save.

import { repo } from '../storage/repo.js';
import { speech } from '../speech.js';
import { getSettings, settingsEvents } from '../settings.js';
import { readingSettingsHTML, displaySettingsHTML, listeningToggleHTML, bindSettings, nextPrefix } from '../settings-ui.js';
import { openSpeedSheet, openVoiceSheet } from '../player-sheets.js';
import { avatarHTML, voiceShortName, languageName } from '../covers.js';
import { $, icon, plural } from '../ui.js';

const formatMB = (bytes) => `${(bytes / 1024 / 1024).toFixed(bytes < 1024 * 1024 ? 2 : 1)} MB`;

export async function render(main) {
  const p = nextPrefix();
  main.innerHTML = `
  <div class="page page--narrow">
    <header class="page-head">
      <h1>Settings</h1>
      <p>Make Ôdēō comfortable for you. Changes save straight away.</p>
    </header>

    <div class="settings" id="settings-root">
      <section class="settings-card" aria-labelledby="set-reading">
        <h2 class="h4" id="set-reading">Reading</h2>
        ${readingSettingsHTML(p)}
      </section>

      <section class="settings-card" aria-labelledby="set-listening">
        <h2 class="h4" id="set-listening">Listening</h2>
        <div class="setting-group">
          <h3 class="h6">Voice</h3>
          <div class="voice-row">
            <span class="voice-pick" aria-hidden="true" id="voice-current"></span>
            <button type="button" class="btn btn--secondary" id="choose-voice" aria-haspopup="dialog">Choose voice</button>
          </div>
        </div>
        <div class="setting-group">
          <h3 class="h6">Speed</h3>
          <div class="voice-row">
            <p id="speed-current"></p>
            <button type="button" class="btn btn--secondary" id="choose-speed" aria-haspopup="dialog">Change speed</button>
          </div>
        </div>
        ${listeningToggleHTML(p)}
      </section>

      <section class="settings-card" aria-labelledby="set-display">
        <h2 class="h4" id="set-display">Display</h2>
        ${displaySettingsHTML(p)}
      </section>

      <section class="settings-card" aria-labelledby="set-help">
        <h2 class="h4" id="set-help">Help</h2>
        <p>How Ôdēō works, keyboard shortcuts, and how voices and privacy work.</p>
        <div><a class="btn btn--secondary" href="#/help">${icon('help')}Open help</a></div>
      </section>

      <section class="settings-card" aria-labelledby="set-data">
        <h2 class="h4" id="set-data">Your data</h2>
        <p class="status">${icon('lock')}<span>Everything stays on this device. Nothing is uploaded, and there’s no account.</span></p>
        <p class="helper" id="storage-line"></p>
      </section>
    </div>
  </div>`;

  const root = $('#settings-root', main);
  const unbind = bindSettings(root);

  const drawListening = () => {
    const v = speech.currentVoice();
    $('#voice-current', main).innerHTML = v
      ? `${avatarHTML(v)}<span><span class="voice-name">${voiceShortName(v)}</span><span class="voice-meta">${languageName(v.lang)} · ${v.localService ? 'Works offline' : 'Needs internet'}</span></span><span></span>`
      : `<span class="avatar">?</span><span><span class="voice-name">Device voice</span><span class="voice-meta">Voices are still loading</span></span><span></span>`;
    $('#speed-current', main).textContent = `${getSettings().rate.toFixed(1)}× speed`;
  };
  drawListening();
  $('#choose-voice', main).addEventListener('click', openVoiceSheet);
  $('#choose-speed', main).addEventListener('click', () => openSpeedSheet({ wordsLeft: () => 1000 }));
  settingsEvents.addEventListener('change', drawListening);
  speech.addEventListener('voices', drawListening);

  const [docs, usage] = await Promise.all([repo.listDocuments(), repo.usage()]);
  $('#storage-line', main).textContent = `${plural(docs.length, 'item')} saved. Using ${formatMB(usage.bytes)} of about ${formatMB(usage.quota)}.`;

  return () => {
    unbind();
    settingsEvents.removeEventListener('change', drawListening);
    speech.removeEventListener('voices', drawListening);
  };
}
