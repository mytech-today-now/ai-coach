import {
  comparisonRows,
  careerSnapshots,
  contactPrompts,
  credibilityCards,
  differentiators,
  faqItems,
  heroHighlights,
  navigationPages,
  pricingNotes,
  pricingTiers,
  processSteps,
  proofPoints,
  quickLinks,
  resources,
  siteConfig,
  testimonials,
} from './data.js';
import { configureAnalytics } from './analytics.js';
import { AppStorage } from './storage.js';
import { createLogger, installGlobalErrorHandlers } from './logger.js';
import { createThemeController } from './theme.js';
import {
  buildMailtoUrl,
  copyText,
  debounce,
  clamp,
  escapeHtml,
  formatUsd,
  prefersReducedMotion,
  uid,
} from './utils.js';

const DEBUG_KEY = 'ai-coach-v2.debug';
const CONTACT_DRAFT_KEY = 'ai-coach-v2.contactDraft';

/** @type {ReturnType<typeof createLogger> | null} */
let loggerGlobal = null;
/** @type {ReturnType<typeof configureAnalytics> | null} */
let analyticsGlobal = null;

const root = document.documentElement;
const body = document.body;
const page = body.dataset.page || 'home';

function isDebugEnabled() {
  const params = new URLSearchParams(globalThis.location.search);
  return params.has('debug') || globalThis.localStorage?.getItem(DEBUG_KEY) === '1';
}

/**
 * Create a toast notification.
 * @param {string} title
 * @param {string} bodyText
 */
function createToast(title, bodyText) {
  const stack = /** @type {HTMLElement | null} */ (document.getElementById('toast-stack'));
  const template = /** @type {HTMLTemplateElement | null} */ (document.getElementById('toast-template'));
  if (!stack || !template) return;

  const node = /** @type {HTMLElement | null} */ (template.content.firstElementChild?.cloneNode(true));
  if (!node) return;

  const titleEl = node.querySelector('.toast-title');
  const bodyEl = node.querySelector('.toast-body');
  if (titleEl) titleEl.textContent = title;
  if (bodyEl) bodyEl.textContent = bodyText;

  stack.append(node);
  window.setTimeout(() => {
    node.classList.add('is-leaving');
    window.setTimeout(() => node.remove(), 250);
  }, 3400);
}

/**
 * Render a list of proof points.
 * @param {HTMLElement | null} container
 */
function renderProofPoints(container) {
  if (!container) return;
  container.replaceChildren();
  for (const point of proofPoints) {
    const item = document.createElement('article');
    item.className = 'stat-card';
    item.innerHTML = `
      <p class="eyebrow">${escapeHtml(point.label)}</p>
      <strong>${escapeHtml(point.value)}</strong>
    `;
    container.append(item);
  }
}

/**
 * Render highlight cards.
 * @param {HTMLElement | null} container
 * @param {Array<{ title: string, description: string }>} [items]
 */
function renderHighlightCards(container, items = heroHighlights) {
  if (!container) return;
  container.replaceChildren();
  for (const item of items) {
    const card = document.createElement('article');
    card.className = 'feature-card';
    card.innerHTML = `
      <p class="eyebrow">What you get</p>
      <h3>${escapeHtml(item.title)}</h3>
      <p class="muted">${escapeHtml(item.description)}</p>
    `;
    container.append(card);
  }
}

/**
 * Render resource cards.
 * @param {HTMLElement | null} container
 * @param {Array<{ title: string, description: string, href: string, meta: string }>} items
 */
function renderResourceCards(container, items) {
  if (!container) return;
  container.replaceChildren();
  for (const item of items) {
    const card = document.createElement('article');
    card.className = 'resource-card card';
    card.innerHTML = `
      <p class="eyebrow">${escapeHtml(item.meta)}</p>
      <strong>${escapeHtml(item.title)}</strong>
      <p class="muted">${escapeHtml(item.description)}</p>
      <a class="button button--ghost" href="${escapeHtml(item.href)}" target="_blank" rel="noreferrer noopener">Open</a>
    `;
    container.append(card);
  }
}

/**
 * Render a process timeline.
 * @param {HTMLElement | null} container
 */
