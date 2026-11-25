import { formatNumber, formatRelativeTime } from '@/lib/format';
import { formatMasteryRank } from '@/lib/mastery';
import type { MasteryStats, ProfileSource } from '@/lib/types';
import { Button, buttonClasses } from './Button';

interface ProfileHeaderProps {
  displayName: string;
  profileRank: number;
  stats: MasteryStats;
  fetchedAt?: number;
  source: ProfileSource | 'share';
  readOnly: boolean;
  sharedAt?: number;
  onCopyShare: () => void;
  onExportMarkdown: () => void;
  onExportJson: () => void;
}

function sourceLabel(source: ProfileSource | 'share', fetchedAt?: number, sharedAt?: number): string {
  if (source === 'demo') return 'Demo profile';
  if (source === 'share') return sharedAt ? `Shared snapshot, ${formatRelativeTime(sharedAt)}` : 'Shared snapshot';
  const when = fetchedAt ? `, loaded ${formatRelativeTime(fetchedAt)}` : '';
  return source === 'fetch' ? `Fetched in this browser${when}` : `Pasted profile${when}`;
}

function closeDetails(event: React.MouseEvent<HTMLButtonElement>) {
  event.currentTarget.closest('details')?.removeAttribute('open');
}

export function ProfileHeader({
  displayName,
  profileRank,
  stats,
  fetchedAt,
  source,
  readOnly,
  sharedAt,
  onCopyShare,
  onExportMarkdown,
  onExportJson,
}: ProfileHeaderProps) {
  const calculatedRank = formatMasteryRank(stats.rank);
  const nextRank = formatMasteryRank(stats.nextRank);
  const rankMismatch = !readOnly && profileRank > 0 && profileRank !== stats.rank;
  const percent = Math.round(stats.progress * 100);
  const initial = displayName.trim().charAt(0).toUpperCase() || 'T';

  return (
    <header className="flex flex-col gap-6 rounded-xl border border-line/10 bg-surface-2/90 p-5 shadow-lg backdrop-blur sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-accent text-3xl font-bold text-accent-contrast shadow-md">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-accent">{sourceLabel(source, fetchedAt, sharedAt)}</p>
          <h1 className="mt-1 truncate text-3xl font-semibold">{displayName}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-accent px-3 py-0.5 font-display text-base font-semibold text-accent-contrast">
              {calculatedRank}
            </span>
            <span className="text-muted">
              {profileRank > 0 ? `In-game ${formatMasteryRank(profileRank)}` : 'In-game rank not in profile'}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 no-print">
          <Button variant="secondary" onClick={onCopyShare}>
            Copy share link
          </Button>
          <details className="relative">
            <summary
              className={buttonClasses('secondary', 'md', 'cursor-pointer list-none [&::-webkit-details-marker]:hidden')}
            >
              Export
            </summary>
            <div className="absolute right-0 z-20 mt-2 w-60 rounded-lg border border-line/15 bg-surface-2 p-1 shadow-lg">
              <button
                type="button"
                onClick={(event) => {
                  closeDetails(event);
                  onExportMarkdown();
                }}
                className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-surface-3"
              >
                Markdown checklist
                <span className="block text-xs text-muted">For Obsidian or any Markdown editor</span>
              </button>
              <button
                type="button"
                onClick={(event) => {
                  closeDetails(event);
                  onExportJson();
                }}
                className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-surface-3"
              >
                JSON snapshot
                <span className="block text-xs text-muted">Every item, total, and source</span>
              </button>
            </div>
          </details>
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
          <span className="text-muted">Progress to {nextRank}</span>
          <span className="font-medium tabular">{formatNumber(stats.pointsToNext)} points to go</span>
        </div>
        <div
          role="progressbar"
          aria-label={`Progress to ${nextRank}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="mt-2 h-3 overflow-hidden rounded-full bg-surface-3"
        >
          <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-2 text-xs tabular text-muted">
          {formatNumber(stats.totalPoints - stats.currentThreshold)} of{' '}
          {formatNumber(stats.nextThreshold - stats.currentThreshold)} points into {calculatedRank}
        </p>
      </div>

      {rankMismatch && (
        <p className="rounded-md border border-gold/40 bg-gold/5 p-3 text-sm text-muted">
          Your in-game rank is {formatMasteryRank(profileRank)}, but the calculated total reaches {calculatedRank}. Check
          the Points tab for sources that are missing from the profile.
        </p>
      )}
      {readOnly && (
        <p className="text-sm text-muted">Read-only snapshot. The data is contained in the link itself.</p>
      )}
    </header>
  );
}
