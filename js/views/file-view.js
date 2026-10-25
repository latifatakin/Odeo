import { extractText, ExtractError, MAX_FILE_MB, fileKind } from '../extract.js';
import { MAX_CHARS, createAndOpen, takePendingFile } from '../importers.js';
import { $, icon, announce, plural } from '../ui.js';

export function render(main) {
  main.innerHTML = `
  <div class="page page--narrow">
    <header class="page-head">
      <h1>Upload a file</h1>
      <p>PDF or TXT. Your file is read right here on your device and never uploaded anywhere.</p>
    </header>

    <div class="dropzone" id="dropzone">
      <div class="dropzone-icon">${icon('folder')}</div>
      <p class="dropzone-title">Drop a file here, or</p>
      <button type="button" class="btn btn--primary btn--lg" id="pick">${icon('file')}Choose a file</button>
      <p class="hint" id="file-hint">PDF or TXT, up to ${MAX_FILE_MB} MB</p>
    </div>

    <div class="file-status" id="file-status" hidden>
      <p id="file-status-text" role="status"></p>
      <progress id="file-progress" max="100" aria-labelledby="file-status-text"></progress>
    </div>

    <p class="field-error field-error--block" id="file-error" role="alert" hidden>${icon('x')}<span></span></p>

    <form class="compose review" id="review" hidden novalidate>
      <h2 id="review-heading" tabindex="-1">Looks good? Give it a quick check</h2>
      <p class="review-meta" id="review-meta"></p>
      <label class="sr-only" for="review-title">Title</label>
      <input id="review-title" class="compose-title" type="text" autocomplete="off" maxlength="120" />
      <div class="compose-box">
        <label class="sr-only" for="review-text">Extracted text</label>
        <textarea id="review-text" rows="12" aria-describedby="review-hint review-error"></textarea>
      </div>
      <p class="hint" id="review-hint">Tidy anything you don’t want read out, like page numbers or headers.</p>
      <p class="field-error" id="review-error" hidden>${icon('x')}<span></span></p>
      <div class="compose-foot">
        <button type="button" class="btn btn--ghost" id="pick-again">Choose another file</button>
        <button type="submit" class="btn btn--primary btn--lg">${icon('play')}Generate Speech</button>
      </div>
    </form>
  </div>`;

  const dz = $('#dropzone', main);
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

  // The shared file picker hands its file over through the importers module.
  $('#pick', main).addEventListener('click', () => input.click());
  $('#pick-again', main).addEventListener('click', () => input.click());
  const onFile = () => {
    const f = takePendingFile();
    if (f) handle(f);
  };
  document.addEventListener('odeo:file', onFile);

  // Drag and drop (the "Choose a file" button does the same without dragging).
  ['dragenter', 'dragover'].forEach((t) =>
    dz.addEventListener(t, (e) => {
      e.preventDefault();
      dz.classList.add('is-over');
    })
  );
  ['dragleave', 'drop'].forEach((t) => dz.addEventListener(t, () => dz.classList.remove('is-over')));
  dz.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) handle(file);
  });

  async function handle(file) {
    showError('');
    review.hidden = true;
    if (!fileKind(file)) {
      showError('This file type isn’t supported. Choose a PDF or TXT file.');
      return;
    }
    status.hidden = false;
    statusText.textContent = `Reading “${file.name}”…`;
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
      showError(err instanceof ExtractError ? err.message : 'Something went wrong reading this file. Please try again.');
      if (!(err instanceof ExtractError)) console.error(err);
    }
  }

  function showReview() {
    const words = (current.text.match(/\S+/g) || []).length;
    $('#review-title', main).value = current.fileName.replace(/\.(pdf|txt)$/i, '');
    $('#review-text', main).value = current.text;
    $('#review-meta', main).textContent = [
      current.fileName,
      current.pages ? plural(current.pages, 'page') : null,
      plural(words, 'word'),
    ]
      .filter(Boolean)
      .join(' · ');
    review.hidden = false;
    $('#review-heading', main).focus();
    announce(`Text extracted: ${plural(words, 'word')}. Check it, then press Generate Speech.`);
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
    if (!text) return setErr('There’s no text to read. Choose another file or paste text instead.');
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

