import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';

function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid h-8 w-8 shrink-0 place-items-center rounded-md bg-accent text-accent-contrast shadow-sm',
        className,
      )}
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <path d="M3 14.5h14" />
        <path d="M3 10h9" />
        <path d="M3 5.5h5" />
        <path d="m13 4.5 3.5 3.5L13 11.5" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn('group flex items-center gap-2.5 text-body no-underline', className)}
      aria-label="Tenno Ledger home"
    >
      <LogoMark className="transition-transform duration-300 group-hover:-rotate-3" />
      <span className="font-display text-lg font-semibold leading-none tracking-wide">Tenno Ledger</span>
    </Link>
  );
}
