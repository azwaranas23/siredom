'use client';

import React from 'react';
import { cn } from '@/lib/cn';
import { Button, type ButtonProps } from './button';

interface IconButtonProps extends Omit<ButtonProps, 'children' | 'size'> {
  label: string;
  children: React.ReactNode;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, className, children, ...props },
  ref,
) {
  return (
    <Button
      ref={ref}
      aria-label={label}
      title={label}
      className={cn('size-10 shrink-0 p-0', className)}
      {...props}
    >
      {children}
    </Button>
  );
});
