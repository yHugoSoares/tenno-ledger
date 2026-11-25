import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface EmptyStateProps {
  title: string;
  description: ReactNode;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, secondaryAction, className }: EmptyStateProps) {
  return (
    <div className={cn('rounded-lg border border-line/10 bg-surface-2 p-6 sm:p-8', className)}>
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-2 max-w-prose text-sm text-muted">{description}</div>
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap gap-3">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
