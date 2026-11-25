import { useCallback, useEffect, useState } from 'react';
import { SHARE_HASH_PREFIX } from '@/lib/constants';
import { decodeShare } from '@/lib/share';
import type { ShareSnapshot } from '@/lib/types';

interface ShareState {
  snapshot: ShareSnapshot | null;
  invalid: boolean;
  clear: () => void;
}

function readHash(): { snapshot: ShareSnapshot | null; invalid: boolean } {
  if (typeof window === 'undefined') return { snapshot: null, invalid: false };
  const hash = window.location.hash;
  if (!hash.startsWith(SHARE_HASH_PREFIX)) return { snapshot: null, invalid: false };
  const snapshot = decodeShare(hash);
  return { snapshot, invalid: snapshot === null };
}

export function useShareSnapshot(): ShareState {
  const [state, setState] = useState(() => readHash());

  useEffect(() => {
    const listener = () => setState(readHash());
    window.addEventListener('hashchange', listener);
    return () => window.removeEventListener('hashchange', listener);
  }, []);

  const clear = useCallback(() => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.pathname}${window.location.search}`;
    window.history.replaceState(null, '', url);
    setState({ snapshot: null, invalid: false });
  }, []);

  return { ...state, clear };
}
