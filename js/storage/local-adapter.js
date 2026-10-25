// Storage adapter backed by localStorage.
//
// Every adapter exposes the same async interface, so the app can later swap
// this for IndexedDB or a remote/sync adapter without touching the UI:
//   getAll(collection) -> Promise<Record[]>
//   get(collection, id) -> Promise<Record|null>
//   put(collection, record) -> Promise<Record>
//   remove(collection, id) -> Promise<void>      (hard delete)
//   usage() -> Promise<{ bytes, quota }>
//
// Each record is stored under its own key ("odeo:v1:<collection>:<id>") so a
// small change (like saving the reading position) never rewrites big texts.

const PREFIX = 'odeo:v1:';

export class StorageFullError extends Error {
  constructor() {
    super('Storage is full');
    this.name = 'StorageFullError';
  }
}

function isQuotaError(err) {
  return err && (err.name === 'QuotaExceededError' || err.code === 22 || err.code === 1014);
}

export class LocalAdapter {
  constructor(store = window.localStorage) {
    this.store = store;
  }

  key(collection, id) {
    return `${PREFIX}${collection}:${id}`;
  }

  async getAll(collection) {
    const start = `${PREFIX}${collection}:`;
    const out = [];
    for (let i = 0; i < this.store.length; i++) {
      const k = this.store.key(i);
      if (k && k.startsWith(start)) {
        const rec = this.#parse(this.store.getItem(k));
        if (rec) out.push(rec);
      }
    }
    return out;
  }

  async get(collection, id) {
    return this.#parse(this.store.getItem(this.key(collection, id)));
  }

  async put(collection, record) {
    try {
      this.store.setItem(this.key(collection, record.id), JSON.stringify(record));
    } catch (err) {
      if (isQuotaError(err)) throw new StorageFullError();
      throw err;
    }
    return record;
  }

  async remove(collection, id) {
    this.store.removeItem(this.key(collection, id));
  }

  async usage() {
    let chars = 0;
    for (let i = 0; i < this.store.length; i++) {
      const k = this.store.key(i);
      if (k && k.startsWith(PREFIX)) chars += k.length + (this.store.getItem(k) || '').length;
    }
    // localStorage stores UTF-16, so each character is 2 bytes. Most browsers
    // allow about 5 MB per site.
    return { bytes: chars * 2, quota: 5 * 1024 * 1024 };
  }

  #parse(raw) {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}

export const STORAGE_PREFIX = PREFIX;
