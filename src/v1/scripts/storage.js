import { safeJsonParse } from './utils.js';

const DB_NAME = 'ai-coach-kyle';
const DB_VERSION = 1;

/**
 * IndexedDB-backed app storage with a localStorage fallback.
 * The fallback keeps preferences and library metadata working even
 * if a browser blocks IndexedDB for any reason.
 */
export class AppStorage {
  constructor(namespace = 'ai-coach') {
    this.namespace = namespace;
    this.mode = 'local';
    this.db = null;
    this.ready = false;
    this.localCache = {
      settings: {},
      library: [],
      playlists: [],
      applications: [],
      logs: [],
    };
  }

  /**
   * Initialize persistence and return the active instance.
   * @returns {Promise<AppStorage>}
   */
  async init() {
    if (this.ready) return this;

    if (globalThis.indexedDB) {
      try {
        this.db = await this.#openIndexedDb();
        this.mode = 'idb';
      } catch {
        this.mode = 'local';
        this.#hydrateLocalCache();
      }
    } else {
      this.mode = 'local';
      this.#hydrateLocalCache();
    }

    this.ready = true;
    return this;
  }

  /**
   * Whether the browser is using the IndexedDB path.
   * @returns {boolean}
   */
  isIndexedDb() {
    return this.mode === 'idb';
  }

  /**
   * Get a setting value.
   * @template T
   * @param {string} key
   * @param {T} fallback
   * @returns {Promise<T>}
   */
  async getSetting(key, fallback) {
    await this.init();
    if (this.mode === 'idb') {
      const record = await this.#idbGet('settings', key);
      return record?.value ?? fallback;
    }

    return key in this.localCache.settings ? this.localCache.settings[key] : fallback;
  }

  /**
   * Persist a setting value.
   * @param {string} key
   * @param {unknown} value
   * @returns {Promise<void>}
   */
  async setSetting(key, value) {
    await this.init();
    if (this.mode === 'idb') {
      await this.#idbPut('settings', { key, value });
      return;
    }

    this.localCache.settings[key] = value;
    this.#persistLocal();
  }

  /**
   * Retrieve the full settings object.
   * @returns {Promise<Record<string, unknown>>}
   */
  async getSettings() {
    await this.init();
    if (this.mode === 'idb') {
      const records = await this.#idbGetAll('settings');
      return Object.fromEntries(records.map((record) => [record.key, record.value]));
    }

    return { ...this.localCache.settings };
  }

