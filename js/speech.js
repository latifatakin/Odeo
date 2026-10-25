// Speech engine on top of the Web Speech API.
//
// - Speaks one sentence-sized chunk at a time (avoids Chrome's cut-off on
//   long utterances, and makes speed/voice changes quick).
// - Reports the word being read. It uses the browser's word "boundary"
//   events when the voice sends them, and otherwise estimates timing so the
//   highlight still moves.
// - "Pause" cancels and remembers the word. Native pause() is unreliable on
//   Android and some desktop voices, and restarting from a word works
//   everywhere.
//
// Events: 'word' { index }, 'state' { state }, 'error' { message }
// States: 'idle' | 'playing' | 'paused' | 'ended'

import { chunk, chunkIndexForWord, wordAtChar, tokenize } from './text.js';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;

class SpeechEngine extends EventTarget {
  constructor() {
    super();
    this.supported = !!synth && typeof window.SpeechSynthesisUtterance === 'function';
    this.voices = [];
    this.text = '';
    this.words = [];
    this.chunks = [];
    this.index = 0;
    this.state = 'idle';
    this.rate = 1;
    this.voiceURI = null;
    this.gen = 0;
    this.utterance = null;
    this.timer = null;
    this.noBoundaryVoices = new Set();

    if (this.supported) {
      this.#loadVoices();
      synth.addEventListener?.('voiceschanged', () => this.#loadVoices());
      // Safari sometimes never fires voiceschanged, so check a few times.
      let tries = 0;
      const poll = setInterval(() => {
        if (this.voices.length || ++tries > 10) clearInterval(poll);
        else this.#loadVoices();
      }, 300);
    }
  }

  #loadVoices() {
    const lang = (navigator.language || 'en').toLowerCase();
    const base = lang.split('-')[0];
    const score = (v) => {
      const l = v.lang.toLowerCase().replace('_', '-');
      let s = 0;
      if (l === lang) s += 4;
      else if (l.split('-')[0] === base) s += 3;
      if (v.localService) s += 1;
      if (v.default) s += 0.5;
      return s;
    };
    const list = synth.getVoices().slice();
    list.sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
    const changed = list.length !== this.voices.length;
    this.voices = list;
    if (changed) this.dispatchEvent(new CustomEvent('voices'));
  }

  // The voice we will actually use. Falls back to an on-device voice when
  // offline, because online voices cannot speak without a connection.
  currentVoice() {
    if (!this.voices.length) return null;
    let v = this.voices.find((x) => x.voiceURI === this.voiceURI) || this.voices[0];
    if (!navigator.onLine && !v.localService) {
      const base = v.lang.split(/[-_]/)[0];
      v =
        this.voices.find((x) => x.localService && x.lang.startsWith(base)) ||
        this.voices.find((x) => x.localService) ||
        v;
    }
    return v;
  }

  load(text) {
    this.stop();
    this.text = text;
    this.words = tokenize(text);
    this.chunks = chunk(text, this.words);
    this.index = 0;
    this.#setState('idle');
  }

  play(fromIndex = this.index) {
    if (!this.supported || !this.words.length) return;
    this.#cancel();
    this.index = Math.max(0, Math.min(fromIndex, this.words.length - 1));
    this.#setState('playing');
    const gen = this.gen;
    // A short delay after cancel() avoids a Chrome/Safari bug where the next
    // utterance is silently dropped.
    setTimeout(() => gen === this.gen && this.#speakFrom(this.index, gen), 40);
  }

  pause() {
    if (this.state !== 'playing') return;
    this.#cancel();
    this.#setState('paused');
  }

  toggle() {
    if (this.state === 'playing') this.pause();
    else this.play(this.state === 'ended' ? 0 : this.index);
  }

  stop() {
    this.#cancel();
    this.index = 0;
    if (this.words.length) this.#emitWord(0, true);
    this.#setState('idle');
  }

  seek(index) {
    const i = Math.max(0, Math.min(index, this.words.length - 1));
    if (this.state === 'playing') this.play(i);
    else {
      this.index = i;
      this.#emitWord(i, true);
      if (this.state === 'ended') this.#setState('paused');
    }
  }

  // Jump to the start of the previous or next sentence.
  skip(direction) {
    if (!this.chunks.length) return;
    const ci = chunkIndexForWord(this.chunks, this.index);
    const c = this.chunks[ci];
    let target;
    if (direction < 0) {
      // If we're well into the sentence, go to its start; else the previous one.
      target = this.index - c.startWord > 2 ? c.startWord : this.chunks[Math.max(0, ci - 1)].startWord;
    } else {
      target = this.chunks[Math.min(this.chunks.length - 1, ci + 1)].startWord;
    }
    this.seek(target);
  }

  setRate(rate) {
    this.rate = rate;
    if (this.state === 'playing') this.play(this.index);
  }

  setVoice(uri) {
    this.voiceURI = uri;
    if (this.state === 'playing') this.play(this.index);
  }

  // Speak a short sample with the current settings (used by Settings).
  sample(text) {
    if (!this.supported) return;
    if (this.state === 'playing') this.pause();
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = this.currentVoice();
    if (v) {
      u.voice = v;
      u.lang = v.lang;
    }
    u.rate = this.rate;
    setTimeout(() => synth.speak(u), 40);
  }

  // ---------- internals ----------

  #speakFrom(wordIndex, gen) {
    const ci = chunkIndexForWord(this.chunks, wordIndex);
    const c = this.chunks[ci];
    const startChar = this.words[wordIndex].start;
    const endChar = this.words[c.endWord].end;
    const u = new SpeechSynthesisUtterance(this.text.slice(startChar, endChar));
    const voice = this.currentVoice();
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    }
    u.rate = this.rate;

