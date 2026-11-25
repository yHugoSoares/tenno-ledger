import { useState } from 'react';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { PLACEHOLDER_IMAGE } from '@/lib/items';
import { SOURCE_COLORS } from '@/lib/categoryColors';
import type { ItemState } from '@/lib/types';
import { CheckIcon } from './Icons';

interface ItemCardProps {
  state: ItemState;
  readOnly?: boolean;
  onOverride?: (value: boolean | undefined) => void;
}

export function ItemCard({ state, readOnly = false, onOverride }: ItemCardProps) {
  const { item } = state;
  const [imageFailed, setImageFailed] = useState(false);
  const color = SOURCE_COLORS[item.tab];
  const percent = item.points > 0 ? Math.round(Math.min(1, state.points / item.points) * 100) : 0;
  const status = state.mastered ? 'Mastered' : state.points > 0 ? 'In progress' : 'Not started';
  const overrideValue = state.override === undefined ? 'auto' : state.override ? 'mastered' : 'missing';

  return (
    <article
      className={cn(
        'flex h-full gap-3 rounded-lg border p-3 transition-[border-color,box-shadow] duration-200',
        state.mastered
          ? 'border-gold/50 bg-gold/5'
          : 'border-line/10 bg-surface-2 hover:border-line/25 hover:shadow-sm',
      )}
    >
      <div className={cn('relative flex h-20 w-20 shrink-0 items-center justify-center rounded-md border', color.soft)}>
        <img
          src={imageFailed ? PLACEHOLDER_IMAGE : (item.imageUrl ?? PLACEHOLDER_IMAGE)}
          alt=""
          loading="lazy"
          decoding="async"
          width={72}
          height={72}
          onError={() => setImageFailed(true)}
          className="h-full w-full object-contain p-1"
        />
        {state.mastered && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-accent-contrast">
            <CheckIcon className="h-3 w-3" strokeWidth={3} />
            <span className="sr-only">Mastered</span>
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate text-sm font-medium" title={item.name}>
          {item.name}
        </p>
        <p className={cn('truncate text-xs', color.text)}>
          {item.type} · MR {item.masteryReq}
        </p>

        <div className="mt-auto pt-2">
          <div className="flex items-center justify-between text-xs tabular">
            <span>
              Rank {state.rank}/{item.maxRank}
            </span>
            <span className="text-muted">
              {formatNumber(state.points)}/{formatNumber(item.points)} pts
            </span>
          </div>
          <div
            role="progressbar"
            aria-label={`${item.name} progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3"
          >
            <div
              className={cn('h-full rounded-full transition-[width] duration-500', state.mastered ? 'bg-gold' : color.bar)}
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-xs text-muted">{status}</span>
            {readOnly ? (
              state.override !== undefined ? (
                <span className="text-xs text-muted">Manual</span>
              ) : null
            ) : (
              <select
                aria-label={`Override for ${item.name}`}
                value={overrideValue}
                onChange={(event) => {
                  const value = event.target.value;
                  onOverride?.(value === 'auto' ? undefined : value === 'mastered');
                }}
                className="field h-7 w-auto px-1.5 text-xs"
              >
                <option value="auto">Auto</option>
                <option value="mastered">Mastered</option>
                <option value="missing">Not mastered</option>
              </select>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
