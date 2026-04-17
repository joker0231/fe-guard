import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MultiSelectOption {
  value: string;
  label: string;
}

export interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const MultiSelect = React.forwardRef<HTMLButtonElement, MultiSelectProps>(
  (
    { options, value, onChange, placeholder = 'Select...', disabled = false, className, id },
    ref
  ) => {
    const toggle = (optValue: string) => {
      if (value.includes(optValue)) {
        onChange(value.filter((v) => v !== optValue));
      } else {
        onChange([...value, optValue]);
      }
    };

    const displayText =
      value.length === 0
        ? placeholder
        : value.length === 1
          ? (options.find((o) => o.value === value[0])?.label ?? value[0])
          : `${String(value.length)} selected`;

    return (
      <PopoverPrimitive.Root>
        <PopoverPrimitive.Trigger asChild>
          <button
            ref={ref}
            id={id}
            type="button"
            disabled={disabled}
            className={cn(
              'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              className
            )}
          >
            <span
              className={cn(
                'line-clamp-1 text-left',
                value.length === 0 && 'text-muted-foreground'
              )}
            >
              {displayText}
            </span>
            <ChevronDown aria-hidden="true" className="h-4 w-4 opacity-50" />
          </button>
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="start"
            sideOffset={4}
            className={cn(
              'z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
              'data-[state=open]:animate-in data-[state=closed]:animate-out'
            )}
          >
            <div role="listbox" aria-multiselectable="true">
              {options.map((opt) => {
                const checked = value.includes(opt.value);
                return (
                  <div
                    key={opt.value}
                    role="option"
                    aria-selected={checked}
                    onClick={() => {
                      toggle(opt.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggle(opt.value);
                      }
                    }}
                    tabIndex={0}
                    className={cn(
                      'relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none',
                      'hover:bg-accent hover:text-accent-foreground',
                      'focus:bg-accent focus:text-accent-foreground'
                    )}
                  >
                    <span className="absolute left-2 flex h-4 w-4 items-center justify-center">
                      <CheckboxPrimitive.Root
                        checked={checked}
                        onCheckedChange={() => {
                          toggle(opt.value);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        className={cn(
                          'peer h-4 w-4 shrink-0 rounded-sm border border-primary',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          'data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground'
                        )}
                      >
                        <CheckboxPrimitive.Indicator className="flex items-center justify-center">
                          <Check aria-hidden="true" className="h-3 w-3" />
                        </CheckboxPrimitive.Indicator>
                      </CheckboxPrimitive.Root>
                    </span>
                    <span>{opt.label}</span>
                  </div>
                );
              })}
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    );
  }
);
MultiSelect.displayName = 'MultiSelect';