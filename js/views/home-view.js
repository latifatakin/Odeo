// Home: a centred heading, one large upload area, Paste text and Paste link,
// then Continue listening. My library has its own page.

import { repo } from '../storage/repo.js';
import { getSettings } from '../settings.js';
import { minutesFor } from '../text.js';
import { addBoxHTML, bindAddBox } from '../add-box.js';
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

    <section class="home-section" aria-label="Add something to listen to">
      ${addBoxHTML('home')}
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

  bindAddBox(main);
}