  /**
   * Replace all settings.
   * @param {Record<string, unknown>} settings
   * @returns {Promise<void>}
   */
  async setSettings(settings) {
    await this.init();
    if (this.mode === 'idb') {
      await this.#idbClear('settings');
      await Promise.all(Object.entries(settings).map(([key, value]) => this.#idbPut('settings', { key, value })));
      return;
    }

    this.localCache.settings = { ...settings };
    this.#persistLocal();
  }

  /**
   * List library items.
   * @returns {Promise<Array<any>>}
   */
  async listLibrary() {
    await this.init();
    if (this.mode === 'idb') {
      return this.#idbGetAll('library');
    }

    return this.localCache.library.map((item) => ({ ...item }));
  }

  /**
   * Save a library record.
   * @param {Record<string, any>} item
   * @returns {Promise<void>}
   */
  async saveLibraryItem(item) {
    await this.init();
    if (this.mode === 'idb') {
      await this.#idbPut('library', item);
      return;
    }

    this.#upsertLocalArray('library', item);
  }

  /**
   * Replace the full library.
   * @param {Array<Record<string, any>>} items
   * @returns {Promise<void>}
   */
  async replaceLibrary(items) {
    await this.init();
    if (this.mode === 'idb') {
      await this.#idbClear('library');
      await Promise.all(items.map((item) => this.#idbPut('library', item)));
      return;
    }

    this.localCache.library = items.map((item) => ({ ...item }));
    this.#persistLocal();
  }

  /**
   * Remove a library item.
   * @param {string} id
   * @returns {Promise<void>}
   */
  async deleteLibraryItem(id) {
    await this.init();
    if (this.mode === 'idb') {
      await this.#idbDelete('library', id);
      return;
    }

    this.localCache.library = this.localCache.library.filter((item) => item.id !== id);
    this.#persistLocal();
  }

  /**
   * List playlists.
   * @returns {Promise<Array<any>>}
   */
  async listPlaylists() {
    await this.init();
    if (this.mode === 'idb') {
      return this.#idbGetAll('playlists');
    }

    return this.localCache.playlists.map((playlist) => ({ ...playlist }));
  }

  /**
   * Save a playlist.
   * @param {Record<string, any>} playlist
   * @returns {Promise<void>}
   */
  async savePlaylist(playlist) {
    await this.init();
    if (this.mode === 'idb') {
      await this.#idbPut('playlists', playlist);
      return;
    }

    this.#upsertLocalArray('playlists', playlist);
  }

  /**
   * Replace all playlists.
   * @param {Array<Record<string, any>>} playlists
   * @returns {Promise<void>}
   */
  async replacePlaylists(playlists) {
    await this.init();
    if (this.mode === 'idb') {
      await this.#idbClear('playlists');
      await Promise.all(playlists.map((playlist) => this.#idbPut('playlists', playlist)));
      return;
    }

    this.localCache.playlists = playlists.map((playlist) => ({ ...playlist }));
    this.#persistLocal();
  }

  /**
   * List stored mentorship applications.
   * @returns {Promise<Array<any>>}
   */
  async listApplications() {
    await this.init();
    if (this.mode === 'idb') {
      return this.#idbGetAll('applications');
    }

    return this.localCache.applications.map((application) => ({ ...application }));
  }

  /**
   * Persist a mentorship application record.
   * @param {Record<string, any>} application
   * @returns {Promise<void>}
   */
  async saveApplication(application) {
    await this.init();
    if (this.mode === 'idb') {
      await this.#idbPut('applications', application);
      return;
    }

    this.#upsertLocalArray('applications', application);
  }

  /**
   * Append a structured log entry.
   * @param {Record<string, any>} entry
   * @returns {Promise<void>}
   */
  async appendLog(entry) {
    await this.init();
    if (this.mode === 'idb') {
      await this.#idbAdd('logs', entry);
      return;
    }

    this.localCache.logs.unshift(entry);
    this.localCache.logs = this.localCache.logs.slice(0, 200);
    this.#persistLocal();
  }

  /**
   * Retrieve the latest log entries.
   * @param {number} [limit=100]
   * @returns {Promise<Array<any>>}
   */
  async listLogs(limit = 100) {
    await this.init();
    if (this.mode === 'idb') {
      const logs = await this.#idbGetAll('logs');
      return logs.slice(-limit).reverse();
    }

    return this.localCache.logs.slice(0, limit).map((entry) => ({ ...entry }));
  }

  /**
   * Export the full app snapshot for backup or migration.
   * @returns {Promise<Record<string, any>>}
   */
  async exportSnapshot() {
    const [settings, library, playlists, applications] = await Promise.all([
      this.getSettings(),
      this.listLibrary(),
      this.listPlaylists(),
      this.listApplications(),
    ]);

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings,
      library,
      playlists,
      applications,
    };
  }

  /**
   * Import a previously exported snapshot.
   * @param {Record<string, any>} snapshot
   * @returns {Promise<void>}
   */
  async importSnapshot(snapshot) {
    const normalized = snapshot ?? {};
    await this.setSettings(normalized.settings ?? {});
    await this.replaceLibrary(normalized.library ?? []);
    await this.replacePlaylists(normalized.playlists ?? []);
    for (const application of normalized.applications ?? []) {
      await this.saveApplication(application);
    }
  }

  async #openIndexedDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains('library')) {
          db.createObjectStore('library', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('playlists')) {
          db.createObjectStore('playlists', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('applications')) {
          db.createObjectStore('applications', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('logs')) {
          db.createObjectStore('logs', { keyPath: 'id', autoIncrement: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async #idbTransaction(storeName, mode, handler) {
    if (!this.db) throw new Error('IndexedDB is not available');

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const result = handler(store);
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  async #idbGet(storeName, key) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  async #idbGetAll(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result ?? []);
      request.onerror = () => reject(request.error);
    });
  }

  async #idbPut(storeName, value) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(value);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async #idbAdd(storeName, value) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.add({ ...value, id: value.id ?? crypto.randomUUID() });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async #idbDelete(storeName, key) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async #idbClear(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  #hydrateLocalCache() {
    this.localCache.settings = safeJsonParse(globalThis.localStorage?.getItem(this.#localKey('settings')), {});
    this.localCache.library = safeJsonParse(globalThis.localStorage?.getItem(this.#localKey('library')), []);
    this.localCache.playlists = safeJsonParse(globalThis.localStorage?.getItem(this.#localKey('playlists')), []);
    this.localCache.applications = safeJsonParse(globalThis.localStorage?.getItem(this.#localKey('applications')), []);
    this.localCache.logs = safeJsonParse(globalThis.localStorage?.getItem(this.#localKey('logs')), []);
  }

  #persistLocal() {
    try {
      globalThis.localStorage?.setItem(this.#localKey('settings'), JSON.stringify(this.localCache.settings));
      globalThis.localStorage?.setItem(this.#localKey('library'), JSON.stringify(this.#stripNonSerializable(this.localCache.library)));
      globalThis.localStorage?.setItem(this.#localKey('playlists'), JSON.stringify(this.#stripNonSerializable(this.localCache.playlists)));
      globalThis.localStorage?.setItem(this.#localKey('applications'), JSON.stringify(this.#stripNonSerializable(this.localCache.applications)));
      globalThis.localStorage?.setItem(this.#localKey('logs'), JSON.stringify(this.#stripNonSerializable(this.localCache.logs)));
    } catch {
      // Ignore persistence failures in private browsing or low-storage contexts.
    }
  }

  #upsertLocalArray(storeName, record) {
    const list = this.localCache[storeName];
    const clean = this.#stripNonSerializable(record);
    const index = list.findIndex((item) => item.id === clean.id);
    if (index >= 0) {
      list[index] = clean;
    } else {
      list.unshift(clean);
    }
    this.#persistLocal();
  }

  #stripNonSerializable(value) {
    if (Array.isArray(value)) {
      return value.map((entry) => this.#stripNonSerializable(entry));
    }

    if (!value || typeof value !== 'object') {
      return value;
    }

    const clone = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry instanceof Blob || entry instanceof File) {
        continue;
      }
      clone[key] = this.#stripNonSerializable(entry);
    }
    return clone;
  }

  #localKey(name) {
    return `${this.namespace}.${name}`;
  }
}

