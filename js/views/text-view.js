// Paste text. User flow: no text means nothing is created, and we say why.

import { speech } from '../speech.js';
import { SAMPLES, MAX_CHARS, createAndOpen } from '../importers.js';
import { $, esc, icon, announce, titleFromText } from '../ui.js';

export { MAX_CHARS };
const DRAFT_KEY = 'odeo:draft';

function readDraft() {
  try {
    return JSON.parse(sessionStorage.getItem(DRAFT_KEY)) || { title: '', text: '' };
  } catch {
    return { title: '', text: '' };
  }
}
function writeDraft(d) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {}
}

export function render(main) {
  const draft = readDraft();
  main.innerHTML = `
  <div class="page page--narrow">
    <header class="page-head">
      <h1>Paste text</h1>
      <p>Paste or type anything. We’ll read it aloud and highlight each word as we go.</p>
    </header>

    ${
      speech.supported
        ? ''
        : `<div class="notice" role="note">${icon('alert')}<p><strong>Speech isn’t available.</strong> This browser can’t read aloud. Try the latest Chrome, Edge, Safari or Firefox.</p></div>`
    }

    <form id="compose" novalidate>
      <div class="field">
        <label for="compose-title">Title (optional)</label>
        <input id="compose-title" class="input" type="text" autocomplete="off" maxlength="120" value="${esc(draft.title)}" aria-describedby="compose-title-help" />
        <p class="helper" id="compose-title-help">Leave it empty and we’ll use the first few words.</p>
      </div>
      <div class="field">
        <label for="compose-text">Your text</label>
        <textarea id="compose-text" class="textarea" rows="10" spellcheck="true" aria-describedby="compose-help compose-count compose-error">${esc(draft.text)}</textarea>
        <div class="field-foot">
          <p class="helper" id="compose-help">You can paste up to ${MAX_CHARS.toLocaleString()} characters.</p>
          <p class="count" id="compose-count"></p>
        </div>
        <p class="status status--error" id="compose-error" role="alert" hidden>${icon('alert')}<span></span></p>
      </div>
      <div class="section">
        <button type="submit" class="btn btn--primary">${icon('play')}Start listening</button>
      </div>
    </form>

    <section class="section" aria-labelledby="samples-h">
      <div class="section-head"><h2 class="h4" id="samples-h">Need something to try?</h2></div>
      <div class="empty-actions">
        ${SAMPLES.map((s, i) => `<button type="button" class="btn btn--secondary" data-i="${i}">${esc(s.title)}</button>`).join('')}
      </div>
    </section>
  </div>`;

  const form = $('#compose', main);
  const title = $('#compose-title', main);
  const textarea = $('#compose-text', main);
  const count = $('#compose-count', main);
  const error = $('#compose-error', main);

  const updateCount = () => {
    const n = textarea.value.length;
    count.textContent = `${n.toLocaleString()} ${n === 1 ? 'character' : 'characters'}`;
    count.classList.toggle('count--over', n > MAX_CHARS);
  };
  const showError = (msg) => {
    error.querySelector('span').textContent = msg;
    error.hidden = !msg;
    textarea.setAttribute('aria-invalid', msg ? 'true' : 'false');
  };

  updateCount();
  form.addEventListener('input', () => {
    updateCount();
    if (textarea.value.trim()) showError('');
    writeDraft({ title: title.value, text: textarea.value });
  });

  main.querySelectorAll('[data-i]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const s = SAMPLES[btn.dataset.i];
      title.value = s.title;
      textarea.value = s.text;
      updateCount();
      showError('');
      writeDraft({ title: s.title, text: s.text });
      textarea.focus();
      textarea.setSelectionRange(0, 0);
      announce(`${s.title} is ready. Press Start listening.`);
    })
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = textarea.value.trim();
    if (!text) {
      showError('There’s nothing to play yet. Paste or type some text, then press Start listening.');
      textarea.focus();
      return;
    }
    if (text.length > MAX_CHARS) {
      showError(`This text is too long. Keep it under ${MAX_CHARS.toLocaleString()} characters, or split it into parts.`);
      textarea.focus();
      return;
    }
    const doc = await createAndOpen({ title: title.value.trim() || titleFromText(text), text, source: { type: 'paste' } });
    if (doc) writeDraft({ title: '', text: '' });
  });
}
