'use client';

import React, { useId } from 'react';
import { cn } from '@/lib/cn';

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { id, label, error, className, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-xs font-bold text-content-muted">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'min-h-10 w-full rounded-lg border border-border bg-surface-sunken px-3 text-sm font-bold text-content placeholder:text-content-subtle',
          'focus:border-ring',
          error && 'border-danger',
          className,
        )}
        {...props}
      />
      {error && <p id={errorId} className="text-xs text-danger">{error}</p>}
    </div>
  );
});
