import { useState } from 'react';

/**
 * Returns a function that, when called with an {@link Error}, causes the
 * nearest `GuardErrorBoundary` to catch it.
 *
 * Internally the hook stores the error in local state.  On the subsequent
 * re-render the stored error is thrown synchronously during render, which
 * React's error-boundary mechanism picks up.
 *
 * ```ts
 * const handleError = useErrorHandler();
 *
 * async function save() {
 *   try { await api.save(); }
 *   catch (err) { handleError(err instanceof Error ? err : new Error(String(err))); }
 * }
 * ```
 */
export function useErrorHandler(): (error: Error) => void {
  const [error, setError] = useState<Error | null>(null);

  if (error) {
    throw error;
  }

  return setError;
}
