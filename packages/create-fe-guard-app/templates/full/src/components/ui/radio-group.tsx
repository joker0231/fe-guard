import * as React from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RadioOption {
  value: string;
  label: string;
}

export interface RadioGroupProps {
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  name?: string;
  'aria-label'?: string;
}

export const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  RadioGroupProps
>(({ options, value, onChange, disabled = false, className, name, ...rest }, ref) => {
  return (
    <RadioGroupPrimitive.Root
      ref={ref}
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      name={name}
      aria-label={rest['aria-label']}
      className={cn('grid gap-2', className)}
    >
      {options.map((opt) => {
        const itemId = `${name ?? 'radio'}-${opt.value}`;
        return (
          <div key={opt.value} className="flex items-center space-x-2">
            <RadioGroupPrimitive.Item
              id={itemId}
              value={opt.value}
              disabled={disabled}
              className={cn(
                'aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
            >
              <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
                <Circle aria-hidden="true" className="h-2.5 w-2.5 fill-current text-current" />
              </RadioGroupPrimitive.Indicator>
            </RadioGroupPrimitive.Item>
            <label
              htmlFor={itemId}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {opt.label}
            </label>
          </div>
        );
      })}
    </RadioGroupPrimitive.Root>
  );
});
RadioGroup.displayName = 'RadioGroup';