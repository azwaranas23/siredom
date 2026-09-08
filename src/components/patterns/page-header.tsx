import React from 'react';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/card';

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, meta, actions, className }: PageHeaderProps) {
  return (
    <Card className={cn('flex flex-wrap items-center justify-between gap-4', className)}>
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 font-display text-xl font-extrabold text-content">{title}</h1>
        {description && <div className="mt-1 text-sm text-content-muted">{description}</div>}
        {meta && <div className="mt-2 font-mono text-xs text-content-muted">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </Card>
  );
}