    let sawBoundary = false;
    const voiceKey = voice?.voiceURI || 'default';

    u.onstart = () => {
      if (gen !== this.gen) return;
      this.#emitWord(wordIndex);
      // No word events from this voice? Estimate instead.
      const wait = this.noBoundaryVoices.has(voiceKey) ? 0 : 700;
      this.timer = setTimeout(() => {
        if (!sawBoundary && gen === this.gen) {
          this.noBoundaryVoices.add(voiceKey);
          this.#estimate(wordIndex, c.endWord, gen, wait);
        }
      }, wait);
    };

    u.onboundary = (e) => {
      if (gen !== this.gen) return;
      if (e.name && e.name !== 'word') return;
      if (!sawBoundary) {
        sawBoundary = true;
        this.noBoundaryVoices.delete(voiceKey);
        clearTimeout(this.timer);
      }
      const i = wordAtChar(this.words, startChar + e.charIndex);
      if (i >= this.index) this.#emitWord(i);
    };

    u.onend = () => {
      if (gen !== this.gen) return;
      clearTimeout(this.timer);
      const next = c.endWord + 1;
      if (next < this.words.length) {
        this.index = next;
        this.#speakFrom(next, gen);
      } else {
        this.index = this.words.length - 1;
        this.#setState('ended');
      }
    };

    u.onerror = (e) => {
      if (gen !== this.gen) return;
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      clearTimeout(this.timer);
      this.#setState('paused');
      const message =
        e.error === 'network'
          ? 'This voice needs an internet connection. Choose an on-device voice in Reading settings.'
          : e.error === 'not-allowed'
            ? 'Your browser blocked speech. Press Play again to start.'
            : 'Speech stopped unexpectedly. Press Play to continue.';
      this.dispatchEvent(new CustomEvent('error', { detail: { message, code: e.error } }));
    };

    this.utterance = u; // keep a reference so it isn't garbage-collected mid-speech
    if (synth.paused) synth.resume();
    synth.speak(u);
  }

  // Move the highlight using estimated word timings.
  #estimate(fromWord, toWord, gen, alreadyElapsed) {
    const msPerWord = 60000 / (165 * this.rate);
    const durations = [];
    for (let i = fromWord; i <= toWord; i++) {
      const w = this.words[i];
      const t = this.text.slice(w.start, w.end);
      const weight = Math.min(2.2, Math.max(0.6, t.replace(/[^\p{L}\p{N}]/gu, '').length / 5));
      const pause = /[.!?;:,]$/.test(t) ? 0.35 : 0;
      durations.push(msPerWord * (weight + pause));
    }
    let i = fromWord;
    const step = () => {
      if (gen !== this.gen || i >= toWord) return;
      i++;
      this.#emitWord(i);
      this.timer = setTimeout(step, durations[i - fromWord]);
    };
    this.timer = setTimeout(step, Math.max(0, durations[0] - alreadyElapsed));
  }

  #emitWord(i, force = false) {
    if (!force && i === this.index && this.state !== 'playing') return;
    this.index = i;
    this.dispatchEvent(new CustomEvent('word', { detail: { index: i } }));
  }

  #cancel() {
    this.gen++;
    clearTimeout(this.timer);
    if (this.supported && (synth.speaking || synth.pending)) synth.cancel();
  }

  #setState(state) {
    if (this.state === state) return;
    this.state = state;
    this.dispatchEvent(new CustomEvent('state', { detail: { state } }));
  }
}

export const speech = new SpeechEngine();
