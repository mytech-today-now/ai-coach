import {
  blendModes,
  buildDemoLibrary,
  siteConfig,
  studioModes,
} from './data.js';
import {
  arrayMove,
  blobToDataUrl,
  buildPosterSvg,
  clamp,
  copyText,
  debounce,
  downloadBlob,
  formatDuration,
  readJsonFile,
  supportsDirectoryPicker,
  supportsFileSystemAccess,
  uid,
} from './utils.js';
import { KenBurnsRenderer } from './kenburns.js';

/**
 * Internal audio crossfade helper based on the Web Audio API when available.
 * The studio falls back to plain HTMLAudioElement playback if necessary.
 */
class AudioCrossfader {
  constructor(logger) {
    this.logger = logger;
    this.context = null;
    this.current = null;
    this.next = null;
    this.fallback = null;
  }

  async play(url, fadeMs = 900) {
    if (!this.#supportsWebAudio()) {
      return this.#playFallback(url, fadeMs);
    }

    if (!this.context) {
      this.context = new (globalThis.AudioContext || globalThis.webkitAudioContext)();
    }

    await this.context.resume();
    const audio = new Audio(url);
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';

    const source = this.context.createMediaElementSource(audio);
    const gain = this.context.createGain();
    gain.gain.value = 0;
    source.connect(gain).connect(this.context.destination);

    await audio.play();
    const now = this.context.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + fadeMs / 1000);

    if (this.current) {
      const previous = this.current;
      previous.gain.gain.cancelScheduledValues(now);
      previous.gain.gain.setValueAtTime(previous.gain.gain.value, now);
      previous.gain.gain.linearRampToValueAtTime(0, now + fadeMs / 1000);
      window.setTimeout(() => {
        previous.audio.pause();
        previous.source.disconnect();
        previous.gain.disconnect();
      }, fadeMs + 120);
    }

    this.current = { audio, source, gain };
    this.fallback = null;
    this.logger?.debug?.('audio_crossfade_started', { url, fadeMs });
  }

  pause() {
    if (this.current?.audio) {
      this.current.audio.pause();
    }
    if (this.fallback) {
      this.fallback.pause();
    }
  }

  stop() {
    this.pause();
    if (this.current?.source) {
      this.current.source.disconnect();
    }
    if (this.current?.gain) {
      this.current.gain.disconnect();
    }
    this.current = null;
    this.fallback = null;
  }

  #supportsWebAudio() {
    return Boolean(globalThis.AudioContext || globalThis.webkitAudioContext);
  }

  async #playFallback(url, fadeMs) {
    const audio = new Audio(url);
    audio.preload = 'auto';
    audio.volume = 0;
    await audio.play();

    if (this.fallback) {
      const previous = this.fallback;
      const started = performance.now();
      const tick = () => {
        const progress = clamp((performance.now() - started) / fadeMs, 0, 1);
        previous.volume = 1 - progress;
        audio.volume = progress;
        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          previous.pause();
        }
      };
      requestAnimationFrame(tick);
    } else {
      const started = performance.now();
      const tick = () => {
        const progress = clamp((performance.now() - started) / fadeMs, 0, 1);
        audio.volume = progress;
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }

    this.fallback = audio;
    this.current = null;
    this.logger?.debug?.('audio_fallback_play_started', { url, fadeMs });
  }
}

/**
 * @typedef {object} StudioItem
 * @property {string} id
 * @property {string} title
 * @property {string} kind
 * @property {string} sourceUrl
 * @property {string} [thumbnailUrl]
 * @property {Blob} [blob]
 * @property {string[]} [tags]
 * @property {{ id?: string, label: string, note?: string, start?: number }[]} [chapters]
 * @property {string} [description]
 * @property {number} [duration]
 * @property {boolean} [demo]
 * @property {string} [category]
 * @property {string} [mimeType]
 */

/**
 * Create a friendly fallback poster for imported media.
 * @param {File} file
 * @returns {string}
 */
function createPosterForFile(file) {
  return buildPosterSvg({
    title: file.name.replace(/\.[^.]+$/, ''),
    subtitle: file.type || 'Imported media',
    accent: '#0ea5e9',
    accent2: '#22c55e',
    badge: (file.type.split('/')[0] || 'FILE').toUpperCase(),
    seed: file.name,
  });
}

/**
 * Detect the broad media kind from a MIME type or file extension.
 * @param {File | Record<string, any>} file
 * @returns {'image' | 'video' | 'audio' | 'other'}
 */
function detectMediaKind(file) {
  const type = String(file.type || file.mimeType || '').toLowerCase();
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'audio';
  return 'other';
}

/**
 * A controller that powers the media library, playlist, slideshow, and import/export tools.
 */