function renderTimeline(container) {
  if (!container) return;
  container.replaceChildren();
  processSteps.forEach((step, index) => {
    const item = document.createElement('article');
    item.className = 'timeline-item';
    item.innerHTML = `
      <div class="timeline-index">${index + 1}</div>
      <div class="flow" style="gap:0.35rem">
        <h3>${escapeHtml(step.title)}</h3>
        <p class="muted">${escapeHtml(step.description)}</p>
      </div>
    `;
    container.append(item);
  });
}

/**
 * Render differentiator cards.
 * @param {HTMLElement | null} container
 */
function renderDifferentiators(container) {
  if (!container) return;
  container.replaceChildren();
  for (const item of differentiators) {
    const card = document.createElement('article');
    card.className = 'feature-card';
    card.innerHTML = `
      <p class="eyebrow">Differentiator</p>
      <h3>${escapeHtml(item.title)}</h3>
      <p class="muted">${escapeHtml(item.description)}</p>
    `;
    container.append(card);
  }
}

/**
 * Render the comparison table.
 * @param {HTMLTableElement | null} table
 */
function renderComparisonTable(table) {
  if (!table) return;
  const tbody = table.querySelector('tbody');
  if (!tbody) return;
  tbody.replaceChildren();

  for (const row of comparisonRows) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <th scope="row">${escapeHtml(row.label)}</th>
      <td>${escapeHtml(row.kyle)}</td>
      <td>${escapeHtml(row.marketplaces)}</td>
      <td>${escapeHtml(row.cruise)}</td>
    `;
    tbody.append(tr);
  }
}

/**
 * Render an accessible FAQ list.
 * @param {HTMLElement | null} container
 * @param {Array<{ question: string, answer: string }>} items
 */
function renderFaq(container, items) {
  if (!container) return;
  container.replaceChildren();
  for (const item of items) {
    const details = document.createElement('details');
    details.className = 'faq-item card';
    details.innerHTML = `
      <summary>${escapeHtml(item.question)}</summary>
      <div class="faq-answer">${escapeHtml(item.answer)}</div>
    `;
    container.append(details);
  }
}

/**
 * Render credibility cards.
 * @param {HTMLElement | null} container
 */
function renderCredibilityCards(container) {
  if (!container) return;
  container.replaceChildren();
  for (const item of credibilityCards) {
    const card = document.createElement('article');
    card.className = 'cred-card card';
    card.innerHTML = `
      <p class="eyebrow">${escapeHtml(item.meta)}</p>
      <h3>${escapeHtml(item.title)}</h3>
      <p class="muted">${escapeHtml(item.description)}</p>
    `;
    container.append(card);
  }
}

/**
 * Render pricing cards.
 * @param {HTMLElement | null} container
 */
function renderPricingCards(container) {
  if (!container) return;
  container.replaceChildren();
  for (const tier of pricingTiers) {
    const card = document.createElement('article');
    card.className = 'pricing-card card';
    card.innerHTML = `
      <p class="eyebrow">${escapeHtml(tier.eyebrow)}</p>
      <h3>${escapeHtml(tier.name)}</h3>
      <p class="pricing-price">${formatUsd(tier.price)}</p>
      <p class="muted">${escapeHtml(tier.description)}</p>
      <ul class="pricing-features">
        ${tier.features.map((feature) => `<li>${escapeHtml(feature)}</li>`).join('')}
      </ul>
      <a class="button button--primary" href="./signup.html">Sign up</a>
    `;
    container.append(card);
  }
}

/**
 * Render pricing notes.
 * @param {HTMLElement | null} container
 */
function renderPricingNotes(container) {
  if (!container) return;
  container.replaceChildren();
  for (const note of pricingNotes) {
    const item = document.createElement('li');
    item.textContent = note;
    container.append(item);
  }
}

/**
 * Render contact prompts as a quick inspiration list.
 * @param {HTMLElement | null} container
 */
function renderContactPrompts(container) {
  if (!container) return;
  container.replaceChildren();
  for (const prompt of contactPrompts) {
    const item = document.createElement('span');
    item.className = 'chip';
    item.textContent = prompt;
    container.append(item);
  }
}

/**
 * Populate the sticky quick links rail.
 * @param {HTMLElement | null} container
 */
function renderQuickLinks(container) {
  if (!container) return;
  container.replaceChildren();
  for (const link of quickLinks) {
    const anchor = document.createElement('a');
    anchor.className = 'sticky-link';
    anchor.href = link.href;
    anchor.target = '_blank';
    anchor.rel = 'noreferrer noopener';
    anchor.dataset.quickLink = link.label;
    anchor.innerHTML = `
      <strong>${escapeHtml(link.label)}</strong>
      <span>${escapeHtml(link.description)}</span>
    `;
    anchor.addEventListener('click', () => {
      loggerGlobal?.event('external_link_click', { label: link.label, href: link.href });
      analyticsGlobal?.track('external_link_click', { label: link.label, href: link.href });
    });
    container.append(anchor);
  }
}

/**
 * Force every anchor to open in a new tab with safe rel defaults.
 */
function normalizeAllLinks() {
  document.querySelectorAll('a[href]').forEach((anchor) => {
    /** @type {HTMLAnchorElement} */ (anchor).target = '_blank';
    /** @type {HTMLAnchorElement} */ (anchor).rel = 'noreferrer noopener';
  });
}

/**
 * Build a simple testimonial carousel.
 * @param {HTMLElement | null} container
 * @param {HTMLElement | null} dots
 * @param {HTMLButtonElement | null} prevButton
 * @param {HTMLButtonElement | null} nextButton
 * @param {boolean} reducedMotion
 */
function setupTestimonialsCarousel(container, dots, prevButton, nextButton, reducedMotion) {
  if (!container || !dots || !prevButton || !nextButton) return;
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
      <p class="testimonial-quote">“${escapeHtml(item.quote)}”</p>
      <div>
        <strong>${escapeHtml(item.headline)}</strong>
        <p class="muted">${escapeHtml(item.name)}</p>
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
        analyticsGlobal?.track('testimonial_change', { index });
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
    analyticsGlobal?.track('testimonial_prev', { index });
  });

  nextButton.addEventListener('click', () => {
    next();
    restart();
    analyticsGlobal?.track('testimonial_next', { index });
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
 * Setup a subtle ambient canvas backdrop.
 * @param {HTMLCanvasElement | null} canvas
 * @param {boolean} reducedMotion
 * @param {ReturnType<typeof createLogger>} logger
 */
function setupAmbientCanvas(canvas, reducedMotion, logger) {
  if (!canvas) return;
  const context = canvas.getContext('2d');
  if (!context) return;

  const orbs = Array.from({ length: reducedMotion ? 0 : 28 }, (_, index) => ({
    x: Math.random(),
    y: Math.random(),
    vx: (Math.random() - 0.5) * 0.00014,
    vy: (Math.random() - 0.5) * 0.00012,
    radius: 0.55 + Math.random() * 1.8,
    hue: index % 3 === 0 ? 28 : index % 3 === 1 ? 173 : 197,
  }));
  const pointer = { x: 0.5, y: 0.45 };
  const state = { raf: 0 };

  const resize = () => {
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    canvas.height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const draw = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    context.clearRect(0, 0, width, height);

    if (reducedMotion) {
      const gradient = context.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, 'rgba(15, 118, 110, 0.12)');
      gradient.addColorStop(1, 'rgba(245, 158, 11, 0.06)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
      return;
    }

    const background = context.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, 'rgba(15, 118, 110, 0.12)');
    background.addColorStop(1, 'rgba(245, 158, 11, 0.08)');
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);

    for (const orb of orbs) {
      orb.x += orb.vx;
      orb.y += orb.vy;
      if (orb.x < -0.1) orb.x = 1.1;
      if (orb.x > 1.1) orb.x = -0.1;
      if (orb.y < -0.1) orb.y = 1.1;
      if (orb.y > 1.1) orb.y = -0.1;

      const x = orb.x * width;
      const y = orb.y * height;
      const dx = x - pointer.x * width;
      const dy = y - pointer.y * height;
      const dist = Math.hypot(dx, dy);
      const alpha = clamp(1 - dist / 560, 0, 0.28);

      context.beginPath();
      context.arc(x, y, orb.radius, 0, Math.PI * 2);
      context.fillStyle = `rgba(${orb.hue}, 215, 240, ${alpha})`;
      context.fill();
    }

    context.strokeStyle = 'rgba(255,255,255,0.08)';
    context.lineWidth = 1;
    for (let i = 0; i < orbs.length; i += 1) {
      for (let j = i + 1; j < orbs.length; j += 1) {
        const a = orbs[i];
        const b = orbs[j];
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

/**
 * Render the debug dialog snapshot.
 * @param {import('./storage.js').AppStorage} storage
 * @param {ReturnType<typeof createLogger>} logger
 * @param {HTMLDialogElement | null} dialog
 */
async function renderDebugDialog(storage, logger, dialog) {
  if (!dialog) return;
  const content = /** @type {HTMLElement | null} */ (dialog.querySelector('#debug-content'));
  if (!content) return;

  const [settings, library, playlists, applications, logs] = await Promise.all([
    storage.getSettings(),
    storage.listLibrary(),
    storage.listPlaylists(),
    storage.listApplications(),
    storage.listLogs(20),
  ]);

  content.replaceChildren();
  const blocks = [
    ['Page', page],
    ['Theme', root.dataset.theme || 'light'],
    ['Big text', String(body.classList.contains('big-text'))],
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
          <span class="eyebrow">${escapeHtml(label)}</span>
          <strong>${escapeHtml(String(value))}</strong>
        </div>
      `,
    )
    .join('');
  content.append(snapshot);

  const settingsBlock = document.createElement('section');
  settingsBlock.className = 'debug-settings';
  settingsBlock.innerHTML = `
    <p class="eyebrow">Settings</p>
    <pre>${escapeHtml(JSON.stringify(settings, null, 2))}</pre>
  `;
  content.append(settingsBlock);

  if (logs.length) {
    const logBlock = document.createElement('section');
    logBlock.className = 'debug-log-list';
    logBlock.innerHTML = logs
      .map(
        (entry) => `
          <div class="debug-line">
            <span class="eyebrow">${escapeHtml(entry.level)} • ${escapeHtml(entry.scope)}</span>
            <strong>${escapeHtml(entry.message)}</strong>
          </div>
        `,
      )
      .join('');
    content.append(logBlock);
  }

  logger.debug('debug_dialog_rendered', { settings });
}

