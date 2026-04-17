export interface GuardedFetchOptions {
  /** Request timeout in milliseconds. @default 10_000 */
  timeout?: number;
  /** Number of retries on failure. 4xx responses are **never** retried. @default 0 */
  retries?: number;
  /** Base delay between retries in milliseconds. Actual delay = retryDelay * (attempt + 1). @default 1_000 */
  retryDelay?: number;
  /** Called whenever a request fails (after all retries are exhausted). */
  onError?: (error: Error, url: string) => void;
}

const PREFIX = '[GUARD-FETCH]';

/**
 * Creates an enhanced `fetch` function with:
 * - Automatic timeout via `AbortController`
 * - Configurable retry with exponential back-off (4xx responses are never retried)
 * - `onError` callback
 * - Console warnings for non-ok responses
 */
export function createGuardedFetch(options: GuardedFetchOptions = {}): typeof fetch {
  const {
    timeout = 10_000,
    retries = 0,
    retryDelay = 1_000,
    onError,
  } = options;

  async function guardedFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const url = extractUrl(input);
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      // Wait before retry (skip on the first attempt).
      if (attempt > 0) {
        const delay = retryDelay * (attempt + 1);
        await sleep(delay);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Merge caller signal with our timeout signal.
      const callerSignal = init?.signal;
      if (callerSignal?.aborted) {
        clearTimeout(timeoutId);
        const abortErr = new Error(`${PREFIX} Request aborted: ${url}`);
        abortErr.name = 'AbortError';
        throw abortErr;
      }

      // If the caller provides its own signal, forward its abort to our controller.
      let onCallerAbort: (() => void) | undefined;
      if (callerSignal) {
        onCallerAbort = () => controller.abort();
        callerSignal.addEventListener('abort', onCallerAbort, { once: true });
      }

      try {
        const response = await fetch(input, {
          ...init,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          console.warn(
            `${PREFIX} Non-ok response: ${response.status} ${response.statusText} for ${url}`,
          );

          // Never retry 4xx client errors.
          if (response.status >= 400 && response.status < 500) {
            return response;
          }

          // For 5xx, treat as retriable error.
          if (attempt < retries) {
            lastError = new Error(
              `${PREFIX} HTTP ${response.status} ${response.statusText} for ${url}`,
            );
            continue;
          }
        }

        return response;
      } catch (err) {
        clearTimeout(timeoutId);

        // If the *caller* aborted, propagate immediately (no retry).
        if (callerSignal?.aborted) {
          const abortErr = new Error(`${PREFIX} Request aborted: ${url}`);
          abortErr.name = 'AbortError';
          throw abortErr;
        }

        // Our own timeout triggered an AbortError.
        if (
          err instanceof DOMException && err.name === 'AbortError' ||
          (err instanceof Error && err.name === 'AbortError')
        ) {
          lastError = new Error(`${PREFIX} Request timeout after ${timeout}ms: ${url}`);
          lastError.name = 'TimeoutError';

          // Don't retry timeout by default -- but honour retry count.
          if (attempt < retries) {
            continue;
          }
        } else {
          lastError = err instanceof Error ? err : new Error(String(err));

          if (attempt < retries) {
            continue;
          }
        }
      } finally {
        if (callerSignal && onCallerAbort) {
          callerSignal.removeEventListener('abort', onCallerAbort);
        }
      }
    }

    // All attempts exhausted.
    const finalError = lastError ?? new Error(`${PREFIX} Request failed: ${url}`);
    console.error(`${PREFIX} Request failed after ${retries + 1} attempt(s): ${url}`, finalError);
    onError?.(finalError, url);
    throw finalError;
  }

  return guardedFetch as typeof fetch;
}

/* ---------- helpers ---------- */

function extractUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
