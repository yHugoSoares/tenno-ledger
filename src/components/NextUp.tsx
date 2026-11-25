import { useMemo } from 'react';
import { formatMasteryRank } from '@/lib/mastery';
import type { ItemState } from '@/lib/types';
import { Button } from './Button';
import { ItemCard } from './ItemCard';

interface NextUpProps {
  states: ItemState[];
  rank: number;
  onViewAll: () => void;
  limit?: number;
}

export function NextUp({ states, rank, onViewAll, limit = 9 }: NextUpProps) {
  const suggestions = useMemo(() => {
    return states
      .filter((state) => !state.mastered && state.item.masteryReq <= rank)
      .sort((a, b) => {
        const remaining = a.remainingXp - b.remainingXp;
        if (remaining !== 0) return remaining;
        return b.item.points - a.item.points;
      })
      .slice(0, limit);
  }, [states, rank, limit]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Closest to mastered</h2>
          <p className="mt-1 text-sm text-muted">
            Missing items you can equip at {formatMasteryRank(rank)}, sorted by the affinity still needed.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={onViewAll}>
          See every missing item
        </Button>
      </div>

      {suggestions.length === 0 ? (
        <p className="rounded-lg border border-line/10 bg-surface-2 p-6 text-sm text-muted">
          Nothing missing at this rank. Raise your rank to unlock more items.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {suggestions.map((state) => (
            <div key={state.item.uniqueName} className="h-[128px]">
              <ItemCard state={state} readOnly />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
