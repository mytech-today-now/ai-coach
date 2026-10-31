import {
  comparisonRows,
  faqItems,
  heroBullets,
  navigationPages,
  pricingFeatures,
  processSteps,
  proofPoints,
  resources,
  siteConfig,
  testimonials,
  differentiators,
} from './data.js';
import { configureAnalytics } from './analytics.js';
import { AppStorage } from './storage.js';
import { createLogger, installGlobalErrorHandlers } from './logger.js';
import { DeckRouter } from './router.js';
import { createThemeController } from './theme.js';
import { StudioController } from './studio.js';
import {
  buildMailtoUrl,
  copyText,
  debounce,
  formatUsd,
  clamp,
  prefersReducedMotion,
  uid,
} from './utils.js';

const DEBUG_KEY = 'ai-coach.debug';
const APPLICATION_DRAFT_KEY = 'applicationDraft';
const SIDEBAR_WIDTH_KEY = 'ai-coach.sidebarWidth';

const root = document.documentElement;
const body = document.body;

/**
 * Resolve debug mode from URL or persisted preference.
 * @returns {boolean}
 */
function isDebugEnabled() {
  const params = new URLSearchParams(globalThis.location.search);
  return params.has('debug') || globalThis.localStorage?.getItem(DEBUG_KEY) === '1';
}

/**
 * Create a compact toast notification.
 * @param {string} title
 * @param {string} bodyText
 */
function createToast(title, bodyText) {
  const stack = /** @type {HTMLElement} */ (document.getElementById('toast-stack'));
  const template = /** @type {HTMLTemplateElement} */ (document.getElementById('toast-template'));
  const node = /** @type {HTMLElement} */ (template.content.firstElementChild?.cloneNode(true));
  if (!stack || !node) return;
  node.querySelector('.toast-title').textContent = title;
  node.querySelector('.toast-body').textContent = bodyText;
  stack.append(node);
  window.setTimeout(() => {
    node.classList.add('is-leaving');
    window.setTimeout(() => node.remove(), 240);
  }, 3600);
}

/**
 * Render a resource card collection.
 * @param {HTMLElement} container
 * @param {Array<{ title: string, description: string, href: string, meta: string }>} items
 */
function renderResourceCards(container, items) {
  container.replaceChildren();
  for (const item of items) {
    const card = document.createElement('article');
    card.className = 'resource-card card';
    card.innerHTML = `
      <p class="eyebrow">${item.meta}</p>
      <strong>${item.title}</strong>
      <p class="muted">${item.description}</p>
      <a class="secondary-button" href="${item.href}" target="_blank" rel="noreferrer noopener">Open</a>
    `;
    container.append(card);
  }
}

/**
 * Render a four-step timeline.
 * @param {HTMLElement} container
 * @param {Array<{ title: string, description: string }>} items
 */
function renderTimeline(container, items) {
  container.replaceChildren();
  items.forEach((item, index) => {
    const entry = document.createElement('li');
    entry.className = 'timeline-item';
    entry.innerHTML = `
      <div class="timeline-index">${index + 1}</div>
      <div class="flow" style="gap:0.4rem">
        <h4>${item.title}</h4>
        <p class="muted">${item.description}</p>
      </div>
    `;
    container.append(entry);
  });
}

/**
 * Render a feature card grid.
 * @param {HTMLElement} container
 * @param {Array<{ title: string, description: string }>} items
 */
function renderFeatureCards(container, items) {
  container.replaceChildren();
  items.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'feature-card';
    card.innerHTML = `
      <p class="eyebrow">Differentiator</p>
      <h4>${item.title}</h4>
      <p class="muted">${item.description}</p>
    `;
    container.append(card);
  });
}

/**
 * Render the comparison table body.
 * @param {HTMLElement} table
 * @param {Array<{ label: string, kyle: string, marketplaces: string, cruise: string }>} rows
 */