export class StudioController {
  /**
   * @param {object} options
   * @param {HTMLElement} options.root
   * @param {AppStorage} options.storage
   * @param {ReturnType<import('./logger.js').createLogger>} options.logger
   * @param {(eventName: string, params?: Record<string, unknown>) => void} options.track
   * @param {boolean} [options.reducedMotion=false]
   */
  constructor({ root, storage, logger, track, reducedMotion = false }) {
    this.root = root;
    this.storage = storage;
    this.logger = logger;
    this.track = track;
    this.reducedMotion = reducedMotion;

    this.state = {
      search: '',
      playbackMode: 'sequence',
      blendMode: 'soft-light',
      crossfadeMs: 900,
      selectedId: '',
      isPlaying: false,
      activeChapterIndex: 0,
    };

    this.library = [];
    this.playlist = {
      id: 'featured',
      name: 'Featured',
      itemIds: [],
    };
    this.filteredLibrary = [];
    this.objectUrls = new Map();
    this.renderScheduled = false;
    this.saveSettings = debounce(() => this.#persistSettings(), 180);
    this.renderer = null;
    this.audio = new AudioCrossfader(logger);
    this.playTimer = 0;
    this.progressRaf = 0;
    this.stagePointers = new Map();
    this.pointerSnapshot = null;
    this.pointerGesture = null;
    this.dropTargetIndex = -1;
    this.currentViewKind = 'image';
    this.currentItem = null;
  }

  /**
   * Initialize the studio workspace.
   */
  async init() {
    this.#collectDom();
    this.#setupRenderer();
    this.#setupBlendLayer();
    await this.#loadInitialState();
    this.#wireEvents();
    this.#renderModeButtons();
    this.#renderAll();
    this.#startObservers();
    this.track('studio_loaded', {
      items: this.library.length,
      playbackMode: this.state.playbackMode,
    });
  }

  destroy() {
    this.renderer?.destroy();
    this.audio.stop();
    if (this.playTimer) window.clearTimeout(this.playTimer);
    if (this.progressRaf) cancelAnimationFrame(this.progressRaf);
    for (const url of this.objectUrls.values()) {
      URL.revokeObjectURL(url);
    }
    this.objectUrls.clear();
  }

  /**
   * Add files to the library using either IndexedDB blobs or data URLs.
   * @param {FileList | File[]} files
   */
  async importFiles(files) {
    const list = Array.from(files || []);
    if (!list.length) return;

    const added = [];

    for (const file of list) {
      const kind = detectMediaKind(file);
      if (kind === 'other') {
        if (file.name.toLowerCase().endsWith('.json')) {
          await this.importSnapshotFile(file);
          continue;
        }
        continue;
      }

      const id = uid('media');
      const baseTitle = file.name.replace(/\.[^.]+$/, '') || 'Imported media';
      const poster = kind === 'image' ? null : createPosterForFile(file);
      const chapterLabel = kind === 'video' ? 'Playback' : kind === 'audio' ? 'Audio' : 'Preview';
      const common = {
        id,
        title: baseTitle,
        kind,
        mimeType: file.type,
        category: 'Imported',
        description: `Imported ${kind} from ${file.name}`,
        tags: [kind, file.type.split('/')[0] || 'file'],
        chapters: [{ id: `${id}_chapter`, label: chapterLabel, note: 'Imported media item', start: 0 }],
        duration: kind === 'image' ? 8 : 30,
        createdAt: new Date().toISOString(),
      };

      let record;
      if (this.storage.mode === 'local') {
        const sourceUrl = await blobToDataUrl(file);
        record = {
          ...common,
          sourceUrl,
          thumbnailUrl: kind === 'image' ? sourceUrl : poster,
          demo: false,
        };
      } else {
        record = {
          ...common,
          blob: file,
          thumbnailUrl: kind === 'image' ? undefined : poster,
          demo: false,
        };
      }

      await this.storage.saveLibraryItem(record);
      const hydrated = await this.#hydrateRecord(record);
      this.library.unshift(hydrated);
      added.push(hydrated);
    }

    if (added.length) {
      const existing = new Set(this.playlist.itemIds);
      for (const item of added) {
        if (!existing.has(item.id)) {
          this.playlist.itemIds.unshift(item.id);
          existing.add(item.id);
        }
      }
      await this.storage.savePlaylist(this.playlist);
      await this.selectItem(added[0].id, { play: false });
      this.#persistSettings();
      this.#renderAll();
      this.track('media_import', { count: added.length });
      this.#announce(`${added.length} media item${added.length === 1 ? '' : 's'} imported`);
    }
  }

  /**
   * Export a portable JSON snapshot of the current library state.
   */
  async exportSnapshot() {
    const library = await Promise.all(this.library.map((item) => this.#serializeItem(item)));
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: {
        ...this.state,
      },
      library,
      playlists: [this.playlist],
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const filename = `ai-coach-studio-${new Date().toISOString().slice(0, 10)}.json`;
    downloadBlob(blob, filename);
    this.track('snapshot_exported', { items: library.length });
    this.#announce('Snapshot exported');
  }

  /**
   * Import a JSON snapshot file.
   * @param {File} file
   */
  async importSnapshotFile(file) {
    const payload = await readJsonFile(file);
    await this.importSnapshot(payload);
  }

  /**
   * Import a snapshot object.
   * @param {Record<string, any>} snapshot
   */
  async importSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') {
      this.#announce('That file did not look like a valid snapshot');
      return;
    }

    if (snapshot.settings) {
      this.state = {
        ...this.state,
        ...snapshot.settings,
      };
    }

    if (Array.isArray(snapshot.library)) {
      await this.storage.replaceLibrary(snapshot.library);
    }

    if (Array.isArray(snapshot.playlists) && snapshot.playlists.length) {
      this.playlist = {
        id: snapshot.playlists[0].id || 'featured',
        name: snapshot.playlists[0].name || 'Featured',
        itemIds: Array.isArray(snapshot.playlists[0].itemIds) ? snapshot.playlists[0].itemIds.slice() : [],
      };
      await this.storage.replacePlaylists([this.playlist]);
    }

    await this.#reloadFromStorage();
    this.#renderAll();
    this.#announce('Snapshot imported');
    this.track('snapshot_imported', { items: this.library.length });
  }

  async seedDemoLibrary() {
    const demo = buildDemoLibrary();
    await this.storage.replaceLibrary(demo);
    this.playlist = {
      id: 'featured',
      name: 'Featured',
      itemIds: demo.map((item) => item.id),
    };
    await this.storage.replacePlaylists([this.playlist]);
    await this.#reloadFromStorage();
    this.state.selectedId = this.library[0]?.id ?? '';
    this.state.isPlaying = false;
    this.#persistSettings();
    this.#renderAll();
    this.#announce('Demo library loaded');
    this.track('demo_library_loaded', { items: this.library.length });
  }

  async clearLibrary() {
    if (!globalThis.confirm('Clear the media library and playlist?')) {
      return;
    }
    await this.storage.replaceLibrary([]);
    this.playlist = { id: 'featured', name: 'Featured', itemIds: [] };
    await this.storage.replacePlaylists([this.playlist]);
    await this.#reloadFromStorage();
    this.state.selectedId = '';
    this.state.isPlaying = false;
    this.#persistSettings();
    this.#renderAll();
    this.#announce('Library cleared');
    this.track('library_cleared', {});
  }

  /**
   * Select a media item by id.
   * @param {string} id
   * @param {{ play?: boolean }} [options]
   */
  async selectItem(id, options = {}) {
    const item = this.library.find((entry) => entry.id === id) || null;
    if (!item) return;

    this.state.selectedId = item.id;
    this.state.activeChapterIndex = 0;
    this.currentViewKind = item.kind;
    this.#persistSettings();
    this.#renderViewer(item);
    this.#syncLibrarySelection();
    this.#announce(`Selected ${item.title}`);
    this.track('library_item_selected', { id: item.id, kind: item.kind });

    if (options.play) {
      this.playCurrent();
    } else {
      if (this.state.isPlaying) {
        this.pausePlayback();
      }
    }
  }

  /**
   * Start or pause playback.
   */
  togglePlayback() {
    if (this.state.isPlaying) {
      this.pausePlayback();
    } else {
      this.playCurrent();
    }
  }

  pausePlayback() {
    this.state.isPlaying = false;
    this.audio.stop();
    this.video.pause();
    this.audioEl.pause();
    this.renderer?.pause();
    if (this.playTimer) window.clearTimeout(this.playTimer);
    if (this.progressRaf) cancelAnimationFrame(this.progressRaf);
    this.playTimer = 0;
    this.progressRaf = 0;
    this.#updatePlayButton();
    this.#renderProgress('Paused');
    this.track('playback_paused', { id: this.state.selectedId });
  }

  playCurrent() {
    const item = this.currentItem || this.library.find((entry) => entry.id === this.state.selectedId) || this.library[0];
    if (!item) {
      this.#announce('No media selected');
      return;
    }

    this.currentItem = item;
    this.state.selectedId = item.id;
    this.state.isPlaying = true;
    this.#syncLibrarySelection();
    this.#updatePlayButton();
    this.track('playback_started', { id: item.id, kind: item.kind, mode: this.state.playbackMode });

    if (item.kind === 'audio') {
      void this.#playAudio(item);
      this.#renderProgress(`Playing audio • ${item.title}`);
      this.#scheduleAdvance(item.duration || 180);
      return;
    }

    if (item.kind === 'video') {
      void this.#playVideo(item);
      this.#renderProgress(`Playing video • ${item.title}`);
      this.#scheduleAdvance(item.duration || 45);
      return;
    }

    void this.#showImage(item);
    this.#scheduleAdvance(item.duration || 8);
  }

  nextItem() {
    this.#advance(1);
  }

  prevItem() {
    this.#advance(-1);
  }

  setPlaybackMode(mode) {
    if (!studioModes.some((entry) => entry.id === mode)) return;
    this.state.playbackMode = mode;
    this.#persistSettings();
    this.#renderModeButtons();
    this.track('playback_mode_change', { mode });
    this.#announce(`Playback mode set to ${mode}`);
  }

  setBlendMode(mode) {
    if (!blendModes.some((entry) => entry.id === mode)) return;
    this.state.blendMode = mode;
    this.stage.style.setProperty('--studio-blend-mode', mode);
    this.#persistSettings();
    this.track('blend_mode_change', { mode });
  }

  setCrossfadeMs(value) {
    this.state.crossfadeMs = clamp(Number(value) || 900, 250, 2500);
    this.#persistSettings();
    this.track('crossfade_change', { value: this.state.crossfadeMs });
  }

  setSearch(value) {
    this.state.search = value;
    this.#persistSettings();
    this.#renderLibrary();
    this.track('library_search', { queryLength: value.length });
  }

  /**
   * Add an item to the playlist queue.
   * @param {string} id
   */
  async addToPlaylist(id) {
    if (!this.library.some((item) => item.id === id)) return;
    if (this.playlist.itemIds.includes(id)) {
      this.#announce('Item is already in the playlist');
      return;
    }
    this.playlist.itemIds.push(id);
    await this.storage.savePlaylist(this.playlist);
    this.#renderPlaylist();
    this.#announce('Added to playlist');
    this.track('playlist_item_added', { id });
  }

  /**
   * Remove an item from the playlist queue.
   * @param {string} id
   */
  async removeFromPlaylist(id) {
    this.playlist.itemIds = this.playlist.itemIds.filter((entry) => entry !== id);
    await this.storage.savePlaylist(this.playlist);
    this.#renderPlaylist();
    this.#announce('Removed from playlist');
    this.track('playlist_item_removed', { id });
  }

  /**
   * Reorder the playlist queue.
   * @param {number} from
   * @param {number} to
   */
  async movePlaylistItem(from, to) {
    this.playlist.itemIds = arrayMove(this.playlist.itemIds, from, to);
    await this.storage.savePlaylist(this.playlist);
    this.#renderPlaylist();
    this.track('playlist_reordered', { from, to });
  }

  /**
   * Replace the playlist with a new ordering.
   * @param {string[]} ids
   */
  async setPlaylist(ids) {
    this.playlist.itemIds = ids.filter((id) => this.library.some((item) => item.id === id));
    await this.storage.savePlaylist(this.playlist);
    this.#renderPlaylist();
    this.#persistSettings();
  }

  /**
   * Show the current item on the slide renderer.
   * @param {StudioItem} item
   */
  async #showImage(item) {
    this.canvas.hidden = false;
    this.video.hidden = true;
    this.audioEl.hidden = true;
    this.video.pause();
    this.audioEl.pause();
    this.audio.stop();
    this.renderer?.setManualMotion({ zoom: 1, panX: 0, panY: 0 });
    this.renderer?.resize(this.stage.clientWidth, this.stage.clientHeight);
    const previousItem = this.previousItem;
    if (previousItem?.id && previousItem.id !== item.id) {
      await this.renderer.transitionTo(item, this.state.crossfadeMs);
    } else {
      await this.renderer.setSlide(item);
    }
    this.#renderProgress(`Previewing ${item.title}`);
  }

