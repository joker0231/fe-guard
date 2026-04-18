import * as React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Toaster - 全局轻提示
 *
 * 使用步骤：
 * 1. 在应用根部放置 <Toaster />
 * 2. 任何位置调用 toast.success('保存成功') / toast.error('失败') / toast.info(...) / toast.warning(...)
 */

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: number;
  message: React.ReactNode;
  variant: ToastVariant;
  duration: number;
}

type Listener = (items: readonly ToastItem[]) => void;

// 简单的模块级store，避免引入额外的状态管理依赖
const toastStore = (() => {
  let items: ToastItem[] = [];
  const listeners = new Set<Listener>();
  let nextId = 1;

  const notify = (): void => {
    listeners.forEach((l) => l(items));
  };

  const push = (variant: ToastVariant, message: React.ReactNode, duration = 3000): number => {
    const id = nextId++;
    items = [...items, { id, message, variant, duration }];
    notify();
    return id;
  };

  const dismiss = (id: number): void => {
    items = items.filter((t) => t.id !== id);
    notify();
  };

  const subscribe = (l: Listener): (() => void) => {
    listeners.add(l);
    l(items);
    return () => {
      listeners.delete(l);
    };
  };

  return { push, dismiss, subscribe };
})();

export const toast = {
  success: (message: React.ReactNode, duration?: number): number =>
    toastStore.push('success', message, duration),
  error: (message: React.ReactNode, duration?: number): number =>
    toastStore.push('error', message, duration),
  info: (message: React.ReactNode, duration?: number): number =>
    toastStore.push('info', message, duration),
  warning: (message: React.ReactNode, duration?: number): number =>
    toastStore.push('warning', message, duration),
  dismiss: (id: number): void => toastStore.dismiss(id),
};

const toastVariants = cva(
  'pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-md border p-4 pr-8 shadow-lg',
  {
    variants: {
      variant: {
        success: 'border-success/40 bg-success/10 text-success-foreground',
        error: 'border-destructive/40 bg-destructive/10 text-destructive-foreground',
        info: 'border-border bg-background text-foreground',
        warning: 'border-warning/40 bg-warning/10 text-warning-foreground',
      },
    },
    defaultVariants: { variant: 'info' },
  }
);

interface ToastRenderProps extends VariantProps<typeof toastVariants> {
  item: ToastItem;
  onDismiss: (id: number) => void;
}

function ToastRender({ item, onDismiss }: ToastRenderProps): React.ReactElement {
  return (
    <ToastPrimitive.Root
      duration={item.duration}
      onOpenChange={(open) => {
        if (!open) onDismiss(item.id);
      }}
      className={cn(
        toastVariants({ variant: item.variant }),
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:slide-in-from-bottom'
      )}
    >
      <ToastPrimitive.Description className="flex-1 text-sm">
        {item.message}
      </ToastPrimitive.Description>
      <ToastPrimitive.Close
        aria-label="Close"
        className="absolute right-2 top-2 rounded-sm opacity-70 transition-opacity hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  );
}

export function Toaster(): React.ReactElement {
  const [items, setItems] = React.useState<readonly ToastItem[]>([]);

  React.useEffect(() => toastStore.subscribe(setItems), []);

  return (
    <ToastPrimitive.Provider swipeDirection="down">
      {items.map((item) => (
        <ToastRender key={item.id} item={item} onDismiss={toastStore.dismiss} />
      ))}
      <ToastPrimitive.Viewport className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col gap-2 p-4 sm:bottom-4 sm:right-4 sm:max-w-sm" />
    </ToastPrimitive.Provider>
  );
}