/**
 * Setup form persistence and summary generation.
 * @param {import('./storage.js').AppStorage} storage
 * @param {ReturnType<typeof createLogger>} logger
 */
async function setupContactForm(storage, logger) {
  const form = /** @type {HTMLFormElement | null} */ (document.getElementById('contact-form'));
  const summary = /** @type {HTMLElement | null} */ (document.getElementById('contact-summary'));
  const copyButton = /** @type {HTMLButtonElement | null} */ (document.getElementById('copy-application-button'));
  const emailButton = /** @type {HTMLAnchorElement | null} */ (document.getElementById('email-application-button'));
  if (!form || !summary || !copyButton || !emailButton) return;

  const draft = await storage.getSetting(CONTACT_DRAFT_KEY, null);
  if (draft && typeof draft === 'object') {
    for (const [name, value] of Object.entries(draft)) {
      const control = form.elements.namedItem(name);
      if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement) {
        control.value = String(value ?? '');
      }
    }
  }

  const buildSummary = () => {
    const data = Object.fromEntries(new FormData(form).entries());
    return [
      `Name: ${data.name || ''}`,
      `Email: ${data.email || ''}`,
      `Timezone: ${data.timezone || ''}`,
      `Current stack: ${data.stack || ''}`,
      `Preferred tier: ${data.tier || ''}`,
      `AI tools: ${data.tools || ''}`,
      `Goal: ${data.goal || ''}`,
      `Notes: ${data.notes || ''}`,
    ].join('\n');
  };

  const renderSummary = () => {
    const data = Object.fromEntries(new FormData(form).entries());
    summary.innerHTML = `
      <p class="eyebrow">Live summary</p>
      <div class="summary-list">
        <div><span>Name</span><strong>${escapeHtml(String(data.name || 'Not set'))}</strong></div>
        <div><span>Email</span><strong>${escapeHtml(String(data.email || 'Not set'))}</strong></div>
        <div><span>Tier</span><strong>${escapeHtml(String(data.tier || 'Not set'))}</strong></div>
        <div><span>Stack</span><strong>${escapeHtml(String(data.stack || 'Not set'))}</strong></div>
      </div>
      <p class="muted">${escapeHtml(String(data.goal || 'Tell me what you are trying to build and I will shape the next steps.'))}</p>
    `;

    const bodyText = buildSummary();
    const applicantName = String(data.name || 'prospect');
    emailButton.href = buildMailtoUrl({
      to: siteConfig.emailRecipient,
      subject: `Mentorship application from ${applicantName}`,
      body: bodyText,
    });
  };

  const persistDraft = debounce(async () => {
    const data = Object.fromEntries(new FormData(form).entries());
    await storage.setSetting(CONTACT_DRAFT_KEY, data);
    renderSummary();
  }, 180);

  form.addEventListener('input', persistDraft);
  form.addEventListener('change', persistDraft);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const data = Object.fromEntries(new FormData(form).entries());
    const record = {
      id: uid('application'),
      createdAt: new Date().toISOString(),
      page,
      ...data,
    };
    await storage.saveApplication(record);
    await storage.setSetting(CONTACT_DRAFT_KEY, data);
    renderSummary();
    analyticsGlobal?.track('application_submitted', {
      tier: data.tier || 'unknown',
      has_goal: Boolean(data.goal),
    });
    logger.info('Application saved', record);
    createToast('Application saved', 'Your local draft was stored and the email link was refreshed.');
  });

  copyButton.addEventListener('click', async () => {
    const summaryText = buildSummary();
    const copied = await copyText(summaryText);
    analyticsGlobal?.track('application_summary_copied', { copied });
    createToast(copied ? 'Summary copied' : 'Copy fallback used', 'The application summary is ready to paste.');
  });

  const updateButtons = () => {
    const summaryText = buildSummary();
    const applicantName = form.elements.namedItem('name') instanceof HTMLInputElement ? form.elements.namedItem('name').value || 'prospect' : 'prospect';
    emailButton.href = buildMailtoUrl({
      to: siteConfig.emailRecipient,
      subject: `Mentorship application from ${applicantName}`,
      body: summaryText,
    });
  };

  form.addEventListener('input', updateButtons);
  renderSummary();
  updateButtons();
}

