import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const avatarVariants = cva(
  'relative inline-flex shrink-0 overflow-hidden rounded-full bg-muted',
  {
    variants: {
      size: {
        sm: 'h-6 w-6 text-xs',
        md: 'h-10 w-10 text-sm',
        lg: 'h-14 w-14 text-base',
      },
    },
    defaultVariants: { size: 'md' },
  }
);

export interface AvatarProps
  extends Omit<
      React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
      'children'
    >,
    VariantProps<typeof avatarVariants> {
  src?: string;
  alt?: string;
  fallback: string;
}

/**
 * Avatar - 用户头像（含图片加载失败fallback）
 *
 * 用例：
 *   <Avatar src="/u.jpg" alt="Alice" fallback="A" />
 *   <Avatar size="lg" fallback="Bob" />
 */
export const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ className, size, src, alt, fallback, ...props }, ref) => {
  return (
    <AvatarPrimitive.Root
      ref={ref}
      className={cn(avatarVariants({ size }), className)}
      {...props}
    >
      {src ? (
        <AvatarPrimitive.Image
          src={src}
          alt={alt ?? fallback}
          className="h-full w-full object-cover"
        />
      ) : null}
      <AvatarPrimitive.Fallback
        delayMs={src ? 300 : 0}
        className="flex h-full w-full items-center justify-center font-medium text-muted-foreground"
      >
        {fallback}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
});
Avatar.displayName = 'Avatar';