# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML, CSS and vanilla JavaScript ES modules, no build step. Hosted free on Netlify. Browser Web Speech API for speech, pdf.js (vendored) for PDFs, localStorage behind a repository layer for saved data. Installable and offline-capable through a service worker.

## Users

People with dyslexia, people with visual impairments, and people who learn better by listening. Study use (students listening to readings, handouts and notes, taking notes) and everyday reading (articles, work documents) carry equal weight.

## Product Purpose

Ôdēō turns pasted text, PDF or TXT files into speech, highlighting each word as it is read, so reading becomes listening. Success means a person can paste or upload, press play, follow along comfortably, save notes, and pick up later exactly where they stopped, including offline.

## Positioning

Free and private: everything runs in the browser and there is no account. Files and text never leave the device. The one exception is Paste link: the link (only the link) goes to Ôdēō's own Netlify Function, which fetches the page; nothing is stored there. Reading comfort for dyslexia (OpenDyslexic, spacing, themes) is built in, not an add-on.

## Operating Context

Used on phones, tablets and laptops, often in long listening sessions, sometimes offline (commuting, studying). Typical flow: start on Home, paste text or upload a file, press Generate Speech, listen with highlighting, save notes from selections, return later through My library.

## Capabilities and Constraints

- Paste text, upload PDF/TXT (up to 20 MB), or paste a link to a web article or PDF (pages up to 5 MB); review extracted text before listening. Paste link needs a connection and can't open paywalled or login-only pages.
- Word-by-word highlighting from boundary events, with an estimated-timing fallback for voices that give none.
- Voices are whatever the device offers; online voices need a connection. No celebrity or cloned voices.
- Speed 0.8×–2.0×; times are estimates (the browser gives no true audio duration).
- No audio download (Web Speech API limitation).
- Notes from selected text or the current sentence, with comments.
- My library: titles, dates, search, rename, delete, resume position.
- Settings page plus a Reading settings sheet: font (Atkinson Hyperlegible, OpenDyslexic, Comic), size 18–32px, line and letter spacing, page colour, light/dark, motion, voice, speed (0.8–2.0×).
- Storage records carry a sync-ready envelope so sign-in and sync can be added later.
- Out of scope for now (user decided): AI summary, quiz, chat; book store or licensed books; accounts.

## Brand Commitments

- The Odeo brand guide (`.claude/skills/odeo-brand/SKILL.md`) is binding for every screen, component, asset and piece of copy (user provided, 26 Oct 2026).
- Name: Ôdēō. Brand purple #5B32C9, sunbeam yellow #FFC94D, cream backgrounds, Helvetica headings and Atkinson Hyperlegible for all other text (user decision, 30 Oct 2026; the guide said Comic Sans headings and Arial body).
- Voice: like a kind friend. Short sentences, everyday words, sentence case, no emoji.

## Evidence on Hand

No testimonials, user counts, press or metrics exist. Never fabricate them. Sample texts in the app are original educational paragraphs.

## Product Principles

1. Listening first: play is always one obvious step away.
2. Comfort is adjustable, never imposed: every reading preference can change and is remembered.
3. Private by default: nothing leaves the device, except a pasted link, which goes to Ôdēō's own server only to fetch that page.
4. Never lose someone's place: progress and notes save automatically.
5. Works without a connection once visited.

## Accessibility & Inclusion

WCAG 2.2 AA required. Dyslexia-friendly typography and spacing, keyboard and screen reader support, highlighting not by colour alone, reduced motion respected, layouts reflow to 320px. Mobile and tablet responsive.
