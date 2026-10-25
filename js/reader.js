// Renders text as word spans and moves the highlight as words are read.

import { tokenize } from './text.js';

export class Reader {
  constructor(container, text) {
    this.el = container;
    this.text = text;
    this.words = tokenize(text);
    this.spans = [];
    this.current = -1;
    this.autoScroll = true;
    this.#render();
  }

  #render() {
    const frag = document.createDocumentFragment();
    let p = document.createElement('p');
    let last = 0;
    const flush = () => {
      if (p.childNodes.length) frag.append(p);
      p = document.createElement('p');
    };

    this.words.forEach((w, i) => {
      const gap = this.text.slice(last, w.start);
      if (/\n\s*\n/.test(gap)) flush();
      else if (gap && p.childNodes.length) p.append(gap.includes('\n') ? '\n' : ' ');
      const span = document.createElement('span');
      span.className = 'w';
      span.dataset.i = i;
      span.textContent = this.text.slice(w.start, w.end);
      p.append(span);
      this.spans.push(span);
      last = w.end;
    });
    flush();
    this.el.replaceChildren(frag);
  }

  highlight(index) {
    if (index === this.current) return;
    this.spans[this.current]?.classList.remove('is-current');
    const span = this.spans[index];
    this.current = index;
    if (!span) return;
    span.classList.add('is-current');
    if (this.autoScroll) this.#keepInView(span);
  }

  clear() {
    this.spans[this.current]?.classList.remove('is-current');
    this.current = -1;
  }

  #keepInView(span) {
    const r = span.getBoundingClientRect();
    const top = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sticky-top')) || 0;
    const margin = 80;
    if (r.top < top + margin || r.bottom > window.innerHeight - margin) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      span.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    }
  }

  // Mark words that belong to saved notes.
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

  // The words covered by the current text selection, or null.
  selectionRange() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
    const range = sel.getRangeAt(0);
    if (!this.el.contains(range.commonAncestorContainer)) return null;

    let start = this.wordIndexFromNode(range.startContainer);
    let end = this.wordIndexFromNode(range.endContainer);
    if (start === null || end === null) {
      // Selection starts or ends in the space between words.
      const hit = this.spans.filter((s) => range.intersectsNode(s));
      if (!hit.length) return null;
      start = start ?? Number(hit[0].dataset.i);
      end = end ?? Number(hit[hit.length - 1].dataset.i);
    }
    // Ignore a selection that ends at offset 0 of the next word.
    if (end > start && range.endContainer.nodeType === 3 && range.endOffset === 0) end--;
    if (start > end) [start, end] = [end, start];
    return { start, end, rect: range.getBoundingClientRect() };
  }

  quote(start, end) {
    return this.text.slice(this.words[start].start, this.words[end].end).replace(/\s+/g, ' ');
  }
}
