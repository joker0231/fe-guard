import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  delayDuration?: number;
  sideOffset?: number;
  className?: string;
}

/**
 * Tooltip - 悬浮提示
 *
 * 用例：
 *   <Tooltip content="删除">
 *     <IconButton />
 *   </Tooltip>
 */
export const Tooltip = React.forwardRef<HTMLButtonElement, TooltipProps>(
  ({ content, children, side = 'top', delayDuration = 200, sideOffset = 4, className }, _ref) => {
    return (
      <TooltipPrimitive.Provider delayDuration={delayDuration}>
        <TooltipPrimitive.Root>
          <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
          <TooltipPrimitive.Portal>
            <TooltipPrimitive.Content
              side={side}
              sideOffset={sideOffset}
              className={cn(
                'z-50 overflow-hidden rounded-md border border-border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md',
                'data-[state=delayed-open]:animate-in data-[state=closed]:animate-out',
                'data-[state=closed]:fade-out-0 data-[state=delayed-open]:fade-in-0',
                className
              )}
            >
              {content}
            </TooltipPrimitive.Content>
          </TooltipPrimitive.Portal>
        </TooltipPrimitive.Root>
      </TooltipPrimitive.Provider>
    );
  }
);
Tooltip.displayName = 'Tooltip';