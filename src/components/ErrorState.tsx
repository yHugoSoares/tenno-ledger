import type { ReactNode } from 'react';

interface ErrorStateProps {
  title: string;
  message: ReactNode;
  details?: string;
  actions?: ReactNode;
}

export function ErrorState({ title, message, details, actions }: ErrorStateProps) {
  return (
    <div role="alert" className="rounded-lg border border-rose-500/40 bg-surface-2 p-6 sm:p-8">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-2 max-w-prose text-sm text-muted">{message}</div>
      {details && (
        <details className="mt-4 text-xs text-muted">
          <summary className="cursor-pointer font-medium text-body">Technical details</summary>
          <pre className="mt-2 whitespace-pre-wrap break-words font-mono">{details}</pre>
        </details>
      )}
      {actions && <div className="mt-5 flex flex-wrap gap-3">{actions}</div>}
    </div>
  );
}
