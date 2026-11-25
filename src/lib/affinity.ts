import type { Item } from './types';

const OVERLEVEL_WEAPON_AFFINITY: Record<number, number> = {
  31: 930_500,
  32: 962_000,
  33: 1_506_500,
  34: 1_540_000,
  35: 2_152_500,
  36: 2_188_000,
  37: 2_872_500,
  38: 2_910_000,
  39: 3_670_500,
  40: 3_710_000,
};

const NECRAMECH_AFFINITY: Record<number, number> = {
  31: 1_861_000,
  32: 1_924_000,
  33: 3_013_000,
  34: 3_080_000,
  35: 4_305_000,
  36: 4_376_000,
  37: 5_745_000,
  38: 5_820_000,
  39: 7_341_000,
  40: 7_420_000,
};

export function affinityForRank(
  rank: number,
  item: Pick<Item, 'affinityBase' | 'isRank40' | 'kind'>,
): number {
  const safeRank = Math.max(0, Math.floor(rank));
  if (safeRank <= 30) return item.affinityBase * safeRank * safeRank;
  if (item.kind === 'necramech') return NECRAMECH_AFFINITY[safeRank] ?? NECRAMECH_AFFINITY[40]!;
  if (item.isRank40) return OVERLEVEL_WEAPON_AFFINITY[safeRank] ?? OVERLEVEL_WEAPON_AFFINITY[40]!;
  return item.affinityBase * 30 * 30;
}

export function rankForAffinity(
  affinity: number,
  item: Pick<Item, 'affinityBase' | 'isRank40' | 'kind' | 'maxRank'>,
): number {
  if (!Number.isFinite(affinity) || affinity <= 0) return 0;
  for (let rank = 1; rank <= item.maxRank; rank += 1) {
    if (affinity < affinityForRank(rank, item)) return rank - 1;
  }
  return item.maxRank;
}
