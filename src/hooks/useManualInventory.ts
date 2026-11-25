import { useCallback, useState } from 'react';
import {
  loadManualInventory,
  saveManualInventory,
  setInventoryCount,
  type ManualInventory,
} from '@/lib/inventory';

export function useManualInventory(): [ManualInventory, (name: string, count: number) => void] {
  const [inventory, setInventory] = useState<ManualInventory>(() => loadManualInventory());

  const update = useCallback((name: string, count: number) => {
    setInventory((current) => {
      const next = setInventoryCount(current, name, count);
      saveManualInventory(next);
      return next;
    });
  }, []);

  return [inventory, update];
}
