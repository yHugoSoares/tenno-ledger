import { useCallback, useEffect, useRef, useState } from 'react';
import { loadItems, type LoadedItems } from '@/lib/data';
import type { Item } from '@/lib/types';

interface ItemDataState {
  items: Item[];
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  source: LoadedItems['source'] | null;
  warning: string | null;
  reload: (force?: boolean) => void;
}

export function useItemData(): ItemDataState {
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<LoadedItems['source'] | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async (force = false) => {
    const current = requestId.current + 1;
    requestId.current = current;
    setStatus('loading');
    setError(null);
    try {
      const loaded = await loadItems({ force });
      if (requestId.current !== current) return;
      setItems(loaded.items);
      setSource(loaded.source);
      setWarning(loaded.warning ?? null);
      setStatus('ready');
    } catch (loadError) {
      if (requestId.current !== current) return;
      setError(loadError instanceof Error ? loadError.message : 'Could not load item data.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  const reload = useCallback(
    (force = false) => {
      void load(force);
    },
    [load],
  );

  return { items, status, error, source, warning, reload };
}
