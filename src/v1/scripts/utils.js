/**
 * Shared utility helpers for the mentorship site and studio.
 * The module stays dependency-free so it can be reused across
 * the landing pages, the media studio, and export/import flows.
 */

/**
 * Clamp a numeric value into an inclusive range.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Generate a stable-ish unique id with a prefix.
 * @param {string} [prefix='id']
 * @returns {string}
 */
export function uid(prefix = 'id') {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}_${globalThis.crypto.randomUUID()}`;
  }

  const rand = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `${prefix}_${time}_${rand}`;
}

/**
 * Escape a string for safe insertion into HTML/SVG text nodes.
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
 * Convert an SVG string into a data URI.
 * @param {string} svg
 * @returns {string}
 */
export function svgToDataUri(svg) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

/**
 * Split text into up to two compact lines for poster artwork.
 * @param {string} value
 * @param {number} [maxChars=22]
 * @returns {string[]}
 */
export function splitTitle(value, maxChars = 22) {
  const words = String(value).trim().split(/\s+/).filter(Boolean);
  if (!words.length) {
    return ['Untitled'];
  }

  const lines = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.slice(0, 3);
}

/**
 * Build a lightweight poster-style SVG that can be used as a
 * safe offline preview for demo media cards.
 * @param {object} options
 * @param {string} options.title
 * @param {string} options.subtitle
 * @param {string} [options.accent='#22c55e']
 * @param {string} [options.accent2='#0ea5e9']
 * @param {string} [options.badge='DEMO']
 * @param {string} [options.seed='']
 * @returns {string}
 */
export function buildPosterSvg({
  title,
  subtitle,
  accent = '#22c55e',
  accent2 = '#0ea5e9',
  badge = 'DEMO',
  seed = '',
}) {
  const lines = splitTitle(title, 20);
  const lineHeight = 82;
  const startY = 280 - ((lines.length - 1) * lineHeight) / 2;
  const circles = Array.from({ length: 6 }, (_, index) => {
    const radius = 90 + index * 34;
    const opacity = 0.12 + index * 0.03;
    return `<circle cx="970" cy="150" r="${radius}" fill="none" stroke="rgba(255,255,255,${opacity})" stroke-width="2" />`;
  }).join('');

  const textLines = lines
    .map((line, index) => `<tspan x="110" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`)
    .join('');

  const subtitleNode = subtitle
    ? `<text x="112" y="470" fill="rgba(255,255,255,0.72)" font-family="Inter, ui-sans-serif, system-ui" font-size="32" letter-spacing="0.01em">${escapeXml(subtitle)}</text>`
    : '';

  return svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" role="img" aria-label="${escapeXml(title)} poster">
      <defs>
        <linearGradient id="bg-${escapeXml(seed)}" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="${accent}"/>
          <stop offset="55%" stop-color="${accent2}"/>
          <stop offset="100%" stop-color="#08131f"/>
        </linearGradient>
        <linearGradient id="glow-${escapeXml(seed)}" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.42)"/>
          <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
        </linearGradient>
        <filter id="shadow-${escapeXml(seed)}" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="18" stdDeviation="24" flood-color="rgba(0,0,0,0.32)"/>
        </filter>
      </defs>
      <rect width="1200" height="800" rx="48" fill="url(#bg-${escapeXml(seed)})"/>
      <rect x="36" y="36" width="1128" height="728" rx="40" fill="none" stroke="rgba(255,255,255,0.08)" />
      <path d="M120 100 C 470 20, 730 130, 1120 78" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="2"/>
      <path d="M80 640 C 420 520, 780 760, 1120 612" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="2"/>
      ${circles}
      <rect x="110" y="106" width="164" height="54" rx="27" fill="rgba(255,255,255,0.16)" stroke="rgba(255,255,255,0.2)"/>
      <text x="192" y="143" text-anchor="middle" fill="#ffffff" font-family="Inter, ui-sans-serif, system-ui" font-size="22" letter-spacing="0.24em">${escapeXml(badge)}</text>
      <text x="110" y="${startY}" fill="#ffffff" font-family="Inter, ui-sans-serif, system-ui" font-size="74" font-weight="800" filter="url(#shadow-${escapeXml(seed)})">
        ${textLines}
      </text>
      ${subtitleNode}
      <rect x="110" y="536" width="292" height="76" rx="24" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.18)"/>
      <text x="156" y="585" fill="#ffffff" font-family="Inter, ui-sans-serif, system-ui" font-size="24" font-weight="700">AI Coding Coach</text>
      <text x="110" y="684" fill="rgba(255,255,255,0.66)" font-family="Inter, ui-sans-serif, system-ui" font-size="22">Mentorship • systems thinking • self-reliance</text>
    </svg>
  `);
}

/**
 * Light-weight JSON parse with a fallback.
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
 * @param {number} wait
 * @returns {T & { cancel: () => void }}
 */
export function debounce(fn, wait = 150) {
  let timer = null;

  const debounced = /** @type {any} */ ((...args) => {
    clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), wait);
  });

  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}

/**
 * Create a throttled version of a function.
 * @template {(...args: any[]) => any} T
 * @param {T} fn
 * @param {number} wait
 * @returns {T}
 */
export function throttle(fn, wait = 100) {
  let last = 0;
  let pending = null;

  return /** @type {any} */ ((...args) => {
    const now = Date.now();
    const remaining = wait - (now - last);
    if (remaining <= 0) {
      last = now;
      fn(...args);
      return;
    }

    clearTimeout(pending);
    pending = window.setTimeout(() => {
      last = Date.now();
      fn(...args);
    }, remaining);
  });
}

/**
 * Test if the user has requested reduced motion.
 * @returns {boolean}
 */
export function prefersReducedMotion() {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * Test if the browser supports the File System Access API.
 * @returns {boolean}
 */
export function supportsFileSystemAccess() {
  return typeof globalThis.showOpenFilePicker === 'function' && typeof globalThis.showSaveFilePicker === 'function';
}

/**
 * Test if the browser supports the directory picker.
 * @returns {boolean}
 */
export function supportsDirectoryPicker() {
  return typeof globalThis.showDirectoryPicker === 'function';
}

/**
 * Convert a File or Blob to a data URL.
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
 * Read a file object as JSON.
 * @param {File} file
 * @returns {Promise<any>}
 */
export async function readJsonFile(file) {
  const text = await file.text();
  return JSON.parse(text);
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
 * Format a duration in seconds as mm:ss or hh:mm:ss.
 * @param {number} value
 * @returns {string}
 */
export function formatDuration(value) {
  if (!Number.isFinite(value) || value < 0) return '0:00';
  const total = Math.round(value);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}` : `${minutes}:${String(seconds).padStart(2, '0')}`;
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
 * Download a blob using a temporary anchor.
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
 * Build a mailto URL for a prefilled application draft.
 * @param {object} options
 * @param {string} options.to
 * @param {string} options.subject
 * @param {string} options.body
 * @returns {string}
 */
export function buildMailtoUrl({ to, subject, body }) {
  const params = new URLSearchParams({
    subject,
    body,
  });
  return `mailto:${encodeURIComponent(to)}?${params.toString()}`;
}

/**
 * Load an image from a URL, data URI, or blob URL.
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
 * Small helper for ensuring a value is always an array.
 * @template T
 * @param {T | T[] | null | undefined} value
 * @returns {T[]}
 */
export function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

