export interface GlobalHandlerOptions {
  /** Called for every captured error. */
  onError?: (error: Error, context: string) => void;
  /** If provided, error reports are sent to this URL via `navigator.sendBeacon`. */
  reportUrl?: string;
  /** Whether to log errors to the console. @default true */
  enableConsole?: boolean;
}

const PREFIX = '[GUARD-GLOBAL]';

/**
 * Installs global error handlers for:
 * - Synchronous errors (`window.onerror`)
 * - Unhandled promise rejections (`unhandledrejection`)
 * - Resource load failures (`error` event in capture phase)
 *
 * Returns a cleanup function that removes **all** installed handlers and
 * restores the previous `window.onerror`.
 */
export function installGlobalHandler(options: GlobalHandlerOptions = {}): () => void {
  const { onError, reportUrl, enableConsole = true } = options;

  // ---- helpers ----

  function report(error: Error, context: string): void {
    if (enableConsole) {
      console.error(`${PREFIX} [${context}]`, error);
    }

    onError?.(error, context);

    if (reportUrl && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      try {
        const payload = JSON.stringify({
          message: error.message,
          stack: error.stack,
          context,
          timestamp: Date.now(),
        });
        navigator.sendBeacon(reportUrl, payload);
      } catch {
        // Silently swallow serialization / beacon failures.
      }
    }
  }

  // ---- window.onerror (sync errors) ----

  const prevOnError = window.onerror;

  window.onerror = (
    message: string | Event,
    source?: string,
    lineno?: number,
    colno?: number,
    error?: Error,
  ) => {
    const err =
      error ??
      new Error(typeof message === 'string' ? message : 'Unknown error');
    report(err, 'window.onerror');

    // Call the previous handler if present.
    if (typeof prevOnError === 'function') {
      return prevOnError(message, source, lineno, colno, error);
    }
  };

  // ---- unhandledrejection ----

  function handleRejection(event: PromiseRejectionEvent): void {
    const reason = event.reason;
    const err =
      reason instanceof Error ? reason : new Error(String(reason ?? 'Unhandled promise rejection'));
    report(err, 'unhandledrejection');
  }

  window.addEventListener('unhandledrejection', handleRejection);

  // ---- resource load errors (capture phase) ----

  function handleResourceError(event: Event): void {
    const target = event.target as EventTarget | null;

    // Only handle resource load errors, not general JS errors.
    if (
      target &&
      target !== window &&
      (target instanceof HTMLScriptElement ||
        target instanceof HTMLLinkElement ||
        target instanceof HTMLImageElement ||
        target instanceof HTMLAudioElement ||
        target instanceof HTMLVideoElement)
    ) {
      const src =
        (target as HTMLScriptElement | HTMLImageElement).src ??
        (target as HTMLLinkElement).href ??
        'unknown';
      const tagName = target.tagName?.toLowerCase() ?? 'unknown';
      const err = new Error(`${PREFIX} Resource load failed: <${tagName}> ${src}`);
      report(err, 'resource-error');
    }
  }

  window.addEventListener('error', handleResourceError, true);

  // ---- cleanup ----

  let cleaned = false;

  return function cleanup(): void {
    if (cleaned) return;
    cleaned = true;

    window.onerror = prevOnError;
    window.removeEventListener('unhandledrejection', handleRejection);
    window.removeEventListener('error', handleResourceError, true);
  };
}