/**
 * Track visible elements and reveal them.
 */
function setupRevealObserver() {
  const items = document.querySelectorAll('[data-reveal]');
  if (!items.length || !('IntersectionObserver' in globalThis)) return;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.15 },
  );
  items.forEach((item) => observer.observe(item));
}

/**
 * Register the service worker.
 * @param {ReturnType<typeof createLogger>} logger
 */
async function registerServiceWorker(logger) {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('./sw.js', { scope: './' });
    logger.info('Service worker registered');
  } catch (error) {
    logger.warn('Service worker registration failed', error);
  }
}

/**
 * Populate page-specific content.
 */
function hydratePageContent() {
  renderProofPoints(document.getElementById('home-proof-points'));
  renderHighlightCards(document.getElementById('home-highlights'));
  renderHighlightCards(document.getElementById('signup-deliverables'));
  renderHighlightCards(document.getElementById('resume-highlights'), careerSnapshots);
  renderResourceCards(document.getElementById('home-resources'), resources);
  renderTimeline(document.getElementById('process-timeline'));
  renderDifferentiators(document.getElementById('differentiators-grid'));
  renderComparisonTable(/** @type {HTMLTableElement | null} */ (document.getElementById('comparison-table')));
  renderFaq(document.getElementById('pricing-faq'), faqItems);
  renderCredibilityCards(document.getElementById('credibility-grid'));
  renderResourceCards(document.getElementById('about-resources'), resources);
  renderPricingCards(document.getElementById('pricing-grid'));
  renderPricingNotes(document.getElementById('pricing-notes'));
  renderPricingNotes(document.getElementById('signup-notes'));
  renderContactPrompts(document.getElementById('contact-prompts'));
  renderQuickLinks(document.getElementById('sticky-links'));
}

