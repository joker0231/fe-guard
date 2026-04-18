import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const spinnerVariants = cva(
  'inline-block animate-spin rounded-full border-current border-t-transparent',
  {
    variants: {
      size: {
        sm: 'h-4 w-4 border-2',
        md: 'h-6 w-6 border-2',
        lg: 'h-10 w-10 border-[3px]',
      },
    },
    defaultVariants: { size: 'md' },
  }
);

export interface LoadingSpinnerProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'>,
    VariantProps<typeof spinnerVariants> {
  label?: string;
}

/**
 * LoadingSpinner - 纯CSS旋转加载指示器
 *
 * 用例：
 *   <LoadingSpinner />
 *   <LoadingSpinner size="lg" label="加载中..." />
 */
export const LoadingSpinner = React.forwardRef<HTMLSpanElement, LoadingSpinnerProps>(
  ({ className, size, label = '加载中', ...props }, ref) => {
    return (
      <span
        ref={ref}
        role="status"
        aria-label={label}
        className={cn(spinnerVariants({ size }), className)}
        {...props}
      >
        <span className="sr-only">{label}</span>
      </span>
    );
  }
);
LoadingSpinner.displayName = 'LoadingSpinner';