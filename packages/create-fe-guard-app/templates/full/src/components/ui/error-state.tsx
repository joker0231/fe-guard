import * as React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  message: string;
  retry?: () => void;
  retryLabel?: string;
}

/**
 * ErrorState - 错误状态展示（含重试按钮）
 *
 * 用例：
 *   <ErrorState message="加载失败" retry={refetch} />
 */
export const ErrorState = React.forwardRef<HTMLDivElement, ErrorStateProps>(
  ({ title = '出错了', message, retry, retryLabel = '重试', className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          'flex flex-col items-center justify-center gap-3 p-8 text-center',
          className
        )}
        {...props}
      >
        <AlertCircle aria-hidden="true" className="h-12 w-12 text-destructive" />
        <h3 className="text-lg font-medium text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{message}</p>
        {retry ? (
          <button
            type="button"
            onClick={retry}
            className={cn(
              'mt-2 inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors',
              'bg-primary text-primary-foreground hover:bg-primary/90',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
          >
            {retryLabel}
          </button>
        ) : null}
      </div>
    );
  }
);
ErrorState.displayName = 'ErrorState';