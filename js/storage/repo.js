// The repository: the only place the app reads or writes saved data.
//
// Records are grouped in collections. Every record carries the same envelope,
// which is what a future sync service needs to merge changes between devices:
//
//   id         UUID, created on this device, never reused
//   createdAt  ISO time
//   updatedAt  ISO time of the last change (used for "last write wins")
//   deletedAt  ISO time when deleted, else null (a "tombstone")
//   rev        number, +1 on every change
//   deviceId   which device made the last change
//   ownerId    null until the person signs in
//   schema     record format version, for migrations
//
// Collections:
//   documents  { title, text, source: { type, fileName?, pages? }, wordCount }
//   progress   id = documentId. { documentId, wordIndex, completed, lastOpenedAt }
//              Kept apart from documents so saving the reading position
//              often never re-uploads a long text.
//   notes      { documentId, quote, startWord, endWord, comment }
//   settings   id = "user". Reading preferences.
//   meta       id = "device". { userId, lastSyncedAt } — local only, never synced.

import { LocalAdapter, StorageFullError } from './local-adapter.js';

export { StorageFullError };

export const SCHEMA_VERSION = 1;
const SYNCED_COLLECTIONS = ['documents', 'progress', 'notes', 'settings'];

const now = () => new Date().toISOString();
const uuid = () =>
  crypto.randomUUID
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });

export const DEFAULT_SETTINGS = {
  font: 'opendyslexic', // 'opendyslexic' | 'comic' | 'serif' | 'system'
  fontSize: 20, // px, reading text
  lineHeight: 1.8,
  letterSpacing: 0.05, // em
  bold: false,
  fontEverywhere: false, // use the reading font for menus and buttons too
  theme: 'system', // 'system' | 'light' | 'dark'
  readingTheme: 'basic', // 'basic' | 'warm' | 'paper'
  rate: 1,
  autoSpeed: false, // speed up gradually while listening
  voiceURI: null,
  recentVoices: [],
  autoScroll: true,
};

class Repository extends EventTarget {
  constructor(adapter) {
    super();
    this.adapter = adapter;
    this.meta = null;
  }

  async init() {
    let meta = await this.adapter.get('meta', 'device');
    if (!meta) {
      meta = { id: 'device', deviceId: uuid(), userId: null, lastSyncedAt: null, schema: SCHEMA_VERSION };
      await this.adapter.put('meta', meta);
    }
    this.meta = meta;
    await this.#migrate(meta.schema || 1);

    // Keep other open tabs in step.
    window.addEventListener('storage', (e) => {
      if (!e.key || !e.key.startsWith('odeo:v1:')) return;
      const [, , collection, id] = e.key.split(':');
      this.#emit(collection, id, 'remote');
    });
  }

  // ---------- Generic helpers ----------

