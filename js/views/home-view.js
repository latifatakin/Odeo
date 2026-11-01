// Home: a centred heading, one large upload area, Paste text and Paste link,
// then Continue listening. My library has its own page.

import { repo } from '../storage/repo.js';
import { getSettings } from '../settings.js';
import { minutesFor } from '../text.js';
import { openFile } from '../importers.js';
import { docRowHTML, applyPct, progressPct, kindLabel } from '../covers.js';
import { esc, icon, formatDate } from '../ui.js';

const minsLeft = (d, rate) => Math.max(1, Math.round(minutesFor(d.wordCount - (d.progress?.wordIndex || 0), rate)));

export async function render(main) {
  const rate = getSettings().rate;
  const docs = (await repo.listDocuments()).sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt));
  const inProgress = docs.filter((d) => !d.progress?.completed);

  main.innerHTML = `
  <div class="page page--home">
    <header class="hero">
      <h1>Make any text accessible with Ôdēō</h1>
      <p class="lede">Turn any document, article or study notes into speech, and follow each word as it’s read.</p>
    </header>

    <section class="home-add" aria-label="Add something to listen to">
      <button type="button" class="home-drop" data-add="file" aria-describedby="home-drop-hint">
        ${icon('upload')}
        <span class="home-drop-title"><span class="home-drop-link">Choose a file</span><span class="home-drop-drag"> or drag and drop it here</span></span>
        <span class="home-drop-hint" id="home-drop-hint">PDF or TXT, up to 20 MB. It stays on your device.</span>
      </button>
      <ul class="home-pills" aria-label="Other ways to add">
        <li><a class="pill-btn" href="#/text">${icon('text')}Paste text</a></li>
        <li><a class="pill-btn" href="#/link">${icon('link')}Paste link</a></li>
      </ul>
    </section>

    ${
      inProgress.length
        ? `<section class="section" aria-labelledby="continue-h">
            <div class="section-head">
              <h2 id="continue-h">Continue listening</h2>
              <a href="#/library">See all${icon('chevron-right')}</a>
            </div>
            <ul class="lib-list">
              ${inProgress
                .slice(0, 5)
                .map((d) =>
                  docRowHTML(d, {
                    level: 3,
                    meta: `${esc(kindLabel(d))} · ${minsLeft(d, rate)} min left · Added ${formatDate(d.createdAt)}`,
                    progress: progressPct(d),
                  })
                )
                .join('')}
            </ul>
          </section>`
        : ''
    }
  </div>`;

  applyPct(main);

  // Drag and drop a file onto the upload area
  const drop = main.querySelector('.home-drop');
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
