import type {
  Item,
  ItemState,
  ManualExtras,
  MasteryStats,
  MissionProgress,
  Overrides,
  TabId,
} from './types';
import { calculateMissionBreakdown, intrinsicPointsFromRanks } from './missions';
import { rankForAffinity } from './affinity';

export const JUNCTION_POINTS = 1_000;
export const INTRINSIC_POINTS = 1_500;

/** Total mastery points needed to reach rank N: 2500 × N². */
export function pointsForRank(rank: number): number {
  const safeRank = Math.max(0, Math.floor(rank));
  return 2_500 * safeRank * safeRank;
}

/** The highest rank fully covered by the given mastery points. */
export function rankForPoints(points: number): number {
  if (!Number.isFinite(points) || points <= 0) return 0;
  return Math.floor(Math.sqrt(points / 2_500));
}

export function pointsToNextRank(points: number): number {
  const rank = rankForPoints(points);
  return Math.max(0, pointsForRank(rank + 1) - points);
}

export function progressToNextRank(points: number): number {
  const rank = rankForPoints(points);
  const current = pointsForRank(rank);
  const next = pointsForRank(rank + 1);
  if (next <= current) return 1;
  return Math.min(1, Math.max(0, (points - current) / (next - current)));
}

export function formatMasteryRank(rank: number): string {
  if (rank > 30) return `LR ${rank - 30}`;
  return `MR ${rank}`;
}

export function masteryRankName(rank: number): string {
  if (rank > 30) return `Legendary ${rank - 30}`;
  return `Mastery Rank ${rank}`;
}

export function rankFromXp(xp: number, item: Pick<Item, 'affinityBase' | 'maxRank'>): number {
  if (!Number.isFinite(xp) || xp <= 0) return 0;
  return rankForAffinity(xp, item as Pick<Item, 'affinityBase' | 'isRank40' | 'kind' | 'maxRank'>);
}

export function pointsFromXp(
  xp: number,
  item: Pick<Item, 'affinityBase' | 'masteryRank' | 'points' | 'isRank40' | 'kind' | 'maxRank'>,
): number {
  if (!Number.isFinite(xp) || xp <= 0) return 0;
  const rank = Math.min(item.masteryRank, rankForAffinity(xp, item));
  return Math.floor((rank / item.masteryRank) * item.points);
}

export function isMastered(xp: number, item: Pick<Item, 'maxXpForPoints'>): boolean {
  return Number.isFinite(xp) && xp >= item.maxXpForPoints;
}

export function remainingXp(xp: number, item: Pick<Item, 'maxXpForPoints'>): number {
  return Math.max(0, item.maxXpForPoints - Math.max(0, xp));
}

/**
 * Resolve one item against profile XP and a manual override.
 * A `true` override means "fully ranked", so it uses the item's max XP
 * (rank 40 for Kuva/Tenet/Coda/Paracesis and Necramechs).
 */
export function computeItemState(
  item: Item,
  profileXp: number | undefined,
  override?: boolean,
): ItemState {
  const rawXp = Number.isFinite(profileXp) ? Math.max(0, profileXp ?? 0) : 0;
  const xp = override === true ? item.maxXp : override === false ? 0 : rawXp;
  return {
    item,
    xp,
    rank: rankFromXp(xp, item),
    points: pointsFromXp(xp, item),
    mastered: isMastered(xp, item),
    remainingXp: remainingXp(xp, item),
    override,
  };
}

export function computeItemStates(
  items: Item[],
  xpByItem: Record<string, number>,
  overrides: Overrides,
): ItemState[] {
  return items.map((item) => computeItemState(item, xpByItem[item.uniqueName], overrides[item.uniqueName]));
}

export function manualPoints(extras: ManualExtras): number {
  return (
    Math.max(0, Math.floor(extras.junctions)) * JUNCTION_POINTS +
    Math.max(0, Math.floor(extras.intrinsics)) * INTRINSIC_POINTS +
    Math.max(0, Math.floor(extras.starChartPoints))
  );
}

