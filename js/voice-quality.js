// Voice quality: Odeo only offers clear, human-sounding voices.
//
// Voices come from the device, so we can't listen to them. Instead we sort
// them by what we know about each family of voices:
//
//   3  natural: neural, "Natural", "Premium", "Enhanced" and Siri voices
//   2  clear:   standard Apple, Google and Android voices
//   1  robotic: old Windows desktop voices, eSpeak and Linux system voices
//   0  never:   novelty, whispering, singing and distorted voices
//
// A language shows only its best voices (2 and up). Robotic voices show only
// for a language that has nothing better, so Odeo can still read it aloud.
// Level 0 voices are never shown.

// macOS novelty voices and the old MacinTalk voices: distorted, sung,
// whispered or very robotic.
const NOVELTY = new Set(
  [
    'albert', 'bad news', 'bahh', 'bells', 'boing', 'bubbles', 'cellos', 'deranged', 'good news',
    'hysterical', 'jester', 'organ', 'pipe organ', 'superstar', 'trinoids', 'whisper', 'wobble',
    'zarvox', 'agnes', 'bruce', 'fred', 'junior', 'kathy', 'princess', 'ralph', 'vicki', 'victoria',
  ]
);
// macOS Eloquence voices: very robotic, and listed once per language.
const ELOQUENCE = new Set(['eddy', 'flo', 'grandma', 'grandpa', 'reed', 'rocko', 'sandy', 'shelley']);

const NATURAL = /\b(natural|neural|premium|enhanced|siri|wavenet|studio|journey|polyglot)\b/i;

const IS_LINUX_DESKTOP =
  typeof navigator !== 'undefined' && /Linux/i.test(navigator.userAgent) && !/Android|CrOS/i.test(navigator.userAgent);

// The voice's own name, without the maker or the language in brackets.
const baseName = (v) =>
  v.name.replace(/^(Microsoft|Google|Apple)\s+/i, '').replace(/\s*\(.*$/, '').replace(/\s+-\s+.*$/, '').trim().toLowerCase();

export function voiceQuality(v) {
  const name = v.name || '';
  const uri = (v.voiceURI || '').toLowerCase();
  const base = baseName(v);
  const isMaker = /^(microsoft|google)\b/i.test(name);

  // Never
  if (/espeak|mbrola|festival|flite|pico/i.test(name + uri)) return 0;
  if (uri.includes('com.apple.eloquence') || uri.includes('com.apple.speech.synthesis.voice.')) {
    // Old MacinTalk family. Alex lives here too and is clear, so keep him.
    return base === 'alex' ? 2 : 0;
  }
  if (!isMaker && (NOVELTY.has(base) || ELOQUENCE.has(base))) return 0;

  // Natural
  if (NATURAL.test(name) || /\.(premium|enhanced)\./.test(uri) || /siri/.test(uri)) return 3;

  // Robotic
  // Old Windows voices (David, Zira, Mark, Hazel...). Windows' own natural
  // voices say "Natural" in their name and were caught above.
  if (/^microsoft\b/i.test(name)) return 1;
  // Linux system voices are almost always eSpeak under another name.
  if (IS_LINUX_DESKTOP && v.localService && !isMaker) return 1;

  // Clear
  return 2;
}

const langOf = (v) => v.lang.replace('_', '-').split('-')[0].toLowerCase();

// Keeps the good voices, and drops repeats of the same voice at lower quality
// (for example a compact Samantha when the enhanced one is installed).
export function filterVoices(voices) {
  const rated = voices.map((v) => ({ v, q: voiceQuality(v) })).filter((x) => x.q > 0);

  const bestPerLang = new Map();
  for (const { v, q } of rated) bestPerLang.set(langOf(v), Math.max(bestPerLang.get(langOf(v)) || 0, q));

  const kept = rated.filter(({ v, q }) => q >= Math.min(2, bestPerLang.get(langOf(v))));

  const seen = new Map();
  for (const x of kept) {
    const key = `${baseName(x.v)}|${x.v.lang.replace('_', '-').toLowerCase()}|${x.v.localService}`;
    const prev = seen.get(key);
    if (!prev || x.q > prev.q) seen.set(key, x);
  }
  return [...seen.values()];
}
