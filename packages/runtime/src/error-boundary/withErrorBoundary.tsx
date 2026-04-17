import React from 'react';
import { GuardErrorBoundary, type GuardErrorBoundaryProps } from './GuardErrorBoundary';

/**
 * Higher-order component that wraps `Component` with a {@link GuardErrorBoundary}.
 *
 * ```tsx
 * const SafePage = withErrorBoundary(Page, { onError: reportError });
 * ```
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<GuardErrorBoundaryProps, 'children'>,
): React.FC<P> {
  const Wrapped: React.FC<P> = (props) => (
    <GuardErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </GuardErrorBoundary>
  );

  const displayName = Component.displayName || Component.name || 'Component';
  Wrapped.displayName = `withErrorBoundary(${displayName})`;

  return Wrapped;
}
