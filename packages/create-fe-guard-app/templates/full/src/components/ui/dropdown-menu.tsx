import * as React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';

/**
 * DropdownMenu - 下拉菜单（复合组件）
 *
 * 用例：
 *   <DropdownMenu>
 *     <DropdownMenu.Trigger asChild>
 *       <Button>Menu</Button>
 *     </DropdownMenu.Trigger>
 *     <DropdownMenu.Content>
 *       <DropdownMenu.Item onSelect={handleEdit}>编辑</DropdownMenu.Item>
 *       <DropdownMenu.Item danger onSelect={handleDelete}>删除</DropdownMenu.Item>
 *     </DropdownMenu.Content>
 *   </DropdownMenu>
 */
const DropdownMenuRoot = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = 'DropdownMenu.Content';

export interface DropdownMenuItemProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> {
  danger?: boolean;
}

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  DropdownMenuItemProps
>(({ className, danger = false, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
      'focus:bg-accent focus:text-accent-foreground',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      danger && 'text-destructive focus:bg-destructive focus:text-destructive-foreground',
      className
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = 'DropdownMenu.Item';

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-border', className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = 'DropdownMenu.Separator';

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn('px-2 py-1.5 text-sm font-semibold text-foreground', className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = 'DropdownMenu.Label';

type DropdownMenuComponent = typeof DropdownMenuRoot & {
  Trigger: typeof DropdownMenuTrigger;
  Content: typeof DropdownMenuContent;
  Item: typeof DropdownMenuItem;
  Separator: typeof DropdownMenuSeparator;
  Label: typeof DropdownMenuLabel;
};

export const DropdownMenu = DropdownMenuRoot as DropdownMenuComponent;
DropdownMenu.Trigger = DropdownMenuTrigger;
DropdownMenu.Content = DropdownMenuContent;
DropdownMenu.Item = DropdownMenuItem;
DropdownMenu.Separator = DropdownMenuSeparator;
DropdownMenu.Label = DropdownMenuLabel;