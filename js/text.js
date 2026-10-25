// Splits text into words (with their positions) and into speakable chunks.

// Each word: { start, end } character offsets into the original text.
export function tokenize(text) {
  const words = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(text))) words.push({ start: m.index, end: m.index + m[0].length });
  return words;
}

const SENTENCE_END = /[.!?…]["'”’)\]]*$/;
const SOFT_BREAK = /[,;:—–]["'”’)\]]*$/;
const MAX_CHARS = 220;
const SOFT_CHARS = 140;

// Chunks are sentence-sized runs of words: { startWord, endWord }.
// Browsers (Chrome especially) stop speaking very long utterances, and short
// chunks also let us restart quickly when the speed or voice changes.
export function chunk(text, words) {
  const chunks = [];
  let startWord = 0;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const word = text.slice(w.start, w.end);
    const next = words[i + 1];
    const gap = next ? text.slice(w.end, next.start) : '';
    const length = w.end - words[startWord].start;

    const endHere =
      !next ||
      SENTENCE_END.test(word) ||
      gap.includes('\n') ||
      (length > SOFT_CHARS && SOFT_BREAK.test(word)) ||
      length > MAX_CHARS;

    if (endHere) {
      chunks.push({ startWord, endWord: i });
      startWord = i + 1;
    }
  }
  return chunks;
}

// Index of the word containing (or just before) a character offset.
export function wordAtChar(words, charIndex) {
  let lo = 0;
  let hi = words.length - 1;
  let ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (words[mid].start <= charIndex) {
      ans = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}

export function chunkIndexForWord(chunks, wordIndex) {
  let lo = 0;
  let hi = chunks.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const c = chunks[mid];
    if (wordIndex < c.startWord) hi = mid - 1;
    else if (wordIndex > c.endWord) lo = mid + 1;
    else return mid;
  }
  return Math.max(0, Math.min(chunks.length - 1, lo));
}

// Typical speech is about 165 words per minute at normal speed.
export const WORDS_PER_MINUTE = 165;
export const minutesFor = (wordCount, rate) => wordCount / (WORDS_PER_MINUTE * rate);