/**
 * Set the active nav state.
 */
function syncActiveNav() {
  document.querySelectorAll('[data-nav]').forEach((link) => {
    const element = /** @type {HTMLAnchorElement} */ (link);
    element.classList.toggle('is-active', element.dataset.nav === page);
    element.setAttribute('aria-current', element.dataset.nav === page ? 'page' : 'false');
  });
}

/**
 * Bind shell interactions like shortcuts and install prompts.
 * @param {object} options
 * @param {import('./storage.js').AppStorage} options.storage
 * @param {ReturnType<typeof createLogger>} options.logger
 * @param {ReturnType<typeof configureAnalytics>} options.analytics
 * @param {ReturnType<typeof createThemeController>} options.themeController
 */
function bindShellInteractions({ storage, logger, analytics, themeController }) {
  const shortcutsButton = /** @type {HTMLButtonElement | null} */ (document.getElementById('shortcuts-button'));
  const shortcutsDialog = /** @type {HTMLDialogElement | null} */ (document.getElementById('shortcuts-dialog'));
  const debugDialog = /** @type {HTMLDialogElement | null} */ (document.getElementById('debug-dialog'));
  const installButton = /** @type {HTMLButtonElement | null} */ (document.getElementById('install-button'));
  const debugButton = /** @type {HTMLButtonElement | null} */ (document.getElementById('debug-button'));
  const navLinks = Array.from(document.querySelectorAll('[data-nav]'));

  let deferredInstallPrompt = null;

  shortcutsButton?.addEventListener('click', () => {
    if (!shortcutsDialog) return;
    if (shortcutsDialog.open) {
      shortcutsDialog.close();
    } else {
      shortcutsDialog.showModal();
    }
  });

  debugButton?.addEventListener('click', () => {
    if (debugDialog?.open) {
      debugDialog.close();
    } else if (debugDialog) {
      void renderDebugDialog(storage, logger, debugDialog).then(() => debugDialog.showModal());
    }
  });

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    if (installButton) {
      installButton.hidden = false;
    }
  });

  installButton?.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    analytics.track('pwa_install_prompt', { outcome: choice.outcome });
    logger.event('pwa_install_prompt', { outcome: choice.outcome });
    deferredInstallPrompt = null;
    installButton.hidden = true;
    createToast('Install prompt', `You chose to ${choice.outcome}.`);
  });

  window.addEventListener('appinstalled', () => {
    createToast('Installed', 'The app is ready to use offline.');
    analytics.track('pwa_installed', { page });
  });

  window.addEventListener('keydown', (event) => {
    const target = /** @type {HTMLElement | null} */ (event.target instanceof HTMLElement ? event.target : null);
    const typing =
      (target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) ||
      (target instanceof HTMLElement && target.isContentEditable);
    if (typing && event.key !== 'Escape') return;

    if (event.key === '?') {
      event.preventDefault();
      shortcutsDialog?.showModal();
      analytics.track('shortcut_help_opened', {});
    } else if (event.key.toLowerCase() === 't') {
      event.preventDefault();
      themeController.toggleTheme();
    } else if (event.key.toLowerCase() === 'b') {
      event.preventDefault();
      themeController.toggleBigText();
    } else if (event.key === '1' || event.key === '2' || event.key === '3' || event.key === '4' || event.key === '5' || event.key === '6') {
      const index = Number(event.key) - 1;
      const nav = navigationPages[index];
      if (nav) {
        event.preventDefault();
        window.open(nav.href, '_blank', 'noopener,noreferrer');
      }
    } else if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      if (debugDialog) {
        void renderDebugDialog(storage, logger, debugDialog).then(() => debugDialog.showModal());
      }
    }
  });

  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      analytics.track('navigation_click', {
        nav: link.getAttribute('data-nav'),
        href: link.getAttribute('href'),
      });
      logger.event('navigation_click', {
        nav: link.getAttribute('data-nav'),
        href: link.getAttribute('href'),
      });
    });
  });

  document.addEventListener('click', (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;

    const cta = target.closest('[data-track-click]');
    if (cta instanceof HTMLElement) {
      analytics.track(cta.dataset.trackClick || 'ui_click', {
        label: cta.getAttribute('aria-label') || cta.textContent?.trim() || cta.tagName,
      });
      logger.event(cta.dataset.trackClick || 'ui_click', {
        label: cta.getAttribute('aria-label') || cta.textContent?.trim() || cta.tagName,
      });
    }
  });
}

