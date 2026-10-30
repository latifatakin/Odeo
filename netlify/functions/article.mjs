// Paste a link: fetch a web page and pull out the article text.
//
// Browsers block one site from reading another site's pages, so Ôdēō asks this
// small Netlify Function to do it. It receives only the link, fetches the page,
// and sends back the article text (or the PDF itself). Nothing is stored here.
//
// POST /api/article  { "url": "https://…" }
//   200 JSON { title, text, site, url }   for web pages
//   200 application/pdf (raw bytes)       for PDF links, read in the browser
//   4xx/5xx JSON { error }                with a message people can act on

import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';

export const config = { path: '/api/article' };

const TIMEOUT_MS = 10_000;
const MAX_HTML = 5 * 1024 * 1024; // 5 MB of page
const MAX_PDF = 5 * 1024 * 1024; // the function response limit is 6 MB
const MAX_REDIRECTS = 4;
const MAX_TEXT = 300_000; // same limit as pasted text
const USER_AGENT = 'Mozilla/5.0 (compatible; OdeoReader/1.0; reads articles aloud for people with dyslexia and low vision)';

class Friendly extends Error {
  constructor(message, status = 422) {
    super(message);
    this.status = status;
  }
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

// ---------- Safety: only public web addresses ----------

function isPrivateIPv4(ip) {
  const [a, b] = ip.split('.').map(Number);
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // shared address space
    (a === 169 && b === 254) || // link-local, cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224 // multicast and reserved
  );
}

function isPrivateIP(ip) {
  if (isIP(ip) === 4) return isPrivateIPv4(ip);
  const v6 = ip.toLowerCase();
  const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return (
    v6 === '::' || v6 === '::1' ||
    v6.startsWith('fc') || v6.startsWith('fd') || // unique local
    v6.startsWith('fe8') || v6.startsWith('fe9') || v6.startsWith('fea') || v6.startsWith('feb') || // link-local
    v6.startsWith('ff') // multicast
  );
}

async function checkUrl(raw) {
  let url;
  try {
    url = new URL(String(raw).trim());
  } catch {
    throw new Friendly('That doesn’t look like a web link. It should start with https://', 400);
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Friendly('Only web links (https://) work here.', 400);
  if (url.username || url.password) throw new Friendly('Links with a username or password in them can’t be opened.', 400);
  if (url.port && !['80', '443'].includes(url.port)) throw new Friendly('That link uses an unusual port, so it can’t be opened.', 400);

  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new Friendly('Only public websites work here.', 400);
  }
  let addresses;
  try {
    addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  } catch {
    throw new Friendly('We couldn’t find that website. Check the link and try again.', 404);
  }
  if (!addresses.length || addresses.some((a) => isPrivateIP(a.address))) {
    throw new Friendly('Only public websites work here.', 400);
  }
  return url;
}

// ---------- Fetching ----------

