// Renders text as word spans and moves the two-level highlight:
// a soft wash on the sentence being read, a stronger chip on the word.

import { tokenize } from './text.js';

export class Reader {
  constructor(container, text) {
    this.el = container;
    this.text = text;
    this.words = tokenize(text);
    this.spans = [];
    this.current = -1;
    this.sentence = null;
    this.autoScroll = true;
    this.#render();
  }

  // Each word is <span class="w"><span class="wt">word</span> </span>.
  // The trailing space lives inside .w so the sentence wash has no gaps.
  #render() {
    const frag = document.createDocumentFragment();
    let p = document.createElement('p');
    const flush = () => {
      if (p.childNodes.length) frag.append(p);
      p = document.createElement('p');
    };

    this.words.forEach((w, i) => {
      const next = this.words[i + 1];
      const gap = next ? this.text.slice(w.end, next.start) : '';
      const span = document.createElement('span');
      span.className = 'w';
      span.dataset.i = i;
      const wt = document.createElement('span');
      wt.className = 'wt';
      wt.textContent = this.text.slice(w.start, w.end);
      span.append(wt);
      const paragraphBreak = /\n\s*\n/.test(gap);
      const lineBreak = !paragraphBreak && gap.includes('\n');
      if (next && !paragraphBreak && !lineBreak) span.append(' ');
      p.append(span);
      if (lineBreak) p.append('\n');
      this.spans.push(span);
      if (paragraphBreak) flush();
    });
    flush();
    this.el.replaceChildren(frag);
  }

  highlight(index) {
    if (index === this.current) return;
    this.spans[this.current]?.classList.remove('is-current');
    this.current = index;
    const span = this.spans[index];
    if (!span) return;
    span.classList.add('is-current');
    if (this.autoScroll) this.#keepInView(span);
  }

  // Wash the words from start to end (inclusive) as the current sentence.
  markSentence(start, end) {
    if (this.sentence && this.sentence[0] === start && this.sentence[1] === end) return;
    this.clearSentence();
    if (start == null) return;
    for (let i = start; i <= end; i++) this.spans[i]?.classList.add('in-sentence');
    this.spans[start]?.classList.add('s-start');
    this.spans[end]?.classList.add('s-end');
    this.sentence = [start, end];
  }

  clearSentence() {
    if (!this.sentence) return;
    const [a, b] = this.sentence;
    for (let i = a; i <= b; i++) this.spans[i]?.classList.remove('in-sentence', 's-start', 's-end');
    this.sentence = null;
  }

  #keepInView(span) {
    const r = span.getBoundingClientRect();
    const css = getComputedStyle(this.el);
    const top = parseFloat(css.getPropertyValue('--sticky-top')) || 0;
    const bottom = parseFloat(css.getPropertyValue('--sticky-bottom')) || 0;
    const margin = 48;
    if (r.top < top + margin || r.bottom > window.innerHeight - bottom - margin) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const target = window.scrollY + r.top - top - (window.innerHeight - top - bottom) * 0.3;
      window.scrollTo({ top: Math.max(0, target), behavior: reduce ? 'auto' : 'smooth' });
    }
  }

  markNotes(notes) {
    for (const s of this.el.querySelectorAll('.w.has-note')) s.classList.remove('has-note');
    for (const n of notes) {
      for (let i = n.startWord; i <= n.endWord; i++) this.spans[i]?.classList.add('has-note');
    }
  }

  wordIndexFromNode(node) {
    const el = node?.nodeType === 1 ? node : node?.parentElement;
    const span = el?.closest?.('.w');
    return span && this.el.contains(span) ? Number(span.dataset.i) : null;
  }

  selectionRange() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
    const range = sel.getRangeAt(0);
    if (!this.el.contains(range.commonAncestorContainer)) return null;

    let start = this.wordIndexFromNode(range.startContainer);
    let end = this.wordIndexFromNode(range.endContainer);
    if (start === null || end === null) {
      const hit = this.spans.filter((s) => range.intersectsNode(s));
      if (!hit.length) return null;
      start = start ?? Number(hit[0].dataset.i);
      end = end ?? Number(hit[hit.length - 1].dataset.i);
    }
    // A selection ending right at the start of a word doesn't include it.
    if (end > start && range.endOffset === 0 && range.endContainer.nodeType === 3) {
      const endSpan = range.endContainer.parentElement?.closest('.w');
      if (endSpan && range.endContainer === endSpan.querySelector('.wt')?.firstChild) end--;
    }
    if (start > end) [start, end] = [end, start];
    return { start, end, rect: range.getBoundingClientRect() };
  }

  quote(start, end) {
    return this.text.slice(this.words[start].start, this.words[end].end).replace(/\s+/g, ' ');
  }
}
