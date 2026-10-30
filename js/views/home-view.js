// Home: a centred heading, one large upload area (with paste as the other way in),
// then Continue listening and My library.

import { repo } from '../storage/repo.js';
import { getSettings } from '../settings.js';
import { minutesFor } from '../text.js';
import { SAMPLES, openSample, openFile } from '../importers.js';
import { typeTileHTML, progressHTML, applyPct, progressPct, kindLabel, isPasted } from '../covers.js';
import { esc, icon, formatDate, plural } from '../ui.js';

const minsLeft = (d, rate) => Math.max(1, Math.round(minutesFor(d.wordCount - (d.progress?.wordIndex || 0), rate)));
const minsTotal = (d, rate) => Math.max(1, Math.round(minutesFor(d.wordCount, rate)));

export function libraryRowHTML(d, rate, { actions = '' } = {}) {
  return `<li class="lib-row" data-id="${d.id}">
    ${typeTileHTML(d)}
    <div class="lib-main">
      <h3 class="lib-title"><a href="#/session/${d.id}">${esc(d.title)}</a></h3>
      <p class="lib-meta">Added ${formatDate(d.createdAt)} · ${minsTotal(d, rate)} min listen</p>
    </div>
    ${actions}
  </li>`;
}

export async function render(main) {
  const rate = getSettings().rate;
  const docs = (await repo.listDocuments()).sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt));
  const inProgress = docs.filter((d) => !d.progress?.completed);
  const resume = inProgress.find((d) => progressPct(d) > 0);

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
      ${
        resume
          ? `<p class="home-alt">Pick up where you stopped: <a href="#/session/${resume.id}">${esc(resume.title)}</a>, ${plural(minsLeft(resume, rate), 'minute')} left.</p>`
          : ''
      }
    </section>

    ${
      inProgress.length
        ? `<section class="section" aria-labelledby="continue-h">
            <div class="section-head"><h2 id="continue-h">Continue listening</h2></div>
            <ul class="shelf">
              ${inProgress
                .slice(0, 10)
                .map(
                  (d) => `<li><a class="listen-card" href="#/session/${d.id}">
                    <span class="listen-tile${isPasted(d) ? ' listen-tile--text' : ''}">
                      <span class="type-word">${esc(kindLabel(d))}</span>
                      <span class="mini-play" aria-hidden="true">${icon('play')}</span>
                    </span>
                    ${progressHTML(progressPct(d))}
                    <span class="listen-title">${esc(d.title)}</span>
                    <span class="listen-meta">${minsLeft(d, rate)} min left</span>
                  </a></li>`
                )
                .join('')}
            </ul>
          </section>`
        : ''
    }

    <section class="section" aria-labelledby="lib-h">
      <div class="section-head">
        <h2 id="lib-h">My library</h2>
        ${docs.length ? `<a href="#/library">See all${icon('chevron-right')}</a>` : ''}
      </div>
      ${
        docs.length
          ? `<ul class="lib-list">${docs.slice(0, 5).map((d) => libraryRowHTML(d, rate)).join('')}</ul>`
          : `<div class="empty">
              ${icon('book')}
              <h3 class="h5">Nothing here yet</h3>
              <p>Everything you listen to is saved here. Want to try one of these first?</p>
              <div class="empty-actions">
                ${SAMPLES.map((s, i) => `<button type="button" class="btn btn--secondary" data-sample="${i}">${esc(s.title)}</button>`).join('')}
              </div>
            </div>`
      }
    </section>
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
  main.querySelectorAll('[data-sample]').forEach((b) => b.addEventListener('click', () => openSample(Number(b.dataset.sample))));
}
