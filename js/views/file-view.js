import { repo, StorageFullError } from '../storage/repo.js';
import { navigate } from '../router.js';
import { extractText, ExtractError, MAX_FILE_MB, fileKind } from '../extract.js';
import { $, icon, announce, toast, plural } from '../ui.js';
import { MAX_CHARS } from './text-view.js';

export function render(main) {
  main.innerHTML = `
  <div class="page page--narrow">
    <header class="page-head center">
      <h1>File to Speech</h1>
      <p>Upload a PDF or TXT file. The text is read on your device and never uploaded anywhere.</p>
    </header>

    <div class="dropzone card" id="dropzone">
      <div class="dropzone-icon">${icon('upload')}</div>
      <p class="dropzone-title">Drag and drop a file here, or</p>
      <button type="button" class="btn btn--primary btn--lg" id="pick">
        ${icon('file')}
        Choose a file
      </button>
      <p class="hint" id="file-hint">PDF or TXT, up to ${MAX_FILE_MB} MB</p>
      <input type="file" id="file-input" accept=".pdf,.txt,application/pdf,text/plain" hidden />
    </div>

    <div class="file-status" id="file-status" hidden>
      <p id="file-status-text" role="status"></p>
      <progress id="file-progress" max="100" aria-labelledby="file-status-text"></progress>
    </div>

    <p class="field-error field-error--block" id="file-error" role="alert" hidden>${icon('x')}<span></span></p>

    <form class="compose card" id="review" hidden novalidate>
      <h2 class="review-heading" id="review-heading" tabindex="-1">Check the text</h2>
      <p class="hint" id="review-meta"></p>
      <div class="field">
        <label for="review-title">Title</label>
        <input id="review-title" type="text" autocomplete="off" maxlength="120" />
      </div>
      <div class="field">
        <label for="review-text">Extracted text</label>
        <textarea id="review-text" rows="12" aria-describedby="review-hint review-error"></textarea>
        <p class="hint" id="review-hint">You can fix or remove anything before listening, such as page numbers or headers.</p>
      </div>
      <p class="field-error" id="review-error" hidden>${icon('x')}<span></span></p>
      <div class="compose-foot">
        <button type="button" class="btn btn--ghost" id="pick-again">Choose another file</button>
        <button type="submit" class="btn btn--primary btn--lg">${icon('volume')}Generate Speech</button>
      </div>
    </form>
  </div>`;

  const dz = $('#dropzone', main);
  const input = $('#file-input', main);
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
  input.addEventListener('change', () => input.files[0] && handle(input.files[0]));

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
    input.value = '';
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
    try {
      const doc = await repo.createDocument({
        title: $('#review-title', main).value.trim() || current.fileName,
        text,
        source: { type: current.kind, fileName: current.fileName, pages: current.pages },
      });
      navigate(`session/${doc.id}`);
    } catch (e2) {
      if (e2 instanceof StorageFullError) {
        toast('Your library is full. Delete some items in My library, then try again.', { type: 'error' });
      } else throw e2;
    }
  });

  return () => {
    cancelled = true;
  };
}

