import { useRef, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';

export interface TabDefinition {
  id: string;
  label: string;
  /** Optional progress shown as "mastered/count". */
  count?: number;
  mastered?: number;
}

interface TabsProps {
  tabs: TabDefinition[];
  active: string;
  onChange: (id: string) => void;
  label?: string;
  idPrefix?: string;
}

export function Tabs({ tabs, active, onChange, label = 'Sections', idPrefix = 'tab' }: TabsProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function focusTab(index: number) {
    const tab = tabs[index];
    if (!tab) return;
    onChange(tab.id);
    refs.current[index]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusTab((index + 1) % tabs.length);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusTab((index - 1 + tabs.length) % tabs.length);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusTab(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusTab(tabs.length - 1);
    }
  }

  return (
    <div role="tablist" aria-label={label} className="no-scrollbar flex gap-1 overflow-x-auto border-b border-line/10">
      {tabs.map((tab, index) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="button"
            role="tab"
            id={`${idPrefix}-${tab.id}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              '-mb-px flex shrink-0 items-baseline gap-2 whitespace-nowrap rounded-t-md border-b-2 px-4 pb-3 pt-2 text-sm transition-colors',
              selected
                ? 'border-accent bg-accent/10 font-semibold text-body'
                : 'border-transparent text-muted hover:bg-surface-3/60 hover:text-body',
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs tabular',
                  selected ? 'bg-accent text-accent-contrast' : 'bg-surface-3 text-muted',
                )}
              >
                {tab.mastered !== undefined ? `${tab.mastered}/${tab.count}` : tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
