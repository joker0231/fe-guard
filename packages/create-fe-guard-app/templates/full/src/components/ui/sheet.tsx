import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const sheetVariants = cva(
  'fixed z-50 bg-background shadow-lg transition-transform data-[state=open]:animate-in data-[state=closed]:animate-out',
  {
    variants: {
      side: {
        bottom:
          'inset-x-0 bottom-0 max-h-[90vh] rounded-t-lg border-t border-border data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
        right:
          'inset-y-0 right-0 h-full w-3/4 max-w-sm border-l border-border data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right',
      },
    },
    defaultVariants: { side: 'bottom' },
  }
);

/**
 * Sheet - 抽屉（H5 优先底部，桌面可选右侧）
 *
 * 用例：
 *   <Sheet open={open} onOpenChange={setOpen}>
 *     <Sheet.Content>
 *       <Sheet.Title>筛选</Sheet.Title>
 *       <div>内容</div>
 *     </Sheet.Content>
 *   </Sheet>
 */
const SheetRoot = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/50',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
));
SheetOverlay.displayName = 'Sheet.Overlay';

export interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  showClose?: boolean;
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(({ className, side = 'bottom', children, showClose = true, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(sheetVariants({ side }), 'p-6', className)}
      {...props}
    >
      {children}
      {showClose ? (
        <DialogPrimitive.Close
          className={cn(
            'absolute right-4 top-4 rounded-sm opacity-70 transition-opacity',
            'hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring'
          )}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </DialogPrimitive.Close>
      ) : null}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
SheetContent.displayName = 'Sheet.Content';

const SheetHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-1.5 text-left', className)} {...props} />
  )
);
SheetHeader.displayName = 'Sheet.Header';

const SheetFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('mt-4 flex flex-row justify-end gap-2', className)} {...props} />
  )
);
SheetFooter.displayName = 'Sheet.Footer';

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold text-foreground', className)}
    {...props}
  />
));
SheetTitle.displayName = 'Sheet.Title';

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
SheetDescription.displayName = 'Sheet.Description';

type SheetComponent = typeof SheetRoot & {
  Trigger: typeof SheetTrigger;
  Close: typeof SheetClose;
  Content: typeof SheetContent;
  Header: typeof SheetHeader;
  Footer: typeof SheetFooter;
  Title: typeof SheetTitle;
  Description: typeof SheetDescription;
};

export const Sheet = SheetRoot as SheetComponent;
Sheet.Trigger = SheetTrigger;
Sheet.Close = SheetClose;
Sheet.Content = SheetContent;
Sheet.Header = SheetHeader;
Sheet.Footer = SheetFooter;
Sheet.Title = SheetTitle;
Sheet.Description = SheetDescription;