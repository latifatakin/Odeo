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

Free and fully private: everything runs in the browser, nothing is uploaded, and there is no account. Reading comfort for dyslexia (OpenDyslexic, spacing, themes) is built in, not an add-on.

## Operating Context

Used on phones, tablets and laptops, often in long listening sessions, sometimes offline (commuting, studying). Typical flow: start on Home, paste text or upload a file, press Generate Speech, listen with highlighting, save notes from selections, return later through My library.

## Capabilities and Constraints

- Paste text or upload PDF/TXT (up to 20 MB); review extracted text before listening.
- Word-by-word highlighting from boundary events, with an estimated-timing fallback for voices that give none.
- Voices are whatever the device offers; online voices need a connection. No celebrity or cloned voices.
- Speed 0.5×–2.5× range is available through the browser; estimated time only (no true audio duration).
- No audio download (Web Speech API limitation).
- Notes from selected text or the current sentence, with comments.
- My library: titles, dates, search, rename, delete, resume position.
- Settings: font (OpenDyslexic, Comic Sans, others), size, spacing, theme, voice, speed.
- Storage records carry a sync-ready envelope so sign-in and sync can be added later.
- Out of scope for now (user decided): AI summary, quiz, chat; book store or licensed books; accounts.

## Brand Commitments

- Name: Ôdēō (with the diacritics).
- Purple is the brand accent (user confirmed).
- Voice: playful and upbeat, friendly and encouraging (user chose this over calm or neutral), while staying plain and never childish.

## Evidence on Hand

No testimonials, user counts, press or metrics exist. Never fabricate them. Sample texts in the app are original educational paragraphs.

## Product Principles

1. Listening first: play is always one obvious step away.
2. Comfort is adjustable, never imposed: every reading preference can change and is remembered.
3. Private by default: nothing leaves the device.
4. Never lose someone's place: progress and notes save automatically.
5. Works without a connection once visited.

## Accessibility & Inclusion

WCAG 2.2 AA required. Dyslexia-friendly typography and spacing, keyboard and screen reader support, highlighting not by colour alone, reduced motion respected, layouts reflow to 320px. Mobile and tablet responsive.