/**
 * Wire the Stripe signup embed on the signup page.
 * @param {ReturnType<typeof configureAnalytics>} analytics
 */
async function setupSignupPage(analytics) {
  const rootEl = /** @type {HTMLElement | null} */ (document.querySelector('[data-signup-root]'));
  const pricingTable = /** @type {HTMLElement | null} */ (document.getElementById('stripe-pricing-table'));
  const emailInput = /** @type {HTMLInputElement | null} */ (document.getElementById('signup-email'));
  const status = /** @type {HTMLElement | null} */ (document.getElementById('stripe-status'));
  if (!rootEl || !pricingTable || !status) return;

  const publishableKey = document.querySelector('meta[name="stripe-publishable-key"]')?.content?.trim() || '';
  const pricingTableId = document.querySelector('meta[name="stripe-pricing-table-id"]')?.content?.trim() || '';
  const configured =
    publishableKey &&
    pricingTableId &&
    !publishableKey.includes('REPLACE_ME') &&
    !pricingTableId.includes('REPLACE_ME');

  if (!configured) {
    status.textContent =
      'Add your Stripe publishable key and pricing table ID in signup.html, then the checkout will work directly on this page.';
    pricingTable.hidden = true;
    emailInput?.setAttribute('disabled', 'disabled');
    analytics.track('signup_stripe_unconfigured', {});
    return;
  }

  pricingTable.hidden = false;
  pricingTable.setAttribute('pricing-table-id', pricingTableId);
  pricingTable.setAttribute('publishable-key', publishableKey);

  const syncEmail = () => {
    const value = emailInput?.value.trim() || '';
    if (value) {
      pricingTable.setAttribute('customer-email', value);
    } else {
      pricingTable.removeAttribute('customer-email');
    }
  };

  emailInput?.addEventListener('input', syncEmail);
  syncEmail();
  status.textContent = 'Stripe checkout is ready on this page.';
  analytics.track('signup_stripe_ready', {});
}

