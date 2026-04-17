import React, { Component, type ErrorInfo, type ReactNode } from 'react';

export interface GuardErrorBoundaryProps {
  children: ReactNode;
  /** Static fallback node, or render function receiving the caught error and a reset callback. */
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  /** Called after an error is caught by componentDidCatch. */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /**
   * When any value in this array changes between renders the error state
   * is automatically cleared, allowing the children to re-mount.
   */
  resetKeys?: unknown[];
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const PREFIX = '[GUARD-EB]';

export class GuardErrorBoundary extends Component<GuardErrorBoundaryProps, State> {
  private prevResetKeys: unknown[] | undefined;

  constructor(props: GuardErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
    this.prevResetKeys = props.resetKeys;
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(`${PREFIX} Caught error:`, error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: Readonly<GuardErrorBoundaryProps>): void {
    const { resetKeys } = this.props;

    if (!this.state.hasError || !resetKeys) {
      // Keep prevResetKeys in sync even when there is no error so that the
      // comparison works correctly when an error eventually occurs.
      this.prevResetKeys = resetKeys;
      return;
    }

    const prev = this.prevResetKeys;
    if (prev && resetKeys.length === prev.length && resetKeys.every((k, i) => Object.is(k, prev[i]))) {
      return;
    }

    console.info(`${PREFIX} resetKeys changed, resetting error boundary.`);
    this.reset();
  }

  /** Imperatively clear the error state so children re-mount. */
  reset = (): void => {
    this.prevResetKeys = this.props.resetKeys;
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      // Render-function fallback
      if (typeof fallback === 'function') {
        return fallback(error, this.reset);
      }

      // Static ReactNode fallback
      if (fallback !== undefined) {
        return fallback;
      }

      // Default fallback UI
      return <DefaultFallback error={error} onReset={this.reset} />;
    }

    return children;
  }
}

/* ---------- Default Fallback ---------- */

interface DefaultFallbackProps {
  error: Error;
  onReset: () => void;
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '32px 24px',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  color: '#333',
  backgroundColor: '#fafafa',
  border: '1px solid #e8e8e8',
  borderRadius: '8px',
  maxWidth: '480px',
  margin: '24px auto',
  textAlign: 'center' as const,
};

const titleStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 600,
  marginBottom: '8px',
};

const messageStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#888',
  marginBottom: '16px',
  wordBreak: 'break-word',
};

const buttonStyle: React.CSSProperties = {
  padding: '8px 24px',
  fontSize: '14px',
  color: '#fff',
  backgroundColor: '#1677ff',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
};

function DefaultFallback({ error, onReset }: DefaultFallbackProps) {
  return (
    <div style={containerStyle}>
      <div style={titleStyle}>页面出现问题</div>
      <div style={messageStyle}>{error.message}</div>
      <button type="button" style={buttonStyle} onClick={onReset}>
        重试
      </button>
    </div>
  );
}
