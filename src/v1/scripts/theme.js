import { themeModes } from './data.js';
import { safeJsonParse } from './utils.js';

const THEME_KEY = 'ai-coach.theme';
const BIG_TEXT_KEY = 'ai-coach.bigText';

/**
 * Apply theme, big text, and theme-color metadata in a single place.
 * @param {object} options
 * @param {HTMLElement} options.root
 * @param {HTMLElement} options.body
 * @param {string} options.theme
 * @param {boolean} options.bigText
 */
export function applyDisplayMode({ root, body, theme, bigText }) {
  root.dataset.theme = theme;
  root.dataset.themeResolved = theme;
  root.classList.toggle('big-text', bigText);
  body.classList.toggle('big-text', bigText);

  const themeColor = theme === 'dark' ? '#07111d' : '#eaf6ff';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', themeColor);
  }
}

/**
 * Read the persisted theme preference.
 * @returns {'auto'|'light'|'dark'}
 */
export function readThemePreference() {
  return /** @type {'auto'|'light'|'dark'} */ (safeJsonParse(globalThis.localStorage?.getItem(THEME_KEY), 'auto'));
}

/**
 * Read the persisted big text preference.
 * @returns {boolean}
 */
export function readBigTextPreference() {
  return Boolean(safeJsonParse(globalThis.localStorage?.getItem(BIG_TEXT_KEY), false));
}

/**
 * Store the display preferences in localStorage.
 * @param {'auto'|'light'|'dark'} theme
 * @param {boolean} bigText
 */
export function persistDisplayPreference(theme, bigText) {
  try {
    globalThis.localStorage?.setItem(THEME_KEY, JSON.stringify(theme));
    globalThis.localStorage?.setItem(BIG_TEXT_KEY, JSON.stringify(bigText));
  } catch {
    // Local persistence is a convenience, not a requirement.
  }
}

/**
 * Resolve the actual theme for an auto preference.
 * @param {'auto'|'light'|'dark'} preference
 * @returns {'light'|'dark'}
 */
export function resolveTheme(preference) {
  if (preference === 'light' || preference === 'dark') {
    return preference;
  }
  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Create a controller for the theme and big-text toggles.
 * @param {object} options
 * @param {AppStorage} options.storage
 * @param {HTMLElement} options.root
 * @param {HTMLElement} options.body
 * @param {HTMLButtonElement} options.themeButton
 * @param {HTMLButtonElement} options.textButton
 * @param {ReturnType<import('./logger.js').createLogger>} options.logger
 */
export function createThemeController({ storage, root, body, themeButton, textButton, logger }) {
  let preference = readThemePreference();
  let bigText = readBigTextPreference();

  const syncUi = () => {
    const resolved = resolveTheme(preference);
    applyDisplayMode({ root, body, theme: resolved, bigText });

    themeButton.setAttribute('aria-pressed', String(preference !== 'auto'));
    themeButton.setAttribute('aria-label', `Color theme, current ${preference}`);
    textButton.setAttribute('aria-pressed', String(bigText));
    textButton.setAttribute('aria-label', bigText ? 'Big text on' : 'Big text off');
    themeButton.dataset.value = preference;
    textButton.dataset.value = String(bigText);
  };

  const persist = () => {
    persistDisplayPreference(preference, bigText);
    void storage.setSetting('themePreference', preference);
    void storage.setSetting('bigText', bigText);
  };

  const setTheme = (value) => {
    preference = value;
    syncUi();
    persist();
    logger.event('theme_change', { value });
  };

  const toggleTheme = () => {
    const current = themeModes.findIndex((mode) => mode.id === preference);
    const next = themeModes[(current + 1) % themeModes.length]?.id ?? 'auto';
    setTheme(/** @type {'auto'|'light'|'dark'} */ (next));
  };

  const setBigText = (value) => {
    bigText = Boolean(value);
    syncUi();
    persist();
    logger.event('big_text_toggle', { value: bigText });
  };

  const toggleBigText = () => setBigText(!bigText);

  const init = () => {
    syncUi();

    themeButton.addEventListener('click', toggleTheme);
    textButton.addEventListener('click', toggleBigText);

    const mediaQuery = globalThis.matchMedia?.('(prefers-color-scheme: dark)');
    mediaQuery?.addEventListener?.('change', () => {
      if (preference === 'auto') {
        syncUi();
      }
    });
  };

  return {
    init,
    setTheme,
    toggleTheme,
    setBigText,
    toggleBigText,
    get preference() {
      return preference;
    },
    get resolvedTheme() {
      return resolveTheme(preference);
    },
    get bigText() {
      return bigText;
    },
  };
}
