import { computeItemStates, computeMasteryStats, manualPoints } from '@/lib/mastery';
import { defaultExtras } from '@/lib/storage';
import type { Item, StoredProfile } from '@/lib/types';

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Deterministic demo profile. Roughly a third of items are mastered, a fifth are
 * partially ranked, and the rest are missing. No network requests are made.
 */
export function buildDemoProfile(items: Item[], now = Date.now()): StoredProfile {
  const xp: Record<string, number> = {};

  for (const item of items) {
    const hash = hashString(item.uniqueName);
    const bucket = hash % 100;
    if (bucket < 34) {
      xp[item.uniqueName] = item.maxXp;
    } else if (bucket < 54) {
      const fraction = 0.15 + ((hash >>> 8) % 70) / 100;
      xp[item.uniqueName] = Math.max(1, Math.floor(item.maxXpForPoints * fraction));
    }
  }

  const extras = defaultExtras();
  const states = computeItemStates(items, xp, {});
  const stats = computeMasteryStats(states, extras);

  return {
    version: 1,
    fetchedAt: now,
    source: 'demo',
    displayName: 'Demo Tenno',
    playerLevel: stats.rank,
    xp,
    missions: [],
    intrinsicRanks: 0,
  };
}

export function demoManualPoints(): number {
  return manualPoints(defaultExtras());
}
