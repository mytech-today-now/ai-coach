import { debounce } from './utils.js';

/**
 * Hash-based page router for the horizontally snapping section deck.
 */
export class DeckRouter {
  /**
   * @param {object} options
   * @param {HTMLElement} options.deck
   * @param {HTMLElement[]} options.pages
   * @param {HTMLElement[]} options.routeButtons
   * @param {AppStorage} options.storage
   * @param {ReturnType<import('./logger.js').createLogger>} options.logger
   * @param {(route: string, page: HTMLElement, index: number) => void} [options.onChange]
   */
  constructor({ deck, pages, routeButtons, storage, logger, onChange = () => {} }) {
    this.deck = deck;
    this.pages = pages;
    this.routeButtons = routeButtons;
    this.storage = storage;
    this.logger = logger;
    this.onChange = onChange;
    this.currentRoute = pages[0]?.dataset.page ?? 'home';
    this.routeToIndex = new Map(pages.map((page, index) => [page.dataset.page ?? `page-${index}`, index]));
    this.indexToRoute = pages.map((page) => page.dataset.page ?? 'home');
    this.debouncedSync = debounce(() => this.#syncFromScroll(), 90);
    this.suppressScrollSync = false;
  }

  async init() {
    this.deck.addEventListener('scroll', this.debouncedSync, { passive: true });
    window.addEventListener('hashchange', () => {
      this.go(this.#routeFromHash(), { replace: false, focus: false });
    });

    this.routeButtons.forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        this.go(button.dataset.route ?? 'home');
      });
    });

    window.addEventListener('resize', () => {
      this.#scrollToRoute(this.currentRoute, { behavior: 'auto' });
    });

    const lastRoute = await this.storage.getSetting('lastRoute', this.#routeFromHash());
    this.go(String(lastRoute || 'home'), { replace: true, focus: false });
  }

  /**
   * Navigate to a page by route id.
   * @param {string} route
   * @param {object} [options]
   * @param {boolean} [options.replace=false]
   * @param {boolean} [options.focus=true]
   */
  go(route, options = {}) {
    const { replace = false, focus = true } = options;
    const nextRoute = this.routeToIndex.has(route) ? route : this.indexToRoute[0] ?? 'home';
    const index = this.routeToIndex.get(nextRoute) ?? 0;
    const page = this.pages[index];

    if (!page) return;

    this.currentRoute = nextRoute;
    this.#syncActiveState(nextRoute);
    this.suppressScrollSync = true;
    this.#scrollToRoute(nextRoute, { behavior: 'auto' });
    this.#writeHash(nextRoute, replace);
    void this.storage.setSetting('lastRoute', nextRoute);
    this.logger.event('route_change', { route: nextRoute, index });
    this.onChange(nextRoute, page, index);
    window.setTimeout(() => {
      this.suppressScrollSync = false;
    }, replace ? 0 : 380);

    if (focus) {
      window.setTimeout(() => {
        const target = page.querySelector('h1, h2, h3, button, a, [tabindex]:not([tabindex="-1"])');
        target instanceof HTMLElement && target.focus({ preventScroll: true });
      }, 50);
    }
  }

  /**
   * Move to the next page.
   */
  next() {
    const index = this.routeToIndex.get(this.currentRoute) ?? 0;
    const next = this.indexToRoute[Math.min(this.pages.length - 1, index + 1)];
    if (next) this.go(next);
  }

  /**
   * Move to the previous page.
   */
  prev() {
    const index = this.routeToIndex.get(this.currentRoute) ?? 0;
    const prev = this.indexToRoute[Math.max(0, index - 1)];
    if (prev) this.go(prev);
  }

  #routeFromHash() {
    const hash = globalThis.location.hash.replace(/^#\/?/, '').trim();
    return hash || this.indexToRoute[0] || 'home';
  }

  #writeHash(route, replace) {
    const nextHash = `#/${route}`;
    if (replace) {
      history.replaceState(null, '', nextHash);
      return;
    }
    if (location.hash !== nextHash) {
      history.pushState(null, '', nextHash);
    }
  }

  #scrollToRoute(route, { behavior }) {
    const index = this.routeToIndex.get(route) ?? 0;
    const width = this.deck.clientWidth || window.innerWidth;
    this.deck.scrollTo({
      left: width * index,
      top: 0,
      behavior,
    });
  }

  #syncActiveState(route) {
    this.pages.forEach((page) => {
      const active = page.dataset.page === route;
      page.classList.toggle('is-active', active);
      page.toggleAttribute('inert', !active);
      page.setAttribute('aria-hidden', String(!active));
    });

    this.routeButtons.forEach((button) => {
      const active = button.dataset.route === route;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-current', active ? 'page' : 'false');
    });
  }

  #syncFromScroll() {
    if (this.suppressScrollSync) return;
    const width = this.deck.clientWidth || window.innerWidth;
    const index = Math.round(this.deck.scrollLeft / width);
    const nextRoute = this.indexToRoute[index] ?? this.currentRoute;
    if (nextRoute !== this.currentRoute) {
      this.currentRoute = nextRoute;
      this.#syncActiveState(nextRoute);
      this.#writeHash(nextRoute, true);
      void this.storage.setSetting('lastRoute', nextRoute);
      this.logger.event('route_scroll_sync', { route: nextRoute, index });
      this.onChange(nextRoute, this.pages[index] ?? this.pages[0], index);
    }
  }
}
