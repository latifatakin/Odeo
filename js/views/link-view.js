// Paste a link: Ôdēō's server fetches the page and finds the article text.
// Then people check the text and listen, like an uploaded file.
// PDF links come back as the PDF itself and go through the Upload a file page.

import { MAX_CHARS, createAndOpen, openFile } from '../importers.js';
import { $, icon, announce, titleFromText } from '../ui.js';

const ENDPOINT = '/api/article';

// Accept "example.com/story" as well as full links.
function normalise(raw) {
  const s = raw.trim();
  if (!s) return '';
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://${s}`;
}

export function render(main) {
  main.innerHTML = `
  <div class="page page--narrow">
    <header class="page-head">
      <h1>Paste a link</h1>
      <p>Paste a link to an article, blog post or PDF. We’ll find the text so you can listen.</p>
    </header>

    <form id="link-form" novalidate>
      <div class="field">
        <label for="link-url">Link</label>
        <input id="link-url" class="input" type="url" inputmode="url" autocomplete="url" spellcheck="false"
          placeholder="https://" aria-describedby="link-help link-error" />
        <p class="helper" id="link-help">To get the page, Ôdēō sends this link (and nothing else) to its server. The text is saved only on this device.</p>
        <p class="status status--error" id="link-error" role="alert" hidden>${icon('alert')}<span></span></p>
      </div>
      <div class="link-actions">
        <button type="submit" class="btn btn--primary" id="link-go">${icon('link')}Get the text</button>
        <p class="helper" id="link-status" role="status"></p>
      </div>
    </form>

    <form id="link-review" class="section" hidden novalidate>
      <h2 class="h4" id="link-review-heading" tabindex="-1">Check the text</h2>
      <p class="helper" id="link-review-meta"></p>
      <div class="field section">
        <label for="link-title">Title</label>
        <input id="link-title" class="input" type="text" autocomplete="off" maxlength="120" />
      </div>
      <div class="field">
        <label for="link-text">Text we found</label>
        <textarea id="link-text" class="textarea" rows="12" aria-describedby="link-text-help link-text-error"></textarea>
        <p class="helper" id="link-text-help">Remove anything you don’t want read out, like captions or “Share this” lines.</p>
        <p class="status status--error" id="link-text-error" role="alert" hidden>${icon('alert')}<span></span></p>
      </div>
      <div class="empty-actions section">
        <button type="submit" class="btn btn--primary">${icon('play')}Start listening</button>
        <button type="button" class="btn btn--secondary" id="link-again">Try another link</button>
      </div>
    </form>
  </div>`;

  const form = $('#link-form', main);
  const input = $('#link-url', main);
  const go = $('#link-go', main);
  const status = $('#link-status', main);
  const error = $('#link-error', main);
  const review = $('#link-review', main);
  const reviewTitle = $('#link-title', main);
  const reviewText = $('#link-text', main);
  const reviewMeta = $('#link-review-meta', main);
  const textError = $('#link-text-error', main);
  let source = null;
  let busy = false;
  let controller = null;

  const showError = (el, msg, field) => {
    el.querySelector('span').textContent = msg;
    el.hidden = !msg;
    field?.setAttribute('aria-invalid', msg ? 'true' : 'false');
  };
  const setBusy = (on) => {
    busy = on;
    go.disabled = on;
    go.lastChild.textContent = on ? 'Getting the page…' : 'Get the text';
    status.textContent = on ? 'Getting the page. This can take a few seconds.' : '';
  };

  input.addEventListener('input', () => showError(error, '', input));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;
    const url = normalise(input.value);
    if (!url) {
      showError(error, 'Paste a link first. It usually starts with https://', input);
      input.focus();
      return;
    }
    let looksRight = false;
    try {
      const u = new URL(url);
      // A real web address has no spaces and a dot in its name, like example.com
      looksRight = ['http:', 'https:'].includes(u.protocol) && !/\s/.test(input.value.trim()) && /\.(?!\d+$)[a-z0-9-]{2,}$/i.test(u.hostname);
    } catch {}
    if (!looksRight) {
      showError(error, 'That doesn’t look like a web link. Check it and try again. It usually looks like https://example.com/story', input);
      input.focus();
      return;
    }
    if (!navigator.onLine) {
      showError(error, 'You’re offline. Getting a page needs a connection. Things already in your library still play.', input);
      return;
    }

    showError(error, '', input);
    setBusy(true);
    controller = new AbortController();
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });
      const type = res.headers.get('content-type') || '';

      if (res.ok && type.includes('application/pdf')) {
        const name = decodeURIComponent(res.headers.get('x-odeo-filename') || 'document.pdf');
        const file = new File([await res.blob()], name, { type: 'application/pdf' });
        announce('Found a PDF. Opening it.');
        openFile(file);
        return;
      }

      const data = type.includes('json') ? await res.json() : null;
      if (!res.ok || !data?.text) {
        throw new Error(data?.error || 'We couldn’t get that page. Try again, or copy the text and paste it instead.');
      }

      source = { type: 'link', url: data.url, site: data.site };
      reviewTitle.value = data.title || titleFromText(data.text);
      reviewText.value = data.text.slice(0, MAX_CHARS);
      const words = data.text.split(/\s+/).filter(Boolean).length;
      reviewMeta.textContent = `From ${data.site} · about ${words.toLocaleString()} words`;
      form.hidden = true;
      review.hidden = false;
      $('#link-review-heading', main).focus();
      announce('Text found. Check it, then press Start listening.');
    } catch (err) {
      if (err.name === 'AbortError') return;
      // A network failure here usually means the function isn't reachable (or we're offline).
      const msg = err instanceof TypeError
        ? 'We couldn’t reach Ôdēō’s server. Check your connection and try again.'
        : err.message;
      showError(error, msg, input);
      input.focus();
    } finally {
      if (main.isConnected) setBusy(false);
    }
  });

  $('#link-again', main).addEventListener('click', () => {
    review.hidden = true;
    form.hidden = false;
    input.select();
    input.focus();
  });

  review.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = reviewText.value.trim();
    if (!text) {
      showError(textError, 'There’s no text left to play. Try another link.', reviewText);
      reviewText.focus();
      return;
    }
    if (text.length > MAX_CHARS) {
      showError(textError, `This text is too long. Keep it under ${MAX_CHARS.toLocaleString()} characters.`, reviewText);
      reviewText.focus();
      return;
    }
    await createAndOpen({ title: reviewTitle.value.trim() || titleFromText(text), text, source });
  });

  return () => controller?.abort();
}