function renderComparisonTable(table, rows) {
  const tbody = table.querySelector('tbody');
  if (!tbody) return;
  tbody.replaceChildren();
  for (const row of rows) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <th scope="row">${row.label}</th>
      <td>${row.kyle}</td>
      <td>${row.marketplaces}</td>
      <td>${row.cruise}</td>
    `;
    tbody.append(tr);
  }
}

/**
 * Render FAQ items as accessible details elements.
 * @param {HTMLElement} container
 * @param {Array<{ question: string, answer: string }>} items
 */
function renderFaq(container, items) {
  container.replaceChildren();
  for (const item of items) {
    const details = document.createElement('details');
    details.className = 'faq-item card';
    details.innerHTML = `
      <summary>${item.question}</summary>
      <div class="faq-answer">${item.answer}</div>
    `;
    container.append(details);
  }
}

/**
 * Render the testimonial carousel.
 * @param {HTMLElement} container
 * @param {HTMLElement} dots
 * @param {HTMLButtonElement} prevButton
 * @param {HTMLButtonElement} nextButton
 * @param {boolean} reducedMotion
 */
function setupTestimonialsCarousel(container, dots, prevButton, nextButton, reducedMotion) {
  let index = 0;
  let timer = 0;
  let paused = false;

  const render = () => {
    const item = testimonials[index];
    container.replaceChildren();

    const card = document.createElement('article');
    card.className = 'testimonial-card';
    card.innerHTML = `
      <p class="eyebrow">Testimonial ${index + 1} of ${testimonials.length}</p>
      <p class="testimonial-quote">“${item.quote}”</p>
      <div>
        <strong>${item.headline}</strong>
        <p class="muted">${item.name}</p>
      </div>
    `;
    container.append(card);

    dots.replaceChildren();
    testimonials.forEach((testimonial, dotIndex) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = dotIndex === index ? 'is-active' : '';
      dot.setAttribute('aria-label', `Show testimonial ${dotIndex + 1}`);
      dot.addEventListener('click', () => {
        index = dotIndex;
        render();
        restart();
      });
      dots.append(dot);
    });
  };

  const next = () => {
    index = (index + 1) % testimonials.length;
    render();
  };

  const prev = () => {
    index = (index - 1 + testimonials.length) % testimonials.length;
    render();
  };

  const restart = () => {
    if (reducedMotion) return;
    window.clearInterval(timer);
    if (!paused) {
      timer = window.setInterval(next, 6500);
    }
  };

  prevButton.addEventListener('click', () => {
    prev();
    restart();
  });

  nextButton.addEventListener('click', () => {
    next();
    restart();
  });

  container.addEventListener('mouseenter', () => {
    paused = true;
    window.clearInterval(timer);
  });
  container.addEventListener('mouseleave', () => {
    paused = false;
    restart();
  });
  container.addEventListener('focusin', () => {
    paused = true;
    window.clearInterval(timer);
  });
  container.addEventListener('focusout', () => {
    paused = false;
    restart();
  });

  render();
  restart();
}

/**
 * Build and show a debug overlay with live diagnostics.
 * @param {AppStorage} storage
 * @param {ReturnType<import('./logger.js').createLogger>} logger
 * @param {HTMLElement} dialog
 * @param {StudioController} studio
 * @param {{ theme: string, bigText: boolean, route: string }} summary
 */
async function renderDebugDialog(storage, logger, dialog, studio, summary) {
  const content = /** @type {HTMLElement} */ (dialog.querySelector('#debug-content'));
  const [settings, library, playlists, applications, logs] = await Promise.all([
    storage.getSettings(),
    storage.listLibrary(),
    storage.listPlaylists(),
    storage.listApplications(),
    storage.listLogs(20),
  ]);

  content.replaceChildren();
  const blocks = [
    ['Theme', summary.theme],
    ['Big text', String(summary.bigText)],
    ['Route', summary.route],
    ['Storage', storage.mode],
    ['Library items', String(library.length)],
    ['Playlists', String(playlists.length)],
    ['Applications', String(applications.length)],
    ['Recent logs', String(logs.length)],
  ];

  const snapshot = document.createElement('section');
  snapshot.className = 'debug-grid';
  snapshot.innerHTML = blocks
    .map(
      ([label, value]) => `
        <div class="debug-line">
          <span class="eyebrow">${label}</span>
          <strong>${value}</strong>
        </div>
      `,
    )
    .join('');
  content.append(snapshot);

  if (logs.length) {
    const logBlock = document.createElement('section');
    logBlock.className = 'debug-log-list';
    logBlock.innerHTML = logs
      .map((entry) => `<div class="debug-line"><span class="eyebrow">${entry.level} • ${entry.scope}</span><strong>${entry.message}</strong></div>`)
      .join('');
    content.append(logBlock);
  }

  logger.debug('debug_dialog_rendered', { settings });
  if (dialog.open) {
    dialog.close();
  }
  dialog.showModal();
}

/**
 * Initialize the app shell.
 */
async function main() {
  const debug = isDebugEnabled();
  const storage = await new AppStorage().init();
  const logger = createLogger('app', { debug, storage });
  installGlobalErrorHandlers(logger);

  const analyticsMeasurementId = document.querySelector('meta[name="ga4-measurement-id"]')?.content || '';
  const analytics = configureAnalytics({
    measurementId: analyticsMeasurementId,
    logger,
  });

  const themeController = createThemeController({
    storage,
    root,
    body,
    themeButton: /** @type {HTMLButtonElement} */ (document.getElementById('theme-toggle')),
    textButton: /** @type {HTMLButtonElement} */ (document.getElementById('text-toggle')),
    logger,
  });
  themeController.init();

  // Basic content hydration.
  const heroBulletsList = document.getElementById('hero-bullets');
  if (heroBulletsList) {
    heroBulletsList.replaceChildren(
      ...heroBullets.map((text) => {
        const li = document.createElement('li');
        li.textContent = text;
        return li;
      }),
    );
  }

  renderResourceCards(/** @type {HTMLElement} */ (document.getElementById('home-resources')), resources);
  renderResourceCards(/** @type {HTMLElement} */ (document.getElementById('resource-grid')), resources);
  renderTimeline(/** @type {HTMLElement} */ (document.getElementById('process-timeline')), processSteps);
  renderFeatureCards(/** @type {HTMLElement} */ (document.getElementById('differentiator-grid')), differentiators);
  renderComparisonTable(/** @type {HTMLTableElement} */ (document.getElementById('comparison-table')), comparisonRows);
  renderFaq(/** @type {HTMLElement} */ (document.getElementById('faq-accordion')), faqItems);
  setupTestimonialsCarousel(
    /** @type {HTMLElement} */ (document.getElementById('testimonial-carousel')),
    /** @type {HTMLElement} */ (document.getElementById('carousel-dots')),
    /** @type {HTMLButtonElement} */ (document.querySelector('[data-carousel-prev]')),
    /** @type {HTMLButtonElement} */ (document.querySelector('[data-carousel-next]')),
    prefersReducedMotion(),
  );

  const pricingFeaturesList = /** @type {HTMLElement} */ (document.getElementById('pricing-features'));
  pricingFeaturesList.replaceChildren(
    ...pricingFeatures.map((text) => {
      const li = document.createElement('li');
      li.textContent = text;
      return li;
    }),
  );

  const installButton = /** @type {HTMLButtonElement} */ (document.getElementById('install-button'));
  const shortcutsButton = /** @type {HTMLButtonElement} */ (document.getElementById('shortcuts-button'));
  const shortcutsDialog = /** @type {HTMLDialogElement} */ (document.getElementById('shortcuts-dialog'));
  const menuButton = /** @type {HTMLButtonElement} */ (document.getElementById('menu-toggle'));
  const sidebar = /** @type {HTMLElement} */ (document.getElementById('sidebar'));
  const sidebarResizer = /** @type {HTMLElement} */ (sidebar.querySelector('.sidebar-resizer'));
  const routeButtons = Array.from(document.querySelectorAll('[data-route]'));
  const pages = Array.from(document.querySelectorAll('.page'));
  const deck = /** @type {HTMLElement} */ (document.getElementById('main-deck'));
  const summaryState = {
    theme: themeController.resolvedTheme,
    bigText: themeController.bigText,
    route: 'home',
  };

  const router = new DeckRouter({
    deck,
    pages,
    routeButtons,
    storage,
    logger,
    onChange(route) {
      summaryState.route = route;
      const pageTitle = navigationPages.find((page) => page.id === route)?.label || route;
      document.title = `${pageTitle} | Kyle Rode AI Coding Coach`;
      analytics.track('page_view', {
        page_route: route,
        page_title: document.title,
      });
      body.classList.remove('has-sidebar-open');
      menuButton.setAttribute('aria-expanded', 'false');
    },
  });
  await router.init();
  summaryState.route = router.currentRoute;

  const studio = new StudioController({
    root: /** @type {HTMLElement} */ (document.querySelector('[data-studio-root]')),
    storage,
    logger,
    track: analytics.track,
    reducedMotion: prefersReducedMotion(),
  });
  await studio.init();

  let deferredInstallPrompt = null;
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    installButton.hidden = false;
  });

  installButton.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    analytics.track('pwa_install_prompt', { outcome: choice.outcome });
    deferredInstallPrompt = null;
    installButton.hidden = true;
    createToast('Install prompt', `You chose to ${choice.outcome}.`);
  });

  shortcutsButton.addEventListener('click', () => {
    if (shortcutsDialog.open) {
      shortcutsDialog.close();
    } else {
      shortcutsDialog.showModal();
    }
  });

  menuButton.addEventListener('click', () => {
    const open = !body.classList.contains('has-sidebar-open');
    body.classList.toggle('has-sidebar-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener('click', (event) => {
    const target = /** @type {HTMLElement | null} */ (event.target instanceof HTMLElement ? event.target : null);
    if (!target) return;
    if (window.innerWidth > 940) return;
    if (body.classList.contains('has-sidebar-open') && !sidebar.contains(target) && target !== menuButton) {
      body.classList.remove('has-sidebar-open');
      menuButton.setAttribute('aria-expanded', 'false');
    }
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      body.classList.remove('has-sidebar-open');
      menuButton.setAttribute('aria-expanded', 'false');
    }

    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      const dialog = /** @type {HTMLDialogElement} */ (document.getElementById('debug-dialog'));
      void renderDebugDialog(storage, logger, dialog, studio, {
        theme: root.dataset.theme || themeController.resolvedTheme,
        bigText: body.classList.contains('big-text'),
        route: summaryState.route,
      });
    }
  });

  // Sidebar resizing for desktop.
  let resizing = false;
  const minSidebar = 260;
  const maxSidebar = 420;
  const storedSidebarWidth = Number(globalThis.localStorage?.getItem(SIDEBAR_WIDTH_KEY) || 0);
  if (storedSidebarWidth) {
    root.style.setProperty('--sidebar-width', `${storedSidebarWidth}px`);
  }

  sidebarResizer.addEventListener('pointerdown', (event) => {
    if (window.innerWidth <= 940) return;
    resizing = true;
    sidebarResizer.setPointerCapture(event.pointerId);
    document.body.style.cursor = 'col-resize';
  });

  window.addEventListener('pointermove', (event) => {
    if (!resizing) return;
    const width = clamp(event.clientX, minSidebar, maxSidebar);
    root.style.setProperty('--sidebar-width', `${width}px`);
  });

  window.addEventListener('pointerup', () => {
    if (!resizing) return;
    resizing = false;
    document.body.style.cursor = '';
    const value = parseInt(getComputedStyle(root).getPropertyValue('--sidebar-width'), 10) || minSidebar;
    globalThis.localStorage?.setItem(SIDEBAR_WIDTH_KEY, String(value));
  });

  // Application form handling.
  const applicationForm = /** @type {HTMLFormElement} */ (document.getElementById('application-form'));
  const copyApplicationButton = /** @type {HTMLButtonElement} */ (document.getElementById('copy-application-button'));
  const emailApplicationButton = /** @type {HTMLAnchorElement} */ (document.getElementById('email-application-button'));
  const draft = storage.getSetting(APPLICATION_DRAFT_KEY, null);
  const draftValue = await draft;
  if (draftValue && typeof draftValue === 'object') {
    Object.entries(draftValue).forEach(([name, value]) => {
      const control = applicationForm.elements.namedItem(name);
      if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) {
        control.value = String(value ?? '');
      }
    });
  }

  const buildApplicationSummary = () => {
    const data = Object.fromEntries(new FormData(applicationForm).entries());
    return [
      `Name: ${data.name || ''}`,
      `Email: ${data.email || ''}`,
      `Timezone: ${data.timezone || ''}`,
      `Current stack: ${data.stack || ''}`,
      `AI tools: ${data.tools || ''}`,
      `Goal: ${data.goal || ''}`,
      `Notes: ${data.notes || ''}`,
    ].join('\n');
  };

  const syncEmailLink = () => {
    const bodyText = buildApplicationSummary();
    const nameField = applicationForm.elements.namedItem('name');
    const applicantName =
      nameField instanceof HTMLInputElement || nameField instanceof HTMLTextAreaElement
        ? nameField.value
        : 'prospect';
    emailApplicationButton.href = buildMailtoUrl({
      to: siteConfig.emailRecipient,
      subject: `Mentorship application from ${applicantName}`,
      body: bodyText,
    });
  };

  const persistDraft = debounce(async () => {
    const data = Object.fromEntries(new FormData(applicationForm).entries());
    await storage.setSetting(APPLICATION_DRAFT_KEY, data);
    syncEmailLink();
  }, 180);

  applicationForm.addEventListener('input', persistDraft);
  applicationForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(applicationForm).entries());
    const record = {
      id: uid('application'),
      createdAt: new Date().toISOString(),
      ...data,
    };
    await storage.saveApplication(record);
    await storage.setSetting(APPLICATION_DRAFT_KEY, data);
    syncEmailLink();
    analytics.track('application_submitted', {
      hasGoal: Boolean(data.goal),
      hasTools: Boolean(data.tools),
    });
    createToast('Application saved', 'Your draft was stored locally and the email link was updated.');
    body.classList.add('has-application-saved');
    logger.info('Application saved', record);
  });

  copyApplicationButton.addEventListener('click', async () => {
    const summary = buildApplicationSummary();
    const copied = await copyText(summary);
    createToast(copied ? 'Summary copied' : 'Copy fallback used', 'The application summary is ready to paste.');
    analytics.track('application_summary_copied', { copied });
  });

  syncEmailLink();

  // PWA, offline shell, and background polish.
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('./sw.js', { scope: './' });
      logger.info('Service worker registered');
    } catch (error) {
      logger.warn('Service worker registration failed', error);
    }
  }

  setupAmbientCanvas(/** @type {HTMLCanvasElement} */ (document.getElementById('ambient-canvas')), prefersReducedMotion(), logger);

  // General analytics and status hooks.
  window.addEventListener('online', () => createToast('Online', 'Network connection restored.'));
  window.addEventListener('offline', () => createToast('Offline', 'The app shell and saved data remain available.'));

  // Track obvious CTA clicks.
  document.querySelectorAll('a[href="#/apply"], a[href="#/studio"], a[href="#/services"]').forEach((link) => {
    link.addEventListener('click', () => analytics.track('cta_click', { href: link.getAttribute('href') }));
  });

  summaryState.theme = themeController.resolvedTheme;
  summaryState.bigText = themeController.bigText;

  logger.info('App initialized', {
    debug,
    theme: themeController.resolvedTheme,
    bigText: themeController.bigText,
    route: router.currentRoute,
    storageMode: storage.mode,
  });
}

/**
 * Initialize the ambient particle background.
 * @param {HTMLCanvasElement} canvas
 * @param {boolean} reducedMotion
 * @param {ReturnType<import('./logger.js').createLogger>} logger
 */
function setupAmbientCanvas(canvas, reducedMotion, logger) {
  if (!canvas) return;
  const context = canvas.getContext('2d');
  if (!context) return;

  const particles = Array.from({ length: reducedMotion ? 0 : 42 }, (_, index) => ({
    x: Math.random(),
    y: Math.random(),
    vx: (Math.random() - 0.5) * 0.00018,
    vy: (Math.random() - 0.5) * 0.00014,
    radius: 0.6 + Math.random() * 1.9,
    hue: index % 2 ? 178 : 200,
  }));
  const pointer = { x: 0.5, y: 0.45 };
  const state = { width: 0, height: 0, raf: 0 };

  const resize = () => {
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    state.width = canvas.clientWidth * dpr;
    state.height = canvas.clientHeight * dpr;
    canvas.width = state.width;
    canvas.height = state.height;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const draw = (now) => {
    if (reducedMotion) {
      context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      return;
    }

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    context.clearRect(0, 0, width, height);

    const background = context.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, 'rgba(14, 165, 233, 0.08)');
    background.addColorStop(1, 'rgba(34, 197, 94, 0.05)');
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);

    for (const particle of particles) {
      particle.x += particle.vx;
      particle.y += particle.vy;
      if (particle.x < -0.1) particle.x = 1.1;
      if (particle.x > 1.1) particle.x = -0.1;
      if (particle.y < -0.1) particle.y = 1.1;
      if (particle.y > 1.1) particle.y = -0.1;

      const x = particle.x * width;
      const y = particle.y * height;
      const dx = x - pointer.x * width;
      const dy = y - pointer.y * height;
      const dist = Math.hypot(dx, dy);
      const alpha = clamp(1 - dist / 540, 0, 0.28);

      context.beginPath();
      context.arc(x, y, particle.radius, 0, Math.PI * 2);
      context.fillStyle = `rgba(${particle.hue}, 215, 240, ${alpha})`;
      context.fill();
    }

    context.strokeStyle = 'rgba(125, 211, 252, 0.08)';
    context.lineWidth = 1;
    for (let i = 0; i < particles.length; i += 1) {
      for (let j = i + 1; j < particles.length; j += 1) {
        const a = particles[i];
        const b = particles[j];
        const ax = a.x * width;
        const ay = a.y * height;
        const bx = b.x * width;
        const by = b.y * height;
        const dist = Math.hypot(ax - bx, ay - by);
        if (dist < 180) {
          context.globalAlpha = 1 - dist / 180;
          context.beginPath();
          context.moveTo(ax, ay);
          context.lineTo(bx, by);
          context.stroke();
        }
      }
    }
    context.globalAlpha = 1;

    state.raf = requestAnimationFrame(draw);
  };

  canvas.parentElement?.addEventListener('pointermove', (event) => {
    pointer.x = event.clientX / window.innerWidth;
    pointer.y = event.clientY / window.innerHeight;
  });

  new ResizeObserver(resize).observe(canvas);
  resize();
  if (!reducedMotion) {
    state.raf = requestAnimationFrame(draw);
  } else {
    logger.debug('Ambient animation disabled for reduced motion');
  }
}

void main();
