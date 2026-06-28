import * as React from 'react';
import { cn } from '../../lib/utils';

interface RadioButtonProps extends React.InputHTMLAttributes<HTMLInputElement> {
  checked?: boolean;
  className?: string;
}

const RadioButton = React.forwardRef<HTMLInputElement, RadioButtonProps>(
  ({ className, checked, ...props }, ref) => (
    <input
      type="radio"
      className={cn(
        'peer h-4 w-4 rounded-full border border-primary shadow focus:outline-none focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-white',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);

export default RadioButton;
