import type { RefObject } from 'react';
import { formatNumber } from '@/lib/format';

export type MasteryFilter = 'all' | 'mastered' | 'missing';
export type SortMode = 'points' | 'mr' | 'closeness';

interface FiltersProps {
  search: string;
  onSearch: (value: string) => void;
  masteryFilter: MasteryFilter;
  onMasteryFilter: (value: MasteryFilter) => void;
  sort: SortMode;
  onSort: (value: SortMode) => void;
  resultCount: number;
  totalCount: number;
  searchRef?: RefObject<HTMLInputElement | null>;
}

export function Filters({
  search,
  onSearch,
  masteryFilter,
  onMasteryFilter,
  sort,
  onSort,
  resultCount,
  totalCount,
  searchRef,
}: FiltersProps) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_13rem]">
        <div>
          <label htmlFor="item-search" className="sr-only">
            Search items
          </label>
          <input
            id="item-search"
            ref={searchRef}
            type="search"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search by name, type, or category"
            className="field"
          />
        </div>
        <div>
          <label htmlFor="item-status" className="sr-only">
            Status
          </label>
          <select
            id="item-status"
            value={masteryFilter}
            onChange={(event) => onMasteryFilter(event.target.value as MasteryFilter)}
            className="field"
          >
            <option value="all">All items</option>
            <option value="mastered">Mastered</option>
            <option value="missing">Not mastered</option>
          </select>
        </div>
        <div>
          <label htmlFor="item-sort" className="sr-only">
            Sort by
          </label>
          <select
            id="item-sort"
            value={sort}
            onChange={(event) => onSort(event.target.value as SortMode)}
            className="field"
          >
            <option value="points">Sort: points</option>
            <option value="mr">Sort: rank requirement</option>
            <option value="closeness">Sort: closest to mastered</option>
          </select>
        </div>
      </div>
      <p className="text-sm text-muted" aria-live="polite">
        Showing {formatNumber(resultCount)} of {formatNumber(totalCount)} items
        {search ? ` matching “${search}”` : ''}.
      </p>
    </div>
  );
}
