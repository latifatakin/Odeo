// Adding something to listen to: the Add sheet, the shared file picker,
// samples, and saving new items.

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

// The two ways in, as large tiles (Home and the Add sheet).
export function addTilesHTML() {
  return `
    <a class="add-tile add-tile--text" href="#/text" data-add="text">
      <span class="add-tile-icon">${icon('paste')}</span>
      <span class="add-tile-title">Paste text</span>
      <span class="add-tile-hint">Type or paste anything you want to hear.</span>
    </a>
    <button type="button" class="add-tile" data-add="file">
      <span class="add-tile-icon">${icon('upload')}</span>
      <span class="add-tile-title">Upload a file</span>
      <span class="add-tile-hint">PDF or TXT, up to 20 MB.</span>
    </button>`;
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
    toast('Saved to your library');
    return doc;
  } catch (err) {
    if (err instanceof StorageFullError) {
      toast('Your library is full. Delete a few things in My library, then try again.', { type: 'error' });
      return null;
    }
    throw err;
  }
}

export function openSample(i) {
  const s = SAMPLES[i];
  return createAndOpen({ title: s.title, text: s.text, source: { type: 'sample' } });
}

let opener = null;
export function openAddSheet() {
  opener = document.activeElement;
  $('#add-dialog').showModal();
}

export function initImporters() {
  const dlg = $('#add-dialog');
  dlg.querySelector('[data-add-tiles]').innerHTML = addTilesHTML();
  dlg.querySelector('.sheet-close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => e.target === dlg && dlg.close());
  dlg.addEventListener('close', () => {
    if (opener?.isConnected && document.activeElement === document.body) opener.focus();
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('.add-open')) return openAddSheet();
    const add = e.target.closest('[data-add]');
    if (!add) return;
    if (dlg.open) dlg.close();
    if (add.dataset.add === 'file') $('#global-file').click();
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
