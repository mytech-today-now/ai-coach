import { safeJsonParse } from './utils.js';

const THEME_KEY = 'ai-coach-v2.theme';
const BIG_TEXT_KEY = 'ai-coach-v2.bigText';

/**
 * Apply theme and big text state to the document.
 * @param {object} options
 * @param {HTMLElement} options.root
 * @param {HTMLElement} options.body
 * @param {'light'|'dark'} options.theme
 * @param {boolean} options.bigText
 */
export function applyDisplayMode({ root, body, theme, bigText }) {
  root.dataset.theme = theme;
  root.dataset.themeResolved = theme;
  root.classList.toggle('big-text', bigText);
  body.classList.toggle('big-text', bigText);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', theme === 'dark' ? '#0a1219' : '#f3ede4');
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
 * Persist the display preference values.
 * @param {'auto'|'light'|'dark'} theme
 * @param {boolean} bigText
 */
export function persistDisplayPreference(theme, bigText) {
  try {
    globalThis.localStorage?.setItem(THEME_KEY, JSON.stringify(theme));
    globalThis.localStorage?.setItem(BIG_TEXT_KEY, JSON.stringify(bigText));
  } catch {
    // LocalStorage is a convenience, not a requirement.
  }
}

/**
 * Resolve the actual theme value.
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
 * Create the theme and big text controller.
 * @param {object} options
 * @param {import('./storage.js').AppStorage} options.storage
 * @param {HTMLElement} options.root
 * @param {HTMLElement} options.body
 * @param {HTMLButtonElement | null} options.themeButton
 * @param {HTMLButtonElement | null} options.textButton
 * @param {ReturnType<import('./logger.js').createLogger>} options.logger
 */
export function createThemeController({ storage, root, body, themeButton, textButton, logger }) {
  let preference = readThemePreference();
  let bigText = readBigTextPreference();

  const syncUi = () => {
    const resolved = resolveTheme(preference);
    applyDisplayMode({ root, body, theme: resolved, bigText });

    if (themeButton) {
      themeButton.dataset.value = preference;
      themeButton.textContent = `Theme: ${preference}`;
      themeButton.setAttribute('aria-label', `Color theme, current ${preference}`);
      themeButton.setAttribute('aria-pressed', String(preference !== 'auto'));
    }

    if (textButton) {
      textButton.dataset.value = String(bigText);
      textButton.textContent = bigText ? 'Big Text: on' : 'Big Text: off';
      textButton.setAttribute('aria-label', bigText ? 'Big text on' : 'Big text off');
      textButton.setAttribute('aria-pressed', String(bigText));
    }
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
    const next = preference === 'auto' ? 'light' : preference === 'light' ? 'dark' : 'auto';
    setTheme(next);
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
    themeButton?.addEventListener('click', toggleTheme);
    textButton?.addEventListener('click', toggleBigText);

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