  #envelope(fields) {
    const t = now();
    return {
      id: uuid(),
      createdAt: t,
      updatedAt: t,
      deletedAt: null,
      rev: 1,
      deviceId: this.meta.deviceId,
      ownerId: this.meta.userId,
      schema: SCHEMA_VERSION,
      ...fields,
    };
  }

  #touch(record, patch) {
    return {
      ...record,
      ...patch,
      updatedAt: now(),
      rev: (record.rev || 0) + 1,
      deviceId: this.meta.deviceId,
    };
  }

  #emit(collection, id, origin = 'local') {
    this.dispatchEvent(new CustomEvent('change', { detail: { collection, id, origin } }));
  }

  async #live(collection) {
    return (await this.adapter.getAll(collection)).filter((r) => !r.deletedAt);
  }

  // Until the person has synced at least once, nobody else needs to know an
  // item existed, so we delete it outright. After sync is added, we keep a
  // small tombstone (no content) so other devices learn about the delete.
  async #delete(collection, record) {
    if (!this.meta.lastSyncedAt) {
      await this.adapter.remove(collection, record.id);
    } else {
      const tomb = this.#touch(
        { id: record.id, createdAt: record.createdAt, rev: record.rev, ownerId: record.ownerId, schema: record.schema },
        { deletedAt: now() }
      );
      await this.adapter.put(collection, tomb);
    }
  }

  async #migrate(fromVersion) {
    if (fromVersion === SCHEMA_VERSION) return;
    // Future: transform records from older schema versions here.
    this.meta = { ...this.meta, schema: SCHEMA_VERSION };
    await this.adapter.put('meta', this.meta);
  }

  // ---------- Documents ----------

  async listDocuments() {
    const [docs, progress, notes] = await Promise.all([
      this.#live('documents'),
      this.#live('progress'),
      this.#live('notes'),
    ]);
    const byDoc = new Map(progress.map((p) => [p.id, p]));
    const noteCounts = new Map();
    for (const n of notes) noteCounts.set(n.documentId, (noteCounts.get(n.documentId) || 0) + 1);
    return docs.map((d) => ({
      ...d,
      progress: byDoc.get(d.id) || null,
      noteCount: noteCounts.get(d.id) || 0,
      lastOpenedAt: byDoc.get(d.id)?.lastOpenedAt || d.createdAt,
    }));
  }

  async getDocument(id) {
    const doc = await this.adapter.get('documents', id);
    return doc && !doc.deletedAt ? doc : null;
  }

  async createDocument({ title, text, source }) {
    const doc = this.#envelope({
      title: title.trim() || 'Untitled',
      text,
      source: source || { type: 'paste' },
      wordCount: (text.match(/\S+/g) || []).length,
    });
    await this.adapter.put('documents', doc);
    this.#emit('documents', doc.id);
    return doc;
  }

  async renameDocument(id, title) {
    const doc = await this.getDocument(id);
    if (!doc) return null;
    const next = this.#touch(doc, { title: title.trim() || 'Untitled' });
    await this.adapter.put('documents', next);
    this.#emit('documents', id);
    return next;
  }

  async deleteDocument(id) {
    const doc = await this.getDocument(id);
    if (!doc) return;
    const [progress, notes] = await Promise.all([this.adapter.get('progress', id), this.listNotes(id)]);
    for (const n of notes) await this.#delete('notes', n);
    if (progress) await this.#delete('progress', progress);
    await this.#delete('documents', doc);
    this.#emit('documents', id);
  }

  // ---------- Progress ----------

  async getProgress(documentId) {
    const p = await this.adapter.get('progress', documentId);
    return p && !p.deletedAt ? p : null;
  }

  async saveProgress(documentId, patch) {
    const existing = await this.getProgress(documentId);
    const next = existing
      ? this.#touch(existing, patch)
      : this.#envelope({ id: documentId, documentId, wordIndex: 0, completed: false, lastOpenedAt: now(), ...patch });
    await this.adapter.put('progress', next);
    this.#emit('progress', documentId);
    return next;
  }

  markOpened(documentId) {
    return this.saveProgress(documentId, { lastOpenedAt: now() });
  }

  // ---------- Notes ----------

  async listAllNotes() {
    return this.#live('notes');
  }

  async listNotes(documentId) {
    const notes = await this.#live('notes');
    return notes.filter((n) => n.documentId === documentId).sort((a, b) => a.startWord - b.startWord);
  }

  async createNote({ documentId, quote, startWord, endWord, comment = '' }) {
    const note = this.#envelope({ documentId, quote, startWord, endWord, comment });
    await this.adapter.put('notes', note);
    this.#emit('notes', note.id);
    return note;
  }

  async updateNote(id, patch) {
    const note = await this.adapter.get('notes', id);
    if (!note || note.deletedAt) return null;
    const next = this.#touch(note, patch);
    await this.adapter.put('notes', next);
    this.#emit('notes', id);
    return next;
  }

  async deleteNote(id) {
    const note = await this.adapter.get('notes', id);
    if (!note) return;
    await this.#delete('notes', note);
    this.#emit('notes', id);
  }

  // ---------- Settings ----------

  async getSettings() {
    const s = await this.adapter.get('settings', 'user');
    return { ...DEFAULT_SETTINGS, ...(s?.values || {}) };
  }

  async saveSettings(values) {
    const existing = await this.adapter.get('settings', 'user');
    const next = existing
      ? this.#touch(existing, { values })
      : this.#envelope({ id: 'user', values });
    await this.adapter.put('settings', next);
    this.#emit('settings', 'user');
    return values;
  }

  // ---------- Sync hooks (for later) ----------

  // Everything changed since the last sync. A future sync module would push
  // these to the server, pull the server's changes, then call markSynced().
  async changesSince(iso = this.meta.lastSyncedAt) {
    const out = {};
    for (const c of SYNCED_COLLECTIONS) {
      const all = await this.adapter.getAll(c);
      out[c] = iso ? all.filter((r) => r.updatedAt > iso) : all;
    }
    return out;
  }

  async markSynced(iso = now(), userId = this.meta.userId) {
    this.meta = { ...this.meta, lastSyncedAt: iso, userId };
    await this.adapter.put('meta', this.meta);
  }

  usage() {
    return this.adapter.usage();
  }
}

export const repo = new Repository(new LocalAdapter());
