/**
 * Structured logger used across the site.
 * It mirrors important events to the console in debug mode and
 * persists a short trail to the app storage layer for diagnostics.
 */

/**
 * @typedef {Object} LoggerOptions
 * @property {boolean} [debug=false]
 * @property {{ appendLog?: (entry: any) => Promise<void> }} [storage]
 */

/**
 * Create a scoped logger.
 * @param {string} scope
 * @param {LoggerOptions} [options]
 */
export function createLogger(scope, options = {}) {
  const debug = Boolean(options.debug);
  const storage = options.storage ?? null;
  const prefix = `[KyleRode:${scope}]`;

  /**
   * Write a log entry.
   * @param {'debug'|'info'|'warn'|'error'} level
   * @param {string} message
   * @param {unknown} [details]
   */
  const write = async (level, message, details) => {
    const entry = {
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: new Date().toISOString(),
      scope,
      level,
      message,
      details,
    };

    if (debug || level === 'warn' || level === 'error') {
      const method = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
      if (details !== undefined) {
        console[method](prefix, message, details);
      } else {
        console[method](prefix, message);
      }
    }

    if (storage?.appendLog) {
      try {
        await storage.appendLog(entry);
      } catch {
        // Logging must never interfere with the user flow.
      }
    }

    return entry;
  };

  return {
    debug(message, details) {
      if (debug) void write('debug', message, details);
    },
    info(message, details) {
      void write('info', message, details);
    },
    warn(message, details) {
      void write('warn', message, details);
    },
    error(message, details) {
      void write('error', message, details);
    },
    event(name, details) {
      void write('info', `event:${name}`, details);
    },
  };
}

/**
 * Install global error handlers that route into the logger.
 * @param {ReturnType<typeof createLogger>} logger
 */
export function installGlobalErrorHandlers(logger) {
  globalThis.addEventListener('error', (event) => {
    logger.error('Unhandled error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  globalThis.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled rejection', {
      reason: String(event.reason ?? 'Unknown rejection'),
    });
  });
}

