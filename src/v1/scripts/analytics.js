/**
 * Minimal GA4-compatible analytics shim.
 * When a measurement ID is supplied, the app pushes events into
 * the standard dataLayer. Without an ID, the calls become a no-op
 * beyond optional debug logging.
 */

/**
 * Configure the analytics bridge.
 * @param {object} options
 * @param {string | null | undefined} [options.measurementId]
 * @param {ReturnType<import('./logger.js').createLogger>} [options.logger]
 */
export function configureAnalytics({ measurementId, logger } = {}) {
  const dataLayer = (globalThis.dataLayer = globalThis.dataLayer || []);

  /**
   * Push an event into the data layer.
   * @param {string} eventName
   * @param {Record<string, unknown>} [params={}]
   */
  const track = (eventName, params = {}) => {
    const payload = {
      ...params,
      page_path: globalThis.location?.hash || '/',
      page_title: document.title,
    };

    globalThis.gtag?.('event', eventName, payload);
    dataLayer.push({
      event: eventName,
      ...payload,
    });

    logger?.debug?.(`analytics:${eventName}`, payload);
  };

  if (measurementId) {
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
    logger?.info?.('GA4 placeholder configured', { measurementId });
  } else {
    logger?.debug?.('GA4 placeholder skipped because no measurement ID is configured');
  }

  return { track };
}

