const numberFormatter = new Intl.NumberFormat('en-US');

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return numberFormatter.format(Math.round(value));
}

export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPercent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatDate(timestamp: number): string {
  if (!Number.isFinite(timestamp)) return '—';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}

/** A short month and year, for example "Aug 2017". */
export function formatMonthYear(timestamp: number): string {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return 'unknown date';
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(timestamp),
  );
}

/**
 * Whole calendar years and months between a timestamp and now, for example "8y 2mo".
 * Uses UTC so the result does not shift with the visitor's timezone.
 */
export function formatElapsed(timestamp: number, now = Date.now()): string {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return 'an unknown time';
  if (now <= timestamp) return 'today';

  const then = new Date(timestamp);
  const current = new Date(now);
  let years = current.getUTCFullYear() - then.getUTCFullYear();
  let months = current.getUTCMonth() - then.getUTCMonth();
  let days = current.getUTCDate() - then.getUTCDate();

  if (days < 0) {
    months -= 1;
    const daysInPreviousMonth = new Date(
      Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), 0),
    ).getUTCDate();
    days += daysInPreviousMonth;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years > 0 && months > 0) return `${years}y ${months}mo`;
  if (years > 0) return `${years}y`;
  if (months > 0) return `${months}mo`;
  const totalDays = Math.max(0, Math.floor((now - timestamp) / 86_400_000));
  if (totalDays > 0) return `${totalDays}d`;
  return 'today';
}

export function formatRelativeTime(timestamp: number, now = Date.now()): string {
  const diff = Math.max(0, now - timestamp);
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(timestamp);
}

export function formatCooldown(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return 'Ready';
  const totalMinutes = Math.ceil(ms / 60_000);
  if (totalMinutes < 1) return 'less than a minute';
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}
