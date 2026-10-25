// Type or paste: the "Yes / No" step of the user flow lives here.

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
      <h1>Type or paste</h1>
      <p>Drop in an article, your notes, a chapter, anything. We’ll read it to you and highlight every word.</p>
    </header>

    ${
      speech.supported
        ? ''
        : `<div class="notice" role="note">${icon('volume')}<p>This browser can’t read text aloud. Try the latest Chrome, Edge, Safari or Firefox.</p></div>`
    }

    <form class="compose" id="compose" novalidate>
      <label class="sr-only" for="compose-title">Title (optional)</label>
      <input id="compose-title" class="compose-title" name="title" type="text" autocomplete="off" maxlength="120"
        placeholder="Give it a title (optional)" value="${esc(draft.title)}" />
      <div class="compose-box">
        <label class="sr-only" for="compose-text">Text to read aloud</label>
        <textarea id="compose-text" name="text" rows="10" spellcheck="true"
          aria-describedby="compose-error compose-count" placeholder="Paste or type your text here…">${esc(draft.text)}</textarea>
      </div>
      <p class="field-error" id="compose-error" hidden>${icon('x')}<span></span></p>
      <div class="compose-foot">
        <span id="compose-count" class="count"></span>
        <button type="submit" class="btn btn--primary btn--lg">${icon('play')}Generate Speech</button>
      </div>
    </form>

    <section class="section" aria-labelledby="samples-heading">
      <div class="section-head"><h2 id="samples-heading">Need something to try?</h2></div>
      <ul class="sample-list">
        ${SAMPLES.map(
          (s, i) => `<li><button type="button" class="sample" data-i="${i}">
            <span class="sample-play">${icon('type')}</span>
            <span><span class="sample-title">${esc(s.title)}</span><span class="sample-text">${esc(s.text)}</span></span>
            <span class="hint">Use this</span>
          </button></li>`
        ).join('')}
      </ul>
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

  main.querySelectorAll('.sample').forEach((btn) =>
    btn.addEventListener('click', () => {
      const s = SAMPLES[btn.dataset.i];
      title.value = s.title;
      textarea.value = s.text;
      updateCount();
      showError('');
      writeDraft({ title: s.title, text: s.text });
      textarea.focus();
      textarea.setSelectionRange(0, 0);
      textarea.scrollTop = 0;
      announce(`“${s.title}” is ready. Press Generate Speech to listen.`);
    })
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = textarea.value.trim();
    // User flow: no text → nothing is created, and we say why.
    if (!text) {
      showError('Add some text first, then press Generate Speech.');
      textarea.focus();
      return;
    }
    if (text.length > MAX_CHARS) {
      showError(`That’s a lot! Keep it under ${MAX_CHARS.toLocaleString()} characters, or split it into parts.`);
      textarea.focus();
      return;
    }
    const doc = await createAndOpen({ title: title.value.trim() || titleFromText(text), text, source: { type: 'paste' } });
    if (doc) writeDraft({ title: '', text: '' });
  });
}
