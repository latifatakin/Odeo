// Home: three bands. Continue listening, Add something to listen to, My library.

import { repo } from '../storage/repo.js';
import { getSettings } from '../settings.js';
import { minutesFor } from '../text.js';
import { addTilesHTML, SAMPLES, openSample } from '../importers.js';
import { typeTileHTML, progressHTML, applyPct, progressPct, kindLabel, isPasted } from '../covers.js';
import { esc, icon, formatDate, plural } from '../ui.js';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

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
  <div class="page">
    <header class="greet">
      <h1>${greeting()}</h1>
      <p>${
        resume
          ? `Pick up where you stopped: <a href="#/session/${resume.id}">${esc(resume.title)}</a>, ${plural(minsLeft(resume, rate), 'minute')} left.`
          : 'Paste text or upload a file, then press play.'
      }</p>
    </header>

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

    <section class="section" aria-labelledby="add-h">
      <div class="section-head"><h2 id="add-h">Add something to listen to</h2></div>
      <div class="add-tiles">${addTilesHTML()}</div>
    </section>

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
  main.querySelectorAll('[data-sample]').forEach((b) => b.addEventListener('click', () => openSample(Number(b.dataset.sample))));
}
