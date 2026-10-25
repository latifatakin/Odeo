// The ways to add something to listen to: Home tiles and the + sheet.

import { repo, StorageFullError } from './storage/repo.js';
import { navigate } from './router.js';
import { $, icon, toast, titleFromText } from './ui.js';

export const MAX_CHARS = 300_000;

export const SAMPLES = [
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

const TILES = [
  { kind: 'type', icon: 'type', label: 'Type or paste', hint: 'Drop in any text' },
  { kind: 'file', icon: 'folder', label: 'Upload a file', hint: 'PDF or TXT' },
  { kind: 'clipboard', icon: 'clipboard', label: 'From clipboard', hint: 'Listen to what you copied' },
  { kind: 'sample', icon: 'dice', label: 'Surprise me', hint: 'Try a short sample' },
];

export function importTilesHTML() {
  return TILES.map(
    (t) => `<button type="button" class="tile" data-import="${t.kind}">
      <span class="tile-icon">${icon(t.icon)}</span>
      <span class="tile-label">${t.label}</span>
      <span class="tile-hint">${t.hint}</span>
    </button>`
  ).join('');
}

let pendingFile = null;
export const takePendingFile = () => {
  const f = pendingFile;
  pendingFile = null;
  return f;
};

export async function createAndOpen({ title, text, source }) {
  try {
    const doc = await repo.createDocument({ title: title || titleFromText(text), text, source });
    navigate(`session/${doc.id}`);
    return doc;
  } catch (err) {
    if (err instanceof StorageFullError) {
      toast('Your library is full. Delete a few things in Library, then try again.', { type: 'error' });
      return null;
    }
    throw err;
  }
}

export async function openSample(i) {
  const s = SAMPLES[i];
  return createAndOpen({ title: s.title, text: s.text, source: { type: 'sample' } });
}

async function run(kind) {
  closeAddSheet();
  if (kind === 'type') return navigate('text');
  if (kind === 'file') return $('#global-file').click();
  if (kind === 'sample') {
    const docs = await repo.listDocuments();
    const titles = new Set(docs.map((d) => d.title));
    const fresh = SAMPLES.map((_, i) => i).filter((i) => !titles.has(SAMPLES[i].title));
    const pool = fresh.length ? fresh : SAMPLES.map((_, i) => i);
    return openSample(pool[Math.floor(Math.random() * pool.length)]);
  }
  if (kind === 'clipboard') {
    let text = '';
    try {
      text = (await navigator.clipboard.readText()).trim();
    } catch {
      toast('Your browser didn’t share the clipboard. Use Type or paste instead.', { type: 'error' });
      return navigate('text');
    }
    if (!text) return toast('Your clipboard is empty. Copy some text first.');
    if (text.length > MAX_CHARS) return toast('That’s a lot of text! Paste it in Type or paste to trim it down.', { type: 'error' });
    return createAndOpen({ text, source: { type: 'paste' } });
  }
}

// ---------- + sheet ----------

let opener = null;
export function openAddSheet() {
  const dlg = $('#add-dialog');
  opener = document.activeElement;
  dlg.showModal();
}
function closeAddSheet() {
  const dlg = $('#add-dialog');
  if (dlg.open) dlg.close();
}

export function initImporters() {
  const dlg = $('#add-dialog');
  dlg.querySelector('[data-import-grid]').innerHTML = importTilesHTML();
  dlg.querySelector('.sheet-close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) dlg.close();
  });
  dlg.addEventListener('close', () => {
    if (opener?.isConnected && document.activeElement === document.body) opener.focus();
  });

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-import]');
    if (t) run(t.dataset.import);
    if (e.target.closest('.add-open')) openAddSheet();
  });

  $('#global-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    pendingFile = file;
    if (location.hash === '#/file') document.dispatchEvent(new CustomEvent('odeo:file'));
    else navigate('file');
  });
}