async function fetchPage(startUrl, signal) {
  let url = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(url, {
      redirect: 'manual', // follow by hand so every hop is checked
      signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/pdf;q=0.9,text/plain;q=0.8,*/*;q=0.5',
        'Accept-Language': 'en;q=0.9, *;q=0.5',
      },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      url = await checkUrl(new URL(res.headers.get('location'), url).href);
      continue;
    }
    return { res, url };
  }
  throw new Friendly('That link redirects too many times.', 422);
}

async function readCapped(res, max) {
  const declared = Number(res.headers.get('content-length') || 0);
  if (declared > max) throw new Friendly('That page is too big to read here.', 413);
  const reader = res.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      reader.cancel().catch(() => {});
      throw new Friendly('That page is too big to read here.', 413);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c)));
}

function decode(buf, contentType) {
  const charset = /charset=([^;]+)/i.exec(contentType || '')?.[1]?.trim().replace(/["']/g, '') || '';
  const head = buf.subarray(0, 2048).toString('latin1');
  const meta = /<meta[^>]+charset=["']?([\w-]+)/i.exec(head)?.[1] || '';
  for (const label of [charset, meta, 'utf-8']) {
    if (!label) continue;
    try {
      return new TextDecoder(label).decode(buf);
    } catch {}
  }
  return buf.toString('utf8');
}

// ---------- Turning a page into readable text ----------

const BLOCKS = 'h1,h2,h3,h4,h5,h6,p,li,blockquote,pre,figcaption,dt,dd,td,th';
const clean = (s) => s.replace(/\s+/g, ' ').trim();

function articleToText(html) {
  const { document } = parseHTML(`<!doctype html><html><body>${html}</body></html>`);
  const parts = [];
  for (const el of document.querySelectorAll(BLOCKS)) {
    if (el.parentElement?.closest(BLOCKS)) continue; // skip blocks nested in a block already taken
    const t = clean(el.textContent || '');
    if (t) parts.push(t);
  }
  const text = parts.length ? parts.join('\n\n') : clean(document.body.textContent || '');
  return text.slice(0, MAX_TEXT);
}

function extractArticle(html, url) {
  const { document } = parseHTML(html);
  const pageTitle = clean(document.querySelector('meta[property="og:title"]')?.getAttribute('content') || document.title || '');
  const site = clean(document.querySelector('meta[property="og:site_name"]')?.getAttribute('content') || '') || url.hostname.replace(/^www\./, '');
  const article = new Readability(document, { charThreshold: 300 }).parse();
  const text = article?.content ? articleToText(article.content) : '';
  if (text.split(/\s+/).length < 40) {
    throw new Friendly('We couldn’t find an article on that page. It may need a login or a subscription. Try copying the text and pasting it instead.', 422);
  }
  return { title: clean(article.title || pageTitle).slice(0, 120), text, site, url: url.href };
}

// ---------- Handler ----------

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Send the link as JSON: {"url": "https://…"}' }, 400);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const startUrl = await checkUrl(body?.url);
    const { res, url } = await fetchPage(startUrl, controller.signal);

    if (res.status === 401 || res.status === 403) {
      throw new Friendly('That website didn’t let us in. It may need a login, or it blocks readers like Ôdēō. Try copying the text and pasting it instead.', 422);
    }
    if (res.status === 404 || res.status === 410) throw new Friendly('That page doesn’t exist any more. Check the link and try again.', 404);
    if (!res.ok) throw new Friendly('That website didn’t answer properly. Try again in a moment.', 502);

    const type = (res.headers.get('content-type') || '').toLowerCase();
    if (type.includes('application/pdf')) {
      const pdf = await readCapped(res, MAX_PDF);
      const name = decodeURIComponent(url.pathname.split('/').pop() || 'document.pdf');
      return new Response(pdf, {
        headers: {
          'Content-Type': 'application/pdf',
          'Cache-Control': 'no-store',
          'X-Odeo-Filename': encodeURIComponent(name.endsWith('.pdf') ? name : `${name}.pdf`),
        },
      });
    }
    if (type.includes('text/plain')) {
      const text = decode(await readCapped(res, MAX_HTML), type).trim().slice(0, MAX_TEXT);
      if (!text) throw new Friendly('That page is empty.', 422);
      const title = decodeURIComponent(url.pathname.split('/').pop() || url.hostname);
      return json({ title, text, site: url.hostname.replace(/^www\./, ''), url: url.href });
    }
    if (!type.includes('html') && type) {
      throw new Friendly('That link isn’t a web page or a PDF, so Ôdēō can’t read it.', 415);
    }

    const html = decode(await readCapped(res, MAX_HTML), type);
    return json(extractArticle(html, url));
  } catch (err) {
    if (err instanceof Friendly) return json({ error: err.message }, err.status);
    if (err?.name === 'AbortError') return json({ error: 'That website took too long to answer. Try again in a moment.' }, 504);
    console.error('article fetch failed', err);
    return json({ error: 'Something went wrong getting that page. Try again, or copy the text and paste it instead.' }, 500);
  } finally {
    clearTimeout(timer);
  }
};
