/**
 * Shared utility helpers for the Kyle Rode coaching site.
 * The module stays dependency-free so it can be reused across
 * the marketing pages and checkout/signup flow.
 */

/**
 * Clamp a number into an inclusive range.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Generate a unique id with an optional prefix.
 * @param {string} [prefix='id']
 * @returns {string}
 */
export function uid(prefix = 'id') {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}_${globalThis.crypto.randomUUID()}`;
  }

  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${time}_${random}`;
}

/**
 * Escape text for safe HTML or SVG insertion.
 * @param {string} value
 * @returns {string}
 */
export function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

/**
 * Escape HTML text.
 * @param {string} value
 * @returns {string}
 */
export const escapeHtml = escapeXml;

/**
 * Parse JSON safely with a fallback.
 * @template T
 * @param {string | null | undefined} value
 * @param {T} fallback
 * @returns {T}
 */
export function safeJsonParse(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/**
 * Create a debounced version of a function.
 * @template {(...args: any[]) => any} T
 * @param {T} fn
 * @param {number} [wait=150]
 * @returns {T & { cancel: () => void }}
 */
export function debounce(fn, wait = 150) {
  let timer = 0;
  const debounced = /** @type {any} */ ((...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), wait);
  });
  debounced.cancel = () => window.clearTimeout(timer);
  return debounced;
}

/**
 * Create a throttled function.
 * @template {(...args: any[]) => any} T
 * @param {T} fn
 * @param {number} [wait=100]
 * @returns {T}
 */
export function throttle(fn, wait = 100) {
  let last = 0;
  let pending = 0;
  return /** @type {any} */ ((...args) => {
    const now = Date.now();
    const remaining = wait - (now - last);
    if (remaining <= 0) {
      last = now;
      fn(...args);
      return;
    }
    window.clearTimeout(pending);
    pending = window.setTimeout(() => {
      last = Date.now();
      fn(...args);
    }, remaining);
  });
}

/**
 * Detect reduced motion preference.
 * @returns {boolean}
 */
export function prefersReducedMotion() {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * Detect File System Access API support.
 * @returns {boolean}
 */
export function supportsFileSystemAccess() {
  return typeof globalThis.showOpenFilePicker === 'function' && typeof globalThis.showSaveFilePicker === 'function';
}

/**
 * Detect directory picker support.
 * @returns {boolean}
 */
export function supportsDirectoryPicker() {
  return typeof globalThis.showDirectoryPicker === 'function';
}

/**
 * Convert a Blob into a data URL.
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read blob'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

/**
 * Read and parse a JSON file.
 * @param {File} file
 * @returns {Promise<any>}
 */
export async function readJsonFile(file) {
  return JSON.parse(await file.text());
}

/**
 * Format a USD amount.
 * @param {number} value
 * @returns {string}
 */
export function formatUsd(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format a duration in seconds.
 * @param {number} value
 * @returns {string}
 */
export function formatDuration(value) {
  if (!Number.isFinite(value) || value < 0) return '0:00';
  const total = Math.round(value);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Move an array item from one index to another.
 * @template T
 * @param {T[]} list
 * @param {number} from
 * @param {number} to
 * @returns {T[]}
 */
export function arrayMove(list, from, to) {
  const copy = list.slice();
  if (from < 0 || from >= copy.length || to < 0 || to >= copy.length || from === to) {
    return copy;
  }
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

/**
 * Download a blob with a temporary link.
 * @param {Blob} blob
 * @param {string} filename
 * @returns {void}
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Copy text to the clipboard with a prompt fallback.
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const promptText = window.prompt('Copy this text:', text);
    return typeof promptText === 'string';
  }
}

/**
 * Build a mailto URL.
 * @param {object} options
 * @param {string} options.to
 * @param {string} options.subject
 * @param {string} options.body
 * @returns {string}
 */
export function buildMailtoUrl({ to, subject, body }) {
  const params = new URLSearchParams({ subject, body });
  return `mailto:${encodeURIComponent(to)}?${params.toString()}`;
}

/**
 * Load an image.
 * @param {string} src
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.loading = 'eager';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load image: ${src}`));
    image.src = src;
  });
}

/**
 * Ensure a value is always an array.
 * @template T
 * @param {T | T[] | null | undefined} value
 * @returns {T[]}
 */
export function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}
