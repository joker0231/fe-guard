import * as React from 'react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/**
 * EmptyState - 空数据占位
 *
 * 用例：
 *   <EmptyState icon={<Inbox />} title="暂无数据" description="快去添加第一条吧" action={<Button>新建</Button>} />
 */
export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon, title, description, action, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="status"
        className={cn(
          'flex flex-col items-center justify-center gap-3 p-8 text-center',
          className
        )}
        {...props}
      >
        {icon ? (
          <span aria-hidden="true" className="text-muted-foreground [&_svg]:h-12 [&_svg]:w-12">
            {icon}
          </span>
        ) : null}
        <h3 className="text-lg font-medium text-foreground">{title}</h3>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    );
  }
);
EmptyState.displayName = 'EmptyState';