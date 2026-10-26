// Reading and display preferences: state, saving, and applying them to the page.
// The controls live in settings-ui.js (used by the Settings page and the
// Reading settings sheet).

import { repo, DEFAULT_SETTINGS } from './storage/repo.js';
import { speech } from './speech.js';
import { debounce } from './ui.js';

export const MIN_RATE = 0.8;
export const MAX_RATE = 2;
export const MIN_SIZE = 18;
export const MAX_SIZE = 32;

let current = { ...DEFAULT_SETTINGS };
export const settingsEvents = new EventTarget();
export const getSettings = () => current;

const save = debounce((values) => repo.saveSettings(values).catch(() => {}), 400);

// Bring settings saved by older versions of the app into today's options.
function normalize(s) {
  const out = { ...DEFAULT_SETTINGS, ...s };
  const fontMap = { opendyslexic: 'dyslexic', serif: 'body', system: 'body' };
  out.font = fontMap[out.font] || out.font;
  if (!['body', 'dyslexic', 'comic'].includes(out.font)) out.font = 'body';
  if (!['cream', 'sand'].includes(out.readingTheme)) out.readingTheme = out.readingTheme === 'paper' ? 'sand' : 'cream';
  if (!['system', 'light', 'dark'].includes(out.theme)) out.theme = 'system';
  if (!['system', 'reduce', 'allow'].includes(out.motion)) out.motion = 'system';
  out.fontSize = Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.round(out.fontSize / 2) * 2));
  out.lineHeight = Math.max(1.5, Number(out.lineHeight) || 1.7);
  out.rate = Math.min(MAX_RATE, Math.max(MIN_RATE, Math.round(out.rate * 10) / 10));
  delete out.bold;
  delete out.fontEverywhere;
  return out;
}

export async function initSettings() {
  current = normalize(await repo.getSettings());
  apply();
  speech.rate = current.rate;
  speech.voiceURI = current.voiceURI;

  repo.addEventListener('change', async (e) => {
    if (e.detail.collection === 'settings' && e.detail.origin === 'remote') {
      current = normalize(await repo.getSettings());
      apply();
      settingsEvents.dispatchEvent(new CustomEvent('change', { detail: current }));
    }
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', apply);
}

export function updateSettings(patch) {
  const prev = current;
  current = normalize({ ...current, ...patch });
  apply();
  if (current.rate !== prev.rate) speech.setRate(current.rate);
  if (current.voiceURI !== prev.voiceURI) speech.setVoice(current.voiceURI);
  save(current);
  settingsEvents.dispatchEvent(new CustomEvent('change', { detail: current }));
}

export function resetReading() {
  const { font, fontSize, lineHeight, letterSpacing, readingTheme, autoScroll } = DEFAULT_SETTINGS;
  updateSettings({ font, fontSize, lineHeight, letterSpacing, readingTheme, autoScroll });
}

export function prefersReducedMotion() {
  if (current.motion === 'reduce') return true;
  if (current.motion === 'allow') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function apply() {
  const root = document.documentElement;
  root.dataset.font = current.font;
  root.dataset.reading = current.readingTheme;
  if (current.theme === 'system') root.removeAttribute('data-theme');
  else root.dataset.theme = current.theme;
  if (current.motion === 'system') root.removeAttribute('data-motion');
  else root.dataset.motion = current.motion;
  root.style.setProperty('--read-size', `${current.fontSize}px`);
  root.style.setProperty('--read-line', String(current.lineHeight));
  root.style.setProperty('--read-letter', `${current.letterSpacing}em`);
  // Word gaps grow faster than letter gaps so words stay clearly apart.
  root.style.setProperty('--read-word', `${(0.16 + current.letterSpacing * 3.5).toFixed(2)}em`);

  const dark =
    current.theme === 'dark' ||
    (current.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => (m.content = dark ? '#16121F' : '#FBF9F4'));
}

