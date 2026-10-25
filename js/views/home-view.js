// Home: pick up where you left off, or add something new.

import { repo } from '../storage/repo.js';
import { getSettings } from '../settings.js';
import { minutesFor } from '../text.js';
import { importTilesHTML, SAMPLES, openSample } from '../importers.js';
import { coverHTML, applyPct, progressPct } from '../covers.js';
import { esc, icon } from '../ui.js';

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Up late?';
  if (h < 12) return 'Good morning!';
  if (h < 18) return 'Good afternoon!';
  return 'Good evening!';
}

function timeLeft(doc, rate) {
  const pct = progressPct(doc);
  if (doc.progress?.completed) return 'Finished';
  const left = doc.wordCount - (doc.progress?.wordIndex || 0);
  const mins = Math.max(1, Math.round(minutesFor(left, rate)));
  return pct > 0 ? `${mins} min left` : `${mins} min listen`;
}

export async function render(main) {
  const docs = (await repo.listDocuments()).sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt));
  const rate = getSettings().rate;
  const listened = docs.reduce((n, d) => n + (d.progress?.completed ? d.wordCount : d.progress?.wordIndex || 0), 0);
  const recent = docs.slice(0, 12);

  main.innerHTML = `
  <div class="page">
    <header class="greet">
      <h1>${greeting()}</h1>
      <p>${docs.length ? 'What are we listening to today?' : 'Turn any text into something you can listen to.'}</p>
      ${
        listened > 0
          ? `<p class="stat-pill">${icon('volume')}${listened.toLocaleString()} words listened · about ${Math.max(1, Math.round(minutesFor(listened, 1)))} min</p>`
          : ''
      }
    </header>

    ${
      recent.length
        ? `<section class="section" aria-labelledby="continue-h">
            <div class="section-head">
              <h2 id="continue-h">Continue listening</h2>
              <a href="#/library">See all${icon('chevron-right')}</a>
            </div>
            <ul class="shelf" role="list">
              ${recent
                .map(
                  (d) => `<li><a class="cover-card" href="#/session/${d.id}">
                    ${coverHTML(d)}
                    <span class="cover-card-title">${esc(d.title)}</span>
                    <span class="cover-card-meta">${timeLeft(d, rate)}</span>
                  </a></li>`
                )
                .join('')}
            </ul>
          </section>`
        : `<section class="section welcome" aria-labelledby="welcome-h">
            <div>
              <h2 id="welcome-h">Your first listen is one tap away</h2>
              <p>Paste some text, upload a PDF, or let us pick a short sample. Everything stays on this device.</p>
            </div>
            <button type="button" class="btn btn--lg" data-import="sample">${icon('dice')}Surprise me</button>
          </section>`
    }

    <section class="section" aria-labelledby="import-h">
      <div class="section-head"><h2 id="import-h">Import &amp; listen</h2></div>
      <div class="import-grid">${importTilesHTML()}</div>
    </section>

    <section class="section" aria-labelledby="samples-h">
      <div class="section-head"><h2 id="samples-h">Try a sample</h2></div>
      <ul class="sample-list">
        ${SAMPLES.map(
          (s, i) => `<li><button type="button" class="sample" data-sample="${i}">
            ${coverHTML({ id: s.title, title: s.title, source: { type: 'sample' } }, { small: true })}
            <span><span class="sample-title">${esc(s.title)}</span><span class="sample-text">${esc(s.text)}</span></span>
            <span class="sample-play">${icon('play')}<span class="sr-only">Listen</span></span>
          </button></li>`
        ).join('')}
      </ul>
    </section>
  </div>`;

  applyPct(main);
  main.querySelectorAll('[data-sample]').forEach((b) => b.addEventListener('click', () => openSample(Number(b.dataset.sample))));
  return null;
}

