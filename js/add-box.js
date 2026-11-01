// The upload prompt used on Home and in the My library empty state:
// one large dashed upload area, then Paste text and Paste link pills.

import { openFile } from './importers.js';
import { icon } from './ui.js';

export function addBoxHTML(id = 'add') {
  return `<div class="home-add">
    <button type="button" class="home-drop" data-add="file" data-drop aria-describedby="${id}-drop-hint">
      ${icon('upload')}
      <span class="home-drop-title"><span class="home-drop-link">Choose a file</span><span class="home-drop-drag"> or drag and drop it here</span></span>
      <span class="home-drop-hint" id="${id}-drop-hint">PDF or TXT, up to 20 MB. It stays on your device.</span>
    </button>
    <ul class="home-pills" aria-label="Other ways to add">
      <li><a class="pill-btn" href="#/text">${icon('text')}Paste text</a></li>
      <li><a class="pill-btn" href="#/link">${icon('link')}Paste link</a></li>
    </ul>
  </div>`;
}

// Drag and drop a file onto the upload area
export function bindAddBox(root) {
  const drop = root.querySelector('[data-drop]');
  ['dragenter', 'dragover'].forEach((t) =>
    drop.addEventListener(t, (e) => {
      e.preventDefault();
      drop.classList.add('is-over');
    })
  );
  ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, () => drop.classList.remove('is-over')));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    openFile(e.dataTransfer?.files?.[0]);
  });
}