/**
 * Main entry point.
 */
async function main() {
  const storage = await new AppStorage().init();
  const logger = createLogger('site', { debug: isDebugEnabled(), storage });
  installGlobalErrorHandlers(logger);

  const measurementId = document.querySelector('meta[name="ga4-measurement-id"]')?.content || '';
  const analytics = configureAnalytics({ measurementId, logger });
  loggerGlobal = logger;
  analyticsGlobal = analytics;

  const themeController = createThemeController({
    storage,
    root,
    body,
    themeButton: /** @type {HTMLButtonElement | null} */ (document.getElementById('theme-toggle')),
    textButton: /** @type {HTMLButtonElement | null} */ (document.getElementById('text-toggle')),
    logger,
  });
  themeController.init();

  syncActiveNav();
  hydratePageContent();
  normalizeAllLinks();
  setupRevealObserver();
  const footerYear = document.getElementById('footer-year');
  if (footerYear) {
    footerYear.textContent = String(new Date().getFullYear());
  }
  setupTestimonialsCarousel(
    /** @type {HTMLElement | null} */ (document.getElementById('testimonial-carousel')),
    /** @type {HTMLElement | null} */ (document.getElementById('carousel-dots')),
    /** @type {HTMLButtonElement | null} */ (document.getElementById('carousel-prev')),
    /** @type {HTMLButtonElement | null} */ (document.getElementById('carousel-next')),
    prefersReducedMotion(),
  );
  setupAmbientCanvas(
    /** @type {HTMLCanvasElement | null} */ (document.getElementById('ambient-canvas')),
    prefersReducedMotion(),
    logger,
  );
  bindShellInteractions({ storage, logger, analytics, themeController });

  if (page === 'contact') {
    await setupContactForm(storage, logger);
  }

  if (page === 'signup') {
    await setupSignupPage(analytics);
  }

  window.addEventListener('online', () => createToast('Online', 'Network connection restored.'));
  window.addEventListener('offline', () => createToast('Offline', 'The app shell and saved data remain available.'));

  await registerServiceWorker(logger);

  analytics.pageView({ page_name: page });
  logger.info('Page initialized', {
    page,
    theme: themeController.resolvedTheme,
    bigText: themeController.bigText,
    storageMode: storage.mode,
  });
}

void main();
