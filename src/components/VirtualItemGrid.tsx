import { useEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ItemState } from '@/lib/types';
import { ItemCard } from './ItemCard';

interface VirtualItemGridProps {
  items: ItemState[];
  readOnly?: boolean;
  onOverride?: (uniqueName: string, value: boolean | undefined) => void;
  labelledBy?: string;
}

const GAP = 12;
const MIN_CARD_WIDTH = 290;
const ROW_HEIGHT = 128 + GAP;

export function VirtualItemGrid({ items, readOnly = false, onOverride, labelledBy }: VirtualItemGridProps) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const [columns, setColumns] = useState(1);

  useEffect(() => {
    const element = parentRef.current;
    if (!element) return;
    const update = () => {
      const width = element.clientWidth;
      setColumns(Math.max(1, Math.floor((width + GAP) / (MIN_CARD_WIDTH + GAP))));
    };
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const rowCount = Math.ceil(items.length / columns);
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 4,
  });

  return (
    <div
      ref={parentRef}
      role="region"
      aria-labelledby={labelledBy}
      tabIndex={0}
      className="max-h-[70vh] overflow-y-auto overscroll-contain rounded-lg p-1"
    >
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((row) => {
          const rowItems = items.slice(row.index * columns, row.index * columns + columns);
          return (
            <div
              key={row.key}
              className="absolute left-0 top-0 w-full"
              style={{ height: ROW_HEIGHT, transform: `translateY(${row.start}px)` }}
            >
              <div className="grid h-[128px] gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
                {rowItems.map((state) => (
                  <ItemCard
                    key={state.item.uniqueName}
                    state={state}
                    readOnly={readOnly}
                    onOverride={(value) => onOverride?.(state.item.uniqueName, value)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
