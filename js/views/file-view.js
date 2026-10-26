// Upload a file (PDF or TXT), check the text, then listen.

import { extractText, ExtractError, MAX_FILE_MB, fileKind } from '../extract.js';
import { MAX_CHARS, createAndOpen, takePendingFile } from '../importers.js';
import { $, icon, announce, plural } from '../ui.js';

export function render(main) {
  main.innerHTML = `
  <div class="page page--narrow">
    <header class="page-head">
      <h1>Upload a file</h1>
      <p>Your file is read right here on your device. It’s never uploaded anywhere.</p>
    </header>

    <div class="drop" id="drop">
      ${icon('upload')}
      <p class="h5">Drop a file here</p>
      <p class="helper" id="file-hint">PDF or TXT files work, up to ${MAX_FILE_MB} MB.</p>
      <button type="button" class="btn btn--primary" id="pick" aria-describedby="file-hint">Choose a file</button>
    </div>

    <div class="file-status" id="file-status" hidden>
      <p id="file-status-text" role="status"></p>
      <progress id="file-progress" max="100" aria-labelledby="file-status-text"></progress>
    </div>

    <p class="status status--error section" id="file-error" role="alert" hidden>${icon('alert')}<span></span></p>

    <form id="review" class="section" hidden novalidate>
      <h2 class="h4" id="review-heading" tabindex="-1">Check the text</h2>
      <p class="helper" id="review-meta"></p>
      <div class="field section">
        <label for="review-title">Title</label>
        <input id="review-title" class="input" type="text" autocomplete="off" maxlength="120" />
      </div>
      <div class="field">
        <label for="review-text">Text we found</label>
        <textarea id="review-text" class="textarea" rows="12" aria-describedby="review-help review-error"></textarea>
        <p class="helper" id="review-help">Remove anything you don’t want read out, like page numbers.</p>
        <p class="status status--error" id="review-error" role="alert" hidden>${icon('alert')}<span></span></p>
      </div>
      <div class="empty-actions section">
        <button type="submit" class="btn btn--primary">${icon('play')}Start listening</button>
        <button type="button" class="btn btn--secondary" id="pick-again">Choose another file</button>
      </div>
    </form>
  </div>`;

  const drop = $('#drop', main);
  const input = document.getElementById('global-file');
  const status = $('#file-status', main);
  const statusText = $('#file-status-text', main);
  const progress = $('#file-progress', main);
  const error = $('#file-error', main);
  const review = $('#review', main);
  let current = null;
  let cancelled = false;

  const showError = (msg) => {
    error.querySelector('span').textContent = msg;
    error.hidden = !msg;
  };

  $('#pick', main).addEventListener('click', () => input.click());
  $('#pick-again', main).addEventListener('click', () => input.click());
  const onFile = () => {
    const f = takePendingFile();
    if (f) handle(f);
  };
  document.addEventListener('odeo:file', onFile);

  // Dragging is optional: "Choose a file" does the same.
  ['dragenter', 'dragover'].forEach((t) =>
    drop.addEventListener(t, (e) => {
      e.preventDefault();
      drop.classList.add('is-over');
    })
  );
  ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, () => drop.classList.remove('is-over')));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) handle(file);
  });

  async function handle(file) {
    showError('');
    review.hidden = true;
    drop.hidden = false;
    if (!fileKind(file)) {
      showError('We can’t read this type of file. Choose a PDF or TXT file instead.');
      return;
    }
    status.hidden = false;
    statusText.textContent = `Reading ${file.name}…`;
    progress.removeAttribute('value');
    try {
      const result = await extractText(file, {
        onProgress: (n, total) => {
          progress.value = Math.round((n / total) * 100);
          statusText.textContent = `Reading page ${n} of ${total}…`;
        },
      });
      if (cancelled) return;
      current = { ...result, fileName: file.name };
      status.hidden = true;
      showReview();
    } catch (err) {
      if (cancelled) return;
      status.hidden = true;
      showError(err instanceof ExtractError ? err.message : 'Something went wrong reading this file. Try again, or copy the text and paste it instead.');
      if (!(err instanceof ExtractError)) console.error(err);
    }
  }

  function showReview() {
    const words = (current.text.match(/\S+/g) || []).length;
    $('#review-title', main).value = current.fileName.replace(/\.(pdf|txt)$/i, '');
    $('#review-text', main).value = current.text;
    $('#review-meta', main).textContent = [current.fileName, current.pages ? plural(current.pages, 'page') : null, plural(words, 'word')]
      .filter(Boolean)
      .join(' · ');
    drop.hidden = true;
    review.hidden = false;
    $('#review-heading', main).focus();
    announce(`We found ${plural(words, 'word')}. Check the text, then press Start listening.`);
  }

  review.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = $('#review-text', main).value.trim();
    const err = $('#review-error', main);
    const setErr = (msg) => {
      err.querySelector('span').textContent = msg;
      err.hidden = !msg;
      $('#review-text', main).setAttribute('aria-invalid', msg ? 'true' : 'false');
    };
    if (!text) return setErr('There’s nothing to play. Choose another file, or paste text instead.');
    if (text.length > MAX_CHARS) return setErr(`This text is too long. Keep it under ${MAX_CHARS.toLocaleString()} characters.`);
    setErr('');
    await createAndOpen({
      title: $('#review-title', main).value.trim() || current.fileName,
      text,
      source: { type: current.kind, fileName: current.fileName, pages: current.pages },
    });
  });

  onFile();
  return () => {
    cancelled = true;
    document.removeEventListener('odeo:file', onFile);
  };
}