export function computeMasteryStats(
  states: ItemState[],
  extras: ManualExtras,
  missions: MissionProgress[] = [],
  intrinsicRanks = 0,
): MasteryStats {
  const itemPoints = states.reduce((total, state) => total + state.points, 0);
  const missionBreakdown = calculateMissionBreakdown(missions);
  const fromProfile = missionBreakdown.hasProfileData;
  const profileJunctionPoints = missionBreakdown.completedJunctions * JUNCTION_POINTS;
  const junctionPoints = fromProfile
    ? profileJunctionPoints
    : Math.max(0, Math.floor(extras.junctions)) * JUNCTION_POINTS;
  const nodePoints = fromProfile ? missionBreakdown.missionPoints - profileJunctionPoints : 0;
  const missionPoints = fromProfile ? nodePoints + profileJunctionPoints : 0;
  const intrinsicPoints = fromProfile
    ? intrinsicPointsFromRanks(intrinsicRanks)
    : Math.max(0, Math.floor(extras.intrinsics)) * INTRINSIC_POINTS;
  const starChartPoints = Math.max(0, Math.floor(extras.starChartPoints));
  const manual = (fromProfile ? 0 : junctionPoints) + starChartPoints;
  const totalPoints = itemPoints + missionPoints + intrinsicPoints + manual;
  const rank = rankForPoints(totalPoints);
  const currentThreshold = pointsForRank(rank);
  const nextThreshold = pointsForRank(rank + 1);
  const masteredCount = states.reduce((total, state) => total + (state.mastered ? 1 : 0), 0);
  const totalItems = states.length;
  const totalPossibleItemPoints = states.reduce((total, state) => total + state.item.points, 0);

  return {
    itemPoints,
    manualPoints: manual,
    missionPoints,
    intrinsicPoints,
    totalPoints,
    rank,
    nextRank: rank + 1,
    currentThreshold,
    nextThreshold,
    pointsToNext: Math.max(0, nextThreshold - totalPoints),
    progress:
      nextThreshold > currentThreshold
        ? Math.min(1, Math.max(0, (totalPoints - currentThreshold) / (nextThreshold - currentThreshold)))
        : 1,
    masteredCount,
    totalItems,
    completion: totalItems > 0 ? masteredCount / totalItems : 0,
    totalPossibleItemPoints,
    completedMissions: missionBreakdown.completedMissions,
    totalMissionNodes: missionBreakdown.totalMissionNodes,
    completedJunctions: missionBreakdown.completedJunctions,
    totalJunctions: missionBreakdown.totalJunctions,
    possibleMissionPoints: missionBreakdown.possibleMissionPoints,
    nodePoints,
    junctionPoints,
    starChartPoints,
  };
}

export interface BreakdownRow {
  id: 'warframes' | 'primary' | 'secondary' | 'melee' | 'companions' | 'archwing' | 'necramechs' | 'other' | 'nodes' | 'junctions' | 'intrinsics' | 'starchart';
  label: string;
  points: number;
}

const TAB_ROW_LABELS: Record<TabId, string> = {
  warframes: 'Warframes',
  primary: 'Primary',
  secondary: 'Secondary',
  melee: 'Melee',
  companions: 'Companions',
  archwing: 'Archwing',
  necramechs: 'Necramechs',
  other: 'Other',
};

/** One row per mastery source. The rows always sum to `stats.totalPoints`. */
export function categoryBreakdown(states: ItemState[], stats: MasteryStats): BreakdownRow[] {
  const byTab = new Map<TabId, number>();
  for (const state of states) {
    byTab.set(state.item.tab, (byTab.get(state.item.tab) ?? 0) + state.points);
  }
  const itemRows: BreakdownRow[] = (Object.keys(TAB_ROW_LABELS) as TabId[]).map((id) => ({
    id,
    label: TAB_ROW_LABELS[id],
    points: byTab.get(id) ?? 0,
  }));
  return [
    ...itemRows,
    { id: 'nodes', label: 'Star Chart missions', points: stats.nodePoints },
    { id: 'junctions', label: 'Junctions', points: stats.junctionPoints },
    { id: 'intrinsics', label: 'Intrinsics', points: stats.intrinsicPoints },
    { id: 'starchart', label: 'Extra Star Chart points', points: stats.starChartPoints },
  ];
}

/** Remaining XP to the next mastery award, used by the "Next up" list. */
export function nextUpRemainingXp(state: ItemState): number {
  return state.remainingXp;
}
