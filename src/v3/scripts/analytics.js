/**
 * Minimal GA4-compatible analytics bridge.
 * When a measurement ID is provided, the script is injected lazily.
 * Regardless of configuration, events also flow into dataLayer so
 * they can be inspected during development.
 */

/**
 * Configure the analytics bridge.
 * @param {object} [options]
 * @param {string | null | undefined} [options.measurementId]
 * @param {ReturnType<import('./logger.js').createLogger>} [options.logger]
 */
export function configureAnalytics({ measurementId, logger } = {}) {
  const dataLayer = (globalThis.dataLayer = globalThis.dataLayer || []);

  const ensureScript = () => {
    if (!measurementId) return;
    if (document.querySelector(`script[data-ga4="${measurementId}"]`)) return;

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    script.dataset.ga4 = measurementId;
    document.head.append(script);
  };

  /**
   * Push an event into the data layer and GA4.
   * @param {string} eventName
   * @param {Record<string, unknown>} [params={}]
   */
  const track = (eventName, params = {}) => {
    const payload = {
      ...params,
      page_path: `${globalThis.location?.pathname || '/'}${globalThis.location?.search || ''}`,
      page_title: document.title,
      page_location: globalThis.location?.href || '',
    };

    globalThis.gtag?.('event', eventName, payload);
    dataLayer.push({
      event: eventName,
      ...payload,
    });

    logger?.debug?.(`analytics:${eventName}`, payload);
  };

  const pageView = (params = {}) => track('page_view', params);

  if (measurementId) {
    ensureScript();
    globalThis.gtag =
      globalThis.gtag ||
      function gtag() {
        dataLayer.push(arguments);
      };

    globalThis.gtag('js', new Date());
    globalThis.gtag('config', measurementId, {
      anonymize_ip: true,
      send_page_view: false,
    });
    logger?.info?.('GA4 configured', { measurementId });
  } else {
    logger?.debug?.('GA4 disabled because no measurement ID is configured');
  }

  return {
    track,
    pageView,
  };
}

