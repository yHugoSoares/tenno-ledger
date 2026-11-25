import { useEffect, useState } from 'react';
import { PROFILE_TTL_MS } from '@/lib/constants';
import { cacheRemainingMs } from '@/lib/profile';

export function useCooldown(fetchedAt: number | undefined): number {
  const [remaining, setRemaining] = useState(() =>
    fetchedAt === undefined ? 0 : cacheRemainingMs(fetchedAt, Date.now(), PROFILE_TTL_MS),
  );

  useEffect(() => {
    if (fetchedAt === undefined) {
      setRemaining(0);
      return;
    }
    const update = () => setRemaining(cacheRemainingMs(fetchedAt, Date.now(), PROFILE_TTL_MS));
    update();
    const interval = window.setInterval(update, 30_000);
    return () => window.clearInterval(interval);
  }, [fetchedAt]);

  return remaining;
}