  async #playVideo(item) {
    this.canvas.hidden = true;
    this.audioEl.hidden = true;
    this.video.hidden = false;
    if (this.video.src !== item.sourceUrl) {
      this.video.src = item.sourceUrl;
    }
    this.audio.stop();
    await this.video.play();
    this.renderer?.pause();
    this.#renderProgress(`Video ready • ${item.title}`);
  }

  async #playAudio(item) {
    this.canvas.hidden = true;
    this.video.hidden = true;
    this.audioEl.hidden = false;
    this.audioEl.src = item.sourceUrl;
    this.video.pause();
    await this.audio.play(item.sourceUrl, this.state.crossfadeMs);
    this.renderer?.pause();
    this.#renderProgress(`Audio ready • ${item.title}`);
  }

  async #advance(direction) {
    const queue = this.#getPlaybackQueue();
    if (!queue.length) return;
    const index = Math.max(0, queue.findIndex((item) => item.id === this.state.selectedId));

    if (this.state.playbackMode === 'shuffle') {
      const next = queue[Math.floor(Math.random() * queue.length)];
      if (next) {
        await this.selectItem(next.id, { play: this.state.isPlaying });
      }
      return;
    }

    if (this.state.playbackMode === 'story' && this.currentItem?.chapters?.length) {
      const nextChapter = this.state.activeChapterIndex + direction;
      if (nextChapter >= 0 && nextChapter < this.currentItem.chapters.length) {
        this.state.activeChapterIndex = nextChapter;
        this.#highlightChapters();
        this.#renderProgress(`Chapter ${nextChapter + 1} of ${this.currentItem.chapters.length}`);
        this.track('chapter_change', {
          id: this.currentItem.id,
          chapter: nextChapter,
        });
        return;
      }
    }

    let nextIndex = index + direction;
    if (this.state.playbackMode === 'loop') {
      nextIndex = (queue.length + nextIndex) % queue.length;
    } else if (nextIndex < 0 || nextIndex >= queue.length) {
      this.pausePlayback();
      this.#renderProgress('Playlist completed');
      return;
    }

    const next = queue[nextIndex] ?? queue[0];
    if (!next) return;
    await this.selectItem(next.id, { play: this.state.isPlaying });
  }

  #scheduleAdvance(durationSeconds) {
    if (this.playTimer) window.clearTimeout(this.playTimer);
    if (this.progressRaf) cancelAnimationFrame(this.progressRaf);
    const start = performance.now();
    const duration = Math.max(1, durationSeconds) * 1000;

    const tick = (now) => {
      if (!this.state.isPlaying) return;
      const elapsed = now - start;
      const progress = clamp(elapsed / duration, 0, 1);
      const remaining = Math.max(0, duration - elapsed);
      this.#renderProgress(
        `${this.currentItem?.title ?? 'Playback'} • ${Math.round(progress * 100)}% • ${formatDuration(remaining / 1000)} left`,
      );

      if (progress < 1) {
        this.progressRaf = requestAnimationFrame(tick);
      }
    };

    this.progressRaf = requestAnimationFrame(tick);
    this.playTimer = window.setTimeout(() => {
      if (!this.state.isPlaying) return;
      void this.#advance(1);
    }, duration);
  }

  async #loadInitialState() {
    await this.#reloadFromStorage();

    const settings = await this.storage.getSettings();
    this.state = {
      ...this.state,
      search: String(settings.studioSearch ?? this.state.search ?? ''),
      playbackMode: String(settings.playbackMode ?? this.state.playbackMode),
      blendMode: String(settings.blendMode ?? this.state.blendMode),
      crossfadeMs: Number(settings.crossfadeMs ?? this.state.crossfadeMs),
      selectedId: String(settings.selectedId ?? this.state.selectedId ?? ''),
    };

    this.stage.style.setProperty('--studio-blend-mode', this.state.blendMode);

    if (!this.state.selectedId) {
      this.state.selectedId = this.library[0]?.id ?? '';
    }
    if (!this.playlist.itemIds.length) {
      this.playlist.itemIds = this.library.map((item) => item.id);
      await this.storage.savePlaylist(this.playlist);
    }

    await this.selectItem(this.state.selectedId || this.library[0]?.id || '', { play: false });
    this.searchInput.value = this.state.search;
    this.blendSelect.value = this.state.blendMode;
    this.crossfadeRange.value = String(this.state.crossfadeMs);
  }

  async #reloadFromStorage() {
    const storedLibrary = await this.storage.listLibrary();
    const storedPlaylists = await this.storage.listPlaylists();

    if (!storedLibrary.length) {
      const demo = buildDemoLibrary();
      await this.storage.replaceLibrary(demo);
      this.playlist = {
        id: 'featured',
        name: 'Featured',
        itemIds: demo.map((item) => item.id),
      };
      await this.storage.replacePlaylists([this.playlist]);
    } else {
      if (storedPlaylists.length) {
        const playlist = storedPlaylists[0];
        this.playlist = {
          id: playlist.id || 'featured',
          name: playlist.name || 'Featured',
          itemIds: Array.isArray(playlist.itemIds) ? playlist.itemIds.slice() : [],
        };
      } else {
        this.playlist = {
          id: 'featured',
          name: 'Featured',
          itemIds: storedLibrary.map((item) => item.id),
        };
        await this.storage.savePlaylist(this.playlist);
      }
    }

    const refreshedLibrary = await this.storage.listLibrary();
    this.library = [];
    for (const record of refreshedLibrary) {
      this.library.push(await this.#hydrateRecord(record));
    }

    // Remove stale playlist entries when items disappear.
    const ids = new Set(this.library.map((item) => item.id));
    this.playlist.itemIds = this.playlist.itemIds.filter((id) => ids.has(id));

    this.filteredLibrary = this.library.slice();
  }

  async #hydrateRecord(record) {
    const clone = { ...record };
    if (clone.blob instanceof Blob) {
      const objectUrl = URL.createObjectURL(clone.blob);
      this.objectUrls.set(clone.id, objectUrl);
      clone.sourceUrl = objectUrl;
      if (!clone.thumbnailUrl) {
        clone.thumbnailUrl = objectUrl;
      }
    }

    if (!clone.sourceUrl && clone.dataUrl) {
      clone.sourceUrl = clone.dataUrl;
    }

    if (!clone.thumbnailUrl) {
      clone.thumbnailUrl = clone.sourceUrl;
    }

    if (!clone.kind) {
      clone.kind = detectMediaKind(clone);
    }

    if (!clone.duration) {
      clone.duration = clone.kind === 'image' ? 8 : clone.kind === 'audio' ? 180 : 30;
    }

    clone.tags = Array.isArray(clone.tags) ? clone.tags : [];
    clone.chapters = Array.isArray(clone.chapters) ? clone.chapters : [];

    return /** @type {StudioItem} */ (clone);
  }

  async #serializeItem(item) {
    const record = { ...item };
    if (record.blob instanceof Blob) {
      record.sourceUrl = await blobToDataUrl(record.blob);
    } else if (record.sourceUrl?.startsWith('blob:')) {
      const response = await fetch(record.sourceUrl);
      record.sourceUrl = await blobToDataUrl(await response.blob());
    }

    delete record.blob;
    delete record.objectUrl;
    return record;
  }

  #collectDom() {
    this.searchInput = /** @type {HTMLInputElement} */ (this.root.querySelector('#studio-search'));
    this.importFilesButton = /** @type {HTMLButtonElement} */ (this.root.querySelector('#import-files-button'));
    this.importSnapshotButton = /** @type {HTMLButtonElement} */ (this.root.querySelector('#import-snapshot-button'));
    this.exportSnapshotButton = /** @type {HTMLButtonElement} */ (this.root.querySelector('#export-snapshot-button'));
    this.seedDemoButton = /** @type {HTMLButtonElement} */ (this.root.querySelector('#seed-demo-button'));
    this.clearLibraryButton = /** @type {HTMLButtonElement} */ (this.root.querySelector('#clear-library-button'));
    this.playbackModes = /** @type {HTMLElement} */ (this.root.querySelector('#playback-modes'));
    this.blendSelect = /** @type {HTMLSelectElement} */ (this.root.querySelector('#blend-select'));
    this.crossfadeRange = /** @type {HTMLInputElement} */ (this.root.querySelector('#crossfade-range'));
    this.stage = /** @type {HTMLElement} */ (this.root.querySelector('#viewer-stage'));
    this.canvas = /** @type {HTMLCanvasElement} */ (this.root.querySelector('#viewer-canvas'));
    this.video = /** @type {HTMLVideoElement} */ (this.root.querySelector('#viewer-video'));
    this.audioEl = /** @type {HTMLAudioElement} */ (this.root.querySelector('#viewer-audio'));
    this.viewerTitle = /** @type {HTMLElement} */ (this.root.querySelector('#viewer-title'));
    this.viewerDescription = /** @type {HTMLElement} */ (this.root.querySelector('#viewer-description'));
    this.viewerTags = /** @type {HTMLElement} */ (this.root.querySelector('#viewer-tags'));
    this.chapterStrip = /** @type {HTMLElement} */ (this.root.querySelector('#chapter-strip'));
    this.viewerProgress = /** @type {HTMLOutputElement} */ (this.root.querySelector('#viewer-progress'));
    this.viewerPrev = /** @type {HTMLButtonElement} */ (this.root.querySelector('#viewer-prev'));
    this.viewerPlay = /** @type {HTMLButtonElement} */ (this.root.querySelector('#viewer-play'));
    this.viewerNext = /** @type {HTMLButtonElement} */ (this.root.querySelector('#viewer-next'));
    this.viewerAdd = /** @type {HTMLButtonElement} */ (this.root.querySelector('#viewer-add'));
    this.libraryViewport = /** @type {HTMLElement} */ (this.root.querySelector('#library-viewport'));
    this.libraryStats = /** @type {HTMLElement} */ (this.root.querySelector('#library-stats'));
    this.dropzone = /** @type {HTMLElement} */ (this.root.querySelector('#library-dropzone'));
    this.playlistList = /** @type {HTMLElement} */ (this.root.querySelector('#playlist-list'));
    this.playlistStats = /** @type {HTMLElement} */ (this.root.querySelector('#playlist-stats'));

    this.libraryStage = document.createElement('div');
    this.libraryStage.className = 'library-grid-stage';
    this.libraryViewport.append(this.libraryStage);
    this.renderer = new KenBurnsRenderer(this.canvas, {
      logger: this.logger,
      reducedMotion: this.reducedMotion,
    });
  }

  #setupRenderer() {
    this.renderer?.resize(this.stage.clientWidth, this.stage.clientHeight);
    new ResizeObserver(() => {
      this.renderer?.resize(this.stage.clientWidth, this.stage.clientHeight);
      this.#renderLibrary();
    }).observe(this.stage);

    new ResizeObserver(() => {
      this.#renderLibrary();
    }).observe(this.libraryViewport);
  }

  #setupBlendLayer() {
    this.blendLayer = document.createElement('div');
    this.blendLayer.className = 'viewer-blend-layer';
    this.blendLayer.setAttribute('aria-hidden', 'true');
    this.stage.append(this.blendLayer);
  }

  #wireEvents() {
    this.searchInput.addEventListener('input', () => this.setSearch(this.searchInput.value));
    this.blendSelect.addEventListener('change', () => this.setBlendMode(this.blendSelect.value));
    this.crossfadeRange.addEventListener('input', () => this.setCrossfadeMs(this.crossfadeRange.value));

    this.importFilesButton.addEventListener('click', () => void this.#importFilesFlow());
    this.importSnapshotButton.addEventListener('click', () => void this.#importSnapshotFlow());
    this.exportSnapshotButton.addEventListener('click', () => void this.exportSnapshot());
    this.seedDemoButton.addEventListener('click', () => void this.seedDemoLibrary());
    this.clearLibraryButton.addEventListener('click', () => void this.clearLibrary());

    this.viewerPrev.addEventListener('click', () => this.prevItem());
    this.viewerPlay.addEventListener('click', () => this.togglePlayback());
    this.viewerNext.addEventListener('click', () => this.nextItem());
    this.viewerAdd.addEventListener('click', () => {
      if (this.state.selectedId) void this.addToPlaylist(this.state.selectedId);
    });

    this.dropzone.addEventListener('click', () => void this.#importFilesFlow());
    this.dropzone.addEventListener('dragover', (event) => {
      event.preventDefault();
      this.dropzone.classList.add('is-dragover');
    });
    this.dropzone.addEventListener('dragleave', () => this.dropzone.classList.remove('is-dragover'));
    this.dropzone.addEventListener('drop', (event) => {
      event.preventDefault();
      this.dropzone.classList.remove('is-dragover');
      const files = event.dataTransfer?.files;
      if (files?.length) void this.importFiles(files);
    });

    this.libraryViewport.addEventListener('scroll', () => this.#scheduleLibraryRender(), { passive: true });
    this.libraryViewport.addEventListener('keydown', (event) => this.#onLibraryKeyDown(event));
    this.playlistList.addEventListener('dragover', (event) => {
      event.preventDefault();
    });
    this.playlistList.addEventListener('drop', (event) => this.#onPlaylistDrop(event));

    this.stage.addEventListener('pointerdown', (event) => this.#onStagePointerDown(event));
    this.stage.addEventListener('pointermove', (event) => this.#onStagePointerMove(event));
    this.stage.addEventListener('pointerup', (event) => this.#onStagePointerUp(event));
    this.stage.addEventListener('pointercancel', (event) => this.#onStagePointerUp(event));

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pausePlayback();
      }
    });

    this.libraryViewport.addEventListener('dragstart', (event) => {
      const target = /** @type {HTMLElement | null} */ (event.target instanceof HTMLElement ? event.target.closest('[data-item-id]') : null);
      if (!target) return;
      const id = target.dataset.itemId;
      if (!id) return;
      event.dataTransfer?.setData('text/plain', id);
      event.dataTransfer?.setData('application/x-ai-coach-item', id);
    });

    this.playbackModes.addEventListener('click', (event) => {
      const button = /** @type {HTMLButtonElement | null} */ (event.target instanceof HTMLElement ? event.target.closest('button[data-mode]') : null);
      if (!button) return;
      this.setPlaybackMode(button.dataset.mode || 'sequence');
    });

    this.libraryViewport.addEventListener('click', (event) => {
      const control = /** @type {HTMLElement | null} */ (event.target instanceof HTMLElement ? event.target.closest('[data-action]') : null);
      const card = /** @type {HTMLElement | null} */ (event.target instanceof HTMLElement ? event.target.closest('[data-item-id]') : null);
      const id = card?.dataset.itemId;
      if (!id) return;

      if (control) {
        const action = control.dataset.action;
        if (action === 'play') {
          void this.selectItem(id, { play: true });
        } else if (action === 'add') {
          void this.addToPlaylist(id);
        } else if (action === 'remove') {
          void this.removeLibraryItem(id);
        }
        return;
      }

      void this.selectItem(id, { play: false });
    });

    this.libraryViewport.addEventListener('dragstart', (event) => {
      const card = /** @type {HTMLElement | null} */ (event.target instanceof HTMLElement ? event.target.closest('[data-item-id]') : null);
      if (!card) return;
      const id = card.dataset.itemId;
      if (!id) return;
      event.dataTransfer?.setData('text/plain', id);
      event.dataTransfer?.setData('application/x-ai-coach-item', id);
    });

    this.libraryViewport.addEventListener('dragover', (event) => {
      event.preventDefault();
    });

    this.libraryViewport.addEventListener('drop', (event) => {
      event.preventDefault();
    });

    this.stage.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        this.prevItem();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        this.nextItem();
      } else if (event.key === ' ') {
        event.preventDefault();
        this.togglePlayback();
      }
    });

    this.libraryViewport.addEventListener('pointerdown', (event) => {
      const card = /** @type {HTMLElement | null} */ (event.target instanceof HTMLElement ? event.target.closest('[data-item-id]') : null);
      if (!card) return;
      const id = card.dataset.itemId;
      if (!id || !event.pointerType) return;
      const timer = window.setTimeout(() => {
        if (navigator.vibrate) navigator.vibrate(18);
        void this.addToPlaylist(id);
        this.#announce('Long press: added to playlist');
      }, 450);

      const cancel = () => {
        clearTimeout(timer);
        card.removeEventListener('pointerup', cancel);
        card.removeEventListener('pointerleave', cancel);
        card.removeEventListener('pointercancel', cancel);
      };
      card.addEventListener('pointerup', cancel, { once: true });
      card.addEventListener('pointerleave', cancel, { once: true });
      card.addEventListener('pointercancel', cancel, { once: true });
    });

    this.root.addEventListener('keydown', (event) => this.#onGlobalKeyDown(event));
  }

  #startObservers() {
    this.renderLibraryDebounced = debounce(() => this.#renderLibrary(), 16);
  }

  #renderModeButtons() {
    this.playbackModes.replaceChildren();
    for (const mode of studioModes) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.mode = mode.id;
      button.className = mode.id === this.state.playbackMode ? 'is-active' : '';
      button.textContent = mode.label;
      button.setAttribute('role', 'tab');
      this.playbackModes.append(button);
    }
  }

  #renderAll() {
    this.#renderModeButtons();
    this.#renderLibrary();
    this.#renderPlaylist();
    this.#renderViewer(this.currentItem || this.library.find((item) => item.id === this.state.selectedId) || null);
    this.#renderStats();
    this.#syncLibrarySelection();
    this.#updatePlayButton();
  }

  #renderStats() {
    this.libraryStats.textContent = `${this.filteredLibrary.length} shown / ${this.library.length} total`;
    this.playlistStats.textContent = `${this.playlist.itemIds.length} queued • ${this.state.playbackMode}`;
  }

  #renderLibrary() {
    if (!this.libraryStage) return;

    this.filteredLibrary = this.library.filter((item) => this.#matchesSearch(item, this.state.search));
    const viewport = this.libraryViewport;
    const width = Math.max(320, viewport.clientWidth - 2);
    const gap = 14;
    const minCardWidth = 240;
    const columns = Math.max(1, Math.floor((width + gap) / (minCardWidth + gap)));
    const cellWidth = Math.floor((width - gap * (columns - 1)) / columns);
    const rowHeight = Math.max(280, Math.round(cellWidth * 0.86 + 130));
    const totalRows = Math.max(1, Math.ceil(this.filteredLibrary.length / columns));
    const totalHeight = totalRows * rowHeight;
    const scrollTop = viewport.scrollTop;
    const visibleRows = Math.ceil(viewport.clientHeight / rowHeight) + 2;
    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - 1);
    const endRow = Math.min(totalRows, startRow + visibleRows);
    const startIndex = startRow * columns;
    const endIndex = Math.min(this.filteredLibrary.length, endRow * columns);

    this.libraryStage.style.blockSize = `${totalHeight}px`;
    this.libraryStage.replaceChildren();

    if (!this.filteredLibrary.length) {
      const empty = document.createElement('article');
      empty.className = 'card';
      empty.style.position = 'absolute';
      empty.style.inset = '1rem';
      empty.innerHTML = `
        <p class="eyebrow">No results</p>
        <h4>No media matches your filter</h4>
        <p class="muted">Try another search term or reload the demo set.</p>
      `;
      this.libraryStage.append(empty);
      this.#renderStats();
      return;
    }

    for (let index = startIndex; index < endIndex; index += 1) {
      const item = this.filteredLibrary[index];
      if (!item) continue;
      const row = Math.floor(index / columns);
      const column = index % columns;
      const left = column * (cellWidth + gap);
      const top = row * rowHeight;
      const card = this.#createLibraryCard(item, { left, top, width: cellWidth, height: rowHeight - 14 });
      this.libraryStage.append(card);
    }

    this.#renderStats();
  }

  #createLibraryCard(item, bounds) {
    const card = document.createElement('article');
    card.className = 'library-card';
    card.dataset.itemId = item.id;
    card.dataset.kind = item.kind;
    card.setAttribute('role', 'option');
    card.setAttribute('tabindex', '0');
    card.draggable = true;
    card.style.inlineSize = `${bounds.width}px`;
    card.style.blockSize = `${bounds.height}px`;
    card.style.insetInlineStart = `${bounds.left}px`;
    card.style.insetBlockStart = `${bounds.top}px`;
    card.innerHTML = `
      <div class="library-thumb">
        <img src="${item.thumbnailUrl || item.sourceUrl}" alt="" loading="lazy" decoding="async" />
      </div>
      <div class="flow" style="gap:0.35rem">
        <h4>${item.title}</h4>
        <p class="muted">${item.category || item.kind} • ${item.description || 'Imported media'}</p>
      </div>
      <div class="library-meta">
        <span class="chip">${item.kind}</span>
        <span class="chip">${formatDuration(item.duration || 0)}</span>
      </div>
      <div class="library-actions">
        <button type="button" data-action="play">Play</button>
        <button type="button" data-action="add">Add</button>
        ${item.demo ? '' : '<button type="button" data-action="remove">Remove</button>'}
      </div>
    `;

    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        void this.selectItem(item.id, { play: false });
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        const nextIndex = clamp(this.filteredLibrary.findIndex((entry) => entry.id === item.id) + direction, 0, this.filteredLibrary.length - 1);
        const nextItem = this.filteredLibrary[nextIndex];
        if (nextItem) {
          void this.selectItem(nextItem.id, { play: false });
          this.#scrollSelectedCardIntoView(nextItem.id);
        }
      }
    });

    card.addEventListener('dragstart', (event) => {
      event.dataTransfer?.setData('text/plain', item.id);
      event.dataTransfer?.setData('application/x-ai-coach-item', item.id);
      card.classList.add('is-dragging');
    });
    card.addEventListener('dragend', () => card.classList.remove('is-dragging'));
    return card;
  }

  #renderPlaylist() {
    this.playlistList.replaceChildren();
    const items = this.playlist.itemIds
      .map((id) => this.library.find((item) => item.id === id))
      .filter(Boolean);

    if (!items.length) {
      const empty = document.createElement('article');
      empty.className = 'card';
      empty.innerHTML = `
        <p class="eyebrow">Empty playlist</p>
        <p class="muted">Add items from the library or drop cards here to build a queue.</p>
      `;
      this.playlistList.append(empty);
      this.#renderStats();
      return;
    }

    items.forEach((item, index) => {
      const row = document.createElement('article');
      row.className = 'playlist-item';
      row.dataset.itemId = item.id;
      row.dataset.index = String(index);
      row.draggable = true;
      row.innerHTML = `
        <div class="playlist-handle" aria-hidden="true"></div>
        <div class="playlist-thumb">
          <img src="${item.thumbnailUrl || item.sourceUrl}" alt="" loading="lazy" decoding="async" />
        </div>
        <div class="playlist-copy">
          <strong>${item.title}</strong>
          <span>${item.category || item.kind} • ${formatDuration(item.duration || 0)}</span>
        </div>
        <div class="playlist-actions">
          <button type="button" data-action="play">Play</button>
          <button type="button" data-action="remove">Remove</button>
        </div>
      `;

      row.addEventListener('dragstart', (event) => {
        event.dataTransfer?.setData('text/plain', item.id);
        event.dataTransfer?.setData('application/x-ai-coach-item', item.id);
        row.classList.add('is-dragging');
      });
      row.addEventListener('dragend', () => row.classList.remove('is-dragging'));
      row.addEventListener('dragover', (event) => event.preventDefault());
      row.addEventListener('drop', (event) => {
        event.preventDefault();
        const sourceId = event.dataTransfer?.getData('text/plain');
        if (!sourceId) return;
        const from = this.playlist.itemIds.indexOf(sourceId);
        const to = index;
        if (from >= 0) {
          void this.movePlaylistItem(from, to);
        } else {
          void this.addToPlaylist(sourceId);
        }
      });
      row.addEventListener('click', (event) => {
        const action = /** @type {HTMLElement | null} */ (event.target instanceof HTMLElement ? event.target.closest('[data-action]') : null);
        if (!action) return;
        if (action.dataset.action === 'play') {
          void this.selectItem(item.id, { play: true });
        } else if (action.dataset.action === 'remove') {
          void this.removeFromPlaylist(item.id);
        }
      });
      this.playlistList.append(row);
    });

    this.#renderStats();
  }

  #renderViewer(item) {
    const previousItem = this.currentItem;
    this.previousItem = previousItem;
    this.currentItem = item;

    if (!item) {
      this.viewerTitle.textContent = 'No item selected';
      this.viewerDescription.textContent = 'Choose a media item from the library to preview it here.';
      this.viewerTags.replaceChildren();
      this.chapterStrip.replaceChildren();
      this.canvas.hidden = false;
      this.video.hidden = true;
      this.audioEl.hidden = true;
      this.viewerProgress.value = '';
      this.viewerProgress.textContent = 'Idle';
      this.renderer?.pause();
      return;
    }

    this.viewerTitle.textContent = item.title;
    this.viewerDescription.textContent = item.description || `${item.category || item.kind} asset`;
    this.viewerTags.replaceChildren();

    const tags = [item.category || item.kind, ...(item.tags || []).slice(0, 3)];
    for (const tag of tags) {
      const span = document.createElement('span');
      span.className = 'chip';
      span.textContent = tag;
      this.viewerTags.append(span);
    }

    this.#renderChapters(item);
    this.stage.style.setProperty('--studio-blend-mode', this.state.blendMode);
    if (item.kind !== 'audio') {
      this.audio.stop();
    }
    if (item.kind !== 'video') {
      this.video.pause();
    }

    if (item.kind === 'image') {
      this.canvas.hidden = false;
      this.video.hidden = true;
      this.audioEl.hidden = true;
      this.renderer?.resize(this.stage.clientWidth, this.stage.clientHeight);
      if (previousItem?.id && previousItem.id !== item.id) {
        void this.renderer?.transitionTo(item, this.state.crossfadeMs);
      } else {
        void this.renderer?.setSlide(item);
      }
    } else if (item.kind === 'video') {
      this.canvas.hidden = true;
      this.video.hidden = false;
      this.audioEl.hidden = true;
      this.renderer?.pause();
      this.video.src = item.sourceUrl;
    } else if (item.kind === 'audio') {
      this.canvas.hidden = true;
      this.video.hidden = true;
      this.audioEl.hidden = false;
      this.renderer?.pause();
      this.audioEl.src = item.sourceUrl;
    } else {
      this.canvas.hidden = false;
      this.video.hidden = true;
      this.audioEl.hidden = true;
      this.renderer?.pause();
      void this.renderer?.setSlide(item);
    }

    this.#renderProgress(`Ready • ${item.title}`);
    this.#updatePlayButton();
    this.#highlightChapters();
  }

  #renderChapters(item) {
    this.chapterStrip.replaceChildren();
    const chapters = Array.isArray(item?.chapters) ? item.chapters : [];

    if (!chapters.length) {
      const empty = document.createElement('span');
      empty.className = 'muted';
      empty.textContent = 'No chapter markers';
      this.chapterStrip.append(empty);
      return;
    }

    chapters.forEach((chapter, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.chapterIndex = String(index);
      button.textContent = chapter.label || `Chapter ${index + 1}`;
      button.addEventListener('click', () => {
        this.state.activeChapterIndex = index;
        this.#highlightChapters();
        this.#renderProgress(chapter.note || chapter.label || `Chapter ${index + 1}`);
        this.track('chapter_clicked', { id: item.id, chapter: index });
        if (item.kind === 'video') {
          this.video.currentTime = chapter.start || 0;
          void this.video.play();
        } else if (item.kind === 'audio') {
          this.audioEl.currentTime = chapter.start || 0;
          void this.audioEl.play();
        }
      });
      this.chapterStrip.append(button);
    });
  }

  #highlightChapters() {
    const buttons = Array.from(this.chapterStrip.querySelectorAll('button'));
    buttons.forEach((button, index) => {
      button.classList.toggle('is-active', index === this.state.activeChapterIndex);
    });
  }

  #syncLibrarySelection() {
    const selected = this.state.selectedId;
    for (const card of this.libraryStage.querySelectorAll('.library-card')) {
      card.classList.toggle('is-selected', card instanceof HTMLElement && card.dataset.itemId === selected);
    }
  }

  #scrollSelectedCardIntoView(id) {
    const card = this.libraryStage.querySelector(`.library-card[data-item-id="${CSS.escape(id)}"]`);
    if (card instanceof HTMLElement) {
      card.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    }
  }

  #updatePlayButton() {
    this.viewerPlay.textContent = this.state.isPlaying ? 'Pause' : 'Play';
  }

  #renderProgress(message) {
    this.viewerProgress.textContent = message;
    this.viewerProgress.value = message;
  }

  #getPlaybackQueue() {
    const playlistItems = this.playlist.itemIds
      .map((id) => this.library.find((item) => item.id === id))
      .filter(Boolean);
    return playlistItems.length ? playlistItems : this.library.slice();
  }

  #matchesSearch(item, query) {
    const value = String(query || '').trim().toLowerCase();
    if (!value) return true;
    const haystack = [
      item.title,
      item.description,
      item.category,
      item.kind,
      ...(item.tags || []),
      ...(item.chapters || []).map((chapter) => chapter.label),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(value);
  }

  async #importFilesFlow() {
    if (supportsFileSystemAccess()) {
      try {
        const files = await globalThis.showOpenFilePicker({
          multiple: true,
          types: [
            {
              description: 'Media files',
              accept: {
                'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'],
                'video/*': ['.mp4', '.webm', '.mov'],
                'audio/*': ['.mp3', '.wav', '.m4a', '.ogg'],
              },
            },
            {
              description: 'Snapshots',
              accept: {
                'application/json': ['.json'],
              },
            },
          ],
        });
        const imported = [];
        for (const handle of files) {
          const file = await handle.getFile();
          imported.push(file);
        }
        if (imported.length) await this.importFiles(imported);
        return;
      } catch (error) {
        this.logger?.warn?.('File picker cancelled or unavailable', error);
      }
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*,video/*,audio/*,.json';
    input.addEventListener('change', () => {
      if (input.files?.length) void this.importFiles(input.files);
    });
    input.click();
  }

  async #importSnapshotFlow() {
    if (supportsFileSystemAccess()) {
      try {
        const [handle] = await globalThis.showOpenFilePicker({
          multiple: false,
          types: [
            {
              description: 'Snapshot JSON',
              accept: {
                'application/json': ['.json'],
              },
            },
          ],
        });
        const file = await handle.getFile();
        await this.importSnapshotFile(file);
        return;
      } catch (error) {
        this.logger?.warn?.('Snapshot picker cancelled or unavailable', error);
      }
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.addEventListener('change', () => {
      if (input.files?.length) void this.importSnapshotFile(input.files[0]);
    });
    input.click();
  }

  async removeLibraryItem(id) {
    if (!globalThis.confirm('Remove this media item from the library?')) return;
    await this.storage.deleteLibraryItem(id);
    this.library = this.library.filter((item) => item.id !== id);
    this.playlist.itemIds = this.playlist.itemIds.filter((entry) => entry !== id);
    await this.storage.savePlaylist(this.playlist);
    if (this.state.selectedId === id) {
      this.state.selectedId = this.library[0]?.id || '';
    }
    this.#persistSettings();
    this.#renderAll();
    this.#announce('Media item removed');
    this.track('media_item_removed', { id });
  }

  async #persistSettings() {
    const settings = await this.storage.getSettings();
    await this.storage.setSettings({
      ...settings,
      studioSearch: this.state.search,
      playbackMode: this.state.playbackMode,
      blendMode: this.state.blendMode,
      crossfadeMs: this.state.crossfadeMs,
      selectedId: this.state.selectedId,
    });
  }

  #scheduleLibraryRender() {
    if (this.renderScheduled) return;
    this.renderScheduled = true;
    requestAnimationFrame(() => {
      this.renderScheduled = false;
      this.#renderLibrary();
      this.#syncLibrarySelection();
    });
  }

  #indexFromPointer(event) {
    const target = event.target instanceof HTMLElement ? event.target.closest('[data-item-id]') : null;
    if (!target) return this.playlist.itemIds.length;
    const id = target.dataset.itemId;
    if (!id) return this.playlist.itemIds.length;
    const index = this.playlist.itemIds.indexOf(id);
    return index >= 0 ? index : this.playlist.itemIds.length;
  }

  async #onPlaylistDrop(event) {
    event.preventDefault();
    const sourceId = event.dataTransfer?.getData('text/plain');
    if (!sourceId) return;
    const sourceIndex = this.playlist.itemIds.indexOf(sourceId);
    if (sourceIndex >= 0) return;
    this.playlist.itemIds.push(sourceId);
    await this.storage.savePlaylist(this.playlist);
    this.#renderPlaylist();
    this.#announce('Added to playlist');
  }

  #onLibraryKeyDown(event) {
    const cards = Array.from(this.libraryStage.querySelectorAll('.library-card'));
    const selectedIndex = this.filteredLibrary.findIndex((item) => item.id === this.state.selectedId);
    if (!cards.length) return;

    if (event.key === 'Home') {
      event.preventDefault();
      const first = this.filteredLibrary[0];
      if (first) void this.selectItem(first.id, { play: false });
    } else if (event.key === 'End') {
      event.preventDefault();
      const last = this.filteredLibrary[this.filteredLibrary.length - 1];
      if (last) void this.selectItem(last.id, { play: false });
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const nextIndex = clamp(selectedIndex + (event.key === 'ArrowDown' ? 1 : -1), 0, this.filteredLibrary.length - 1);
      const next = this.filteredLibrary[nextIndex];
      if (next) {
        void this.selectItem(next.id, { play: false });
        this.#scrollSelectedCardIntoView(next.id);
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (this.state.selectedId) void this.selectItem(this.state.selectedId, { play: true });
    }
  }

  #onGlobalKeyDown(event) {
    const tag = /** @type {HTMLElement | null} */ (event.target instanceof HTMLElement ? event.target : null);
    const typing =
      (tag instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag.tagName)) ||
      (tag instanceof HTMLElement && tag.isContentEditable);
    if (typing) return;

    if (event.key === '?') {
      event.preventDefault();
      this.root.ownerDocument.getElementById('shortcuts-dialog')?.showModal();
    } else if (event.key.toLowerCase() === 'i') {
      event.preventDefault();
      void this.#importFilesFlow();
    } else if (event.key.toLowerCase() === 'e') {
      event.preventDefault();
      void this.exportSnapshot();
    } else if (event.key.toLowerCase() === ' ' && this.root.matches(':focus-within') === false) {
      event.preventDefault();
      this.togglePlayback();
    } else if (event.key === '[') {
      event.preventDefault();
      this.prevItem();
    } else if (event.key === ']') {
      event.preventDefault();
      this.nextItem();
    }
  }

  #onStagePointerDown(event) {
    this.stage.setPointerCapture(event.pointerId);
    this.stagePointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    this.pointerSnapshot = {
      startX: event.clientX,
      startY: event.clientY,
      startTime: performance.now(),
      mode: this.stagePointers.size > 1 ? 'pinch' : 'swipe',
      initialDistance: this.#pointerDistance(),
      initialMotion: { ...this.renderer.manualMotion },
    };
  }

  #onStagePointerMove(event) {
    if (!this.stagePointers.has(event.pointerId)) return;
    this.stagePointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (this.stagePointers.size >= 2 && this.pointerSnapshot) {
      const distance = this.#pointerDistance();
      const ratio = this.pointerSnapshot.initialDistance > 0 ? distance / this.pointerSnapshot.initialDistance : 1;
      const nextZoom = clamp((this.pointerSnapshot.initialMotion.zoom || 1) * ratio, 1, 2.6);
      const center = this.#pointerCenter();
      const normalizedX = (center.x - this.stage.clientWidth / 2) / this.stage.clientWidth;
      const normalizedY = (center.y - this.stage.clientHeight / 2) / this.stage.clientHeight;
      this.renderer.setManualMotion({
        zoom: nextZoom,
        panX: clamp(normalizedX * 1.3, -0.8, 0.8),
        panY: clamp(normalizedY * 1.3, -0.8, 0.8),
      });
      return;
    }
  }

  #onStagePointerUp(event) {
    this.stagePointers.delete(event.pointerId);

    if (this.stagePointers.size === 0 && this.pointerSnapshot) {
      const elapsed = performance.now() - this.pointerSnapshot.startTime;
      const deltaX = event.clientX - this.pointerSnapshot.startX;
      const deltaY = event.clientY - this.pointerSnapshot.startY;

      if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) && elapsed < 450) {
        if (deltaX < 0) {
          this.nextItem();
        } else {
          this.prevItem();
        }
      }

      this.pointerSnapshot = null;
      this.renderer.setManualMotion({ zoom: 1, panX: 0, panY: 0 });
    } else if (this.stagePointers.size === 1) {
      // Preserve the pinch zoom state if one finger remains on the stage.
      const remaining = [...this.stagePointers.values()][0];
      this.pointerSnapshot = {
        startX: remaining.x,
        startY: remaining.y,
        startTime: performance.now(),
        mode: 'swipe',
        initialDistance: 0,
        initialMotion: { ...this.renderer.manualMotion },
      };
    }
  }

  #pointerDistance() {
    const points = [...this.stagePointers.values()];
    if (points.length < 2) return 0;
    const [a, b] = points;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  #pointerCenter() {
    const points = [...this.stagePointers.values()];
    if (!points.length) return { x: 0, y: 0 };
    const sum = points.reduce(
      (acc, point) => {
        acc.x += point.x;
        acc.y += point.y;
        return acc;
      },
      { x: 0, y: 0 },
    );
    return {
      x: sum.x / points.length,
      y: sum.y / points.length,
    };
  }

  #announce(message) {
    const announcer = document.getElementById('sr-announcer');
    if (announcer) announcer.textContent = message;
  }
}
