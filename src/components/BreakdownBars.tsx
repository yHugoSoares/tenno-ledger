import { SOURCE_COLORS } from '@/lib/categoryColors';
import { formatNumber } from '@/lib/format';
import type { BreakdownRow } from '@/lib/mastery';

interface BreakdownBarsProps {
  rows: BreakdownRow[];
  total: number;
  details: Record<BreakdownRow['id'], string>;
}

export function BreakdownBars({ rows, total, details }: BreakdownBarsProps) {
  const shareOf = (points: number) => (total > 0 ? (points / total) * 100 : 0);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-muted">Share of total</p>
        <div
          role="img"
          aria-label={`Share of ${formatNumber(total)} mastery points by source`}
          className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-surface-3"
        >
          {rows
            .filter((row) => row.points > 0)
            .map((row) => {
              const share = shareOf(row.points);
              return (
                <div
                  key={row.id}
                  className={SOURCE_COLORS[row.id].bar}
                  style={{ width: `${share}%` }}
                  title={`${row.label}: ${share.toFixed(1)}%`}
                />
              );
            })}
        </div>
      </div>

      <ul className="grid gap-3 md:grid-cols-2">
        {rows.map((row) => {
          const color = SOURCE_COLORS[row.id];
          const share = shareOf(row.points);
          return (
            <li key={row.id} className={`rounded-lg border p-4 ${color.soft}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={`font-semibold ${color.text}`}>{row.label}</p>
                  <p className="mt-0.5 truncate text-xs text-muted">{details[row.id]}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-lg font-semibold tabular">{formatNumber(row.points)}</p>
                  <p className="text-xs tabular text-muted">{share.toFixed(1)}%</p>
                </div>
              </div>
              <div
                role="img"
                aria-label={`${row.label}: ${formatNumber(row.points)} points, ${share.toFixed(1)} percent of total`}
                className="mt-3 h-2 overflow-hidden rounded-full bg-surface/70"
              >
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ${color.bar}`}
                  style={{ width: `${share}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
