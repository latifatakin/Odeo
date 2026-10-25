import { repo, StorageFullError } from '../storage/repo.js';
import { speech } from '../speech.js';
import { navigate } from '../router.js';
import { $, esc, icon, announce, toast, titleFromText } from '../ui.js';

export const MAX_CHARS = 300_000;
const DRAFT_KEY = 'odeo:draft';

const SAMPLES = [
  {
    title: 'Photosynthesis',
    text: 'Photosynthesis is the process by which plants and other organisms convert light energy, usually from the sun, into chemical energy stored in sugar. It takes place mostly in the leaves, inside tiny structures called chloroplasts. Plants take in carbon dioxide from the air and water from the soil. Using the energy of sunlight, they turn these into glucose and release oxygen as a by-product. Almost all life on Earth depends on this process, either directly or through the food chain.',
  },
  {
    title: 'Democracy',
    text: 'Democracy is a form of government in which power is vested in the people, who rule either directly or through freely elected representatives. Key features include free and fair elections, the rule of law, protection of individual rights, and the freedom to speak, gather, and form political groups. In a direct democracy, citizens vote on laws themselves. In a representative democracy, they choose leaders to make decisions on their behalf.',
  },
  {
    title: 'Quantum mechanics',
    text: 'Quantum mechanics is a fundamental theory in physics that describes nature at the smallest scales of energy levels of atoms and subatomic particles. Unlike classical physics, it shows that energy comes in small, separate amounts called quanta. Particles can behave like waves, and their exact position and speed cannot both be known at once. These strange ideas power real technology, including lasers, computer chips, and medical scanners.',
  },
];

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
    <header class="page-head center">
      <h1>Make any text accessible with Ôdēō</h1>
      <p>Convert any document, article, or study material to speech with built-in accessibility features.</p>
    </header>

    ${
      speech.supported
        ? ''
        : `<div class="notice notice--warn" role="note">${icon('volume')}<p>This browser can’t read text aloud. Try the latest Chrome, Edge, Safari or Firefox.</p></div>`
    }

    <form class="compose card" id="compose" novalidate>
      <div class="field">
        <label for="compose-title">Title <span class="optional">(optional)</span></label>
        <input id="compose-title" name="title" type="text" autocomplete="off" maxlength="120"
          aria-describedby="compose-title-hint" value="${esc(draft.title)}" />
        <p class="hint" id="compose-title-hint">Leave blank to use the first few words.</p>
      </div>
      <div class="field">
        <label for="compose-text">Text to read aloud</label>
        <textarea id="compose-text" name="text" rows="10" spellcheck="true"
          aria-describedby="compose-error compose-count" placeholder="Paste or type your text here…">${esc(draft.text)}</textarea>
      </div>
      <p class="field-error" id="compose-error" hidden>${icon('x')}<span></span></p>
      <div class="compose-foot">
        <span id="compose-count" class="count"></span>
        <button type="submit" class="btn btn--primary btn--lg">
          ${icon('volume')}
          Generate Speech
        </button>
      </div>
    </form>

    <section class="samples" aria-labelledby="samples-heading">
      <h2 id="samples-heading">Try sample texts</h2>
      <ul class="sample-list">
        ${SAMPLES.map(
          (s, i) => `<li><button type="button" class="sample" data-i="${i}">
            <span class="sample-title">${esc(s.title)}</span>
            <span class="sample-text">${esc(s.text.slice(0, 110))}…</span>
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
      announce(`Sample text “${s.title}” added. Press Generate Speech to listen.`);
    })
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = textarea.value.trim();
    // User flow: no text → nothing is created, and we explain why.
    if (!text) {
      showError('Add some text first, then press Generate Speech.');
      textarea.focus();
      return;
    }
    if (text.length > MAX_CHARS) {
      showError(`This text is too long. Keep it under ${MAX_CHARS.toLocaleString()} characters, or split it into parts.`);
      textarea.focus();
      return;
    }
    try {
      const doc = await repo.createDocument({
        title: title.value.trim() || titleFromText(text),
        text,
        source: { type: 'paste' },
      });
      writeDraft({ title: '', text: '' });
      navigate(`session/${doc.id}`);
    } catch (err) {
      if (err instanceof StorageFullError) {
        toast('Your library is full. Delete some items in My library, then try again.', { type: 'error' });
      } else throw err;
    }
  });
}
