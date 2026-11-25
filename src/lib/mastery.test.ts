import { describe, expect, it } from 'vitest';
import { itemByName } from '@/fixtures/testData';
import {
  computeItemState,
  computeItemStates,
  computeMasteryStats,
  formatMasteryRank,
  isMastered,
  manualPoints,
  masteryRankName,
  pointsForRank,
  pointsFromXp,
  pointsToNextRank,
  progressToNextRank,
  rankForPoints,
  rankFromXp,
  remainingXp,
} from '@/lib/mastery';
import type { ManualExtras } from '@/lib/types';

const noExtras: ManualExtras = { junctions: 0, intrinsics: 0, starChartPoints: 0 };

describe('mastery rank thresholds', () => {
  it('uses 2,500 x rank squared', () => {
    expect(pointsForRank(0)).toBe(0);
    expect(pointsForRank(1)).toBe(2_500);
    expect(pointsForRank(18)).toBe(810_000);
    expect(pointsForRank(30)).toBe(2_250_000);
  });

  it('converts points to the highest completed rank', () => {
    expect(rankForPoints(0)).toBe(0);
    expect(rankForPoints(809_999)).toBe(17);
    expect(rankForPoints(810_000)).toBe(18);
    expect(rankForPoints(-10)).toBe(0);
    expect(rankForPoints(Number.NaN)).toBe(0);
  });

  it('calculates points and progress to the next rank', () => {
    expect(pointsToNextRank(810_000)).toBe(92_500);
    expect(pointsToNextRank(0)).toBe(2_500);
    expect(progressToNextRank(0)).toBe(0);
    expect(progressToNextRank(1_250)).toBeCloseTo(0.5);
    expect(progressToNextRank(2_500)).toBe(0);
  });

  it('formats normal and legendary ranks', () => {
    expect(formatMasteryRank(18)).toBe('MR 18');
    expect(formatMasteryRank(30)).toBe('MR 30');
    expect(formatMasteryRank(31)).toBe('LR 1');
    expect(masteryRankName(31)).toBe('Legendary 1');
  });
});

describe('XP to rank and points', () => {
  it('handles frames, weapons, rank-40 weapons, and Necramechs', () => {
    const excalibur = itemByName('Excalibur');
    const braton = itemByName('Braton');
    const bramma = itemByName('Kuva Bramma');
    const voidrig = itemByName('Voidrig');

    expect(rankFromXp(450_000, excalibur)).toBe(21);
    expect(rankFromXp(900_000, excalibur)).toBe(30);
    expect(rankFromXp(450_000, braton)).toBe(30);
    expect(rankFromXp(600_000, bramma)).toBe(30);
    expect(rankFromXp(1_200_000, voidrig)).toBe(30);
  });

  it('caps mastery points at the item maximum', () => {
    const excalibur = itemByName('Excalibur');
    const bramma = itemByName('Kuva Bramma');
    const voidrig = itemByName('Voidrig');

    expect(pointsFromXp(900_000, excalibur)).toBe(6_000);
    expect(pointsFromXp(1_350_000, excalibur)).toBe(6_000);
    expect(pointsFromXp(600_000, bramma)).toBe(3_000);
    expect(pointsFromXp(900_000, voidrig)).toBe(6_000);
    expect(pointsFromXp(1_200_000, voidrig)).toBe(6_000);
  });

  it('reports mastery and remaining XP correctly', () => {
    const excalibur = itemByName('Excalibur');
    const bramma = itemByName('Kuva Bramma');

    expect(isMastered(899_999, excalibur)).toBe(false);
    expect(isMastered(900_000, excalibur)).toBe(true);
    expect(remainingXp(450_000, excalibur)).toBe(450_000);
    expect(remainingXp(2_000_000, excalibur)).toBe(0);
    expect(isMastered(450_000, bramma)).toBe(true);
    expect(isMastered(449_999, bramma)).toBe(false);
  });
});

describe('item state and overrides', () => {
  it('resolves profile XP into rank, points, and mastery', () => {
    const excalibur = itemByName('Excalibur');
    const state = computeItemState(excalibur, 450_000);
    expect(state.rank).toBe(21);
    expect(state.points).toBe(4_200);
    expect(state.mastered).toBe(false);
    expect(state.remainingXp).toBe(450_000);
  });

  it('treats missing XP as zero', () => {
    const braton = itemByName('Braton');
    const state = computeItemState(braton, undefined);
    expect(state.xp).toBe(0);
    expect(state.points).toBe(0);
    expect(state.mastered).toBe(false);
  });

  it('applies mastered and missing overrides', () => {
    const bramma = itemByName('Kuva Bramma');
    const mastered = computeItemState(bramma, 0, true);
    expect(mastered.rank).toBe(40);
    expect(mastered.points).toBe(3_000);
    expect(mastered.mastered).toBe(true);
    expect(mastered.override).toBe(true);

    const missing = computeItemState(bramma, 600_000, false);
    expect(missing.xp).toBe(0);
    expect(missing.mastered).toBe(false);
    expect(missing.override).toBe(false);
  });

  it('computes many states at once', () => {
    const items = [itemByName('Excalibur'), itemByName('Braton')];
    const states = computeItemStates(items, { [items[0]!.uniqueName]: 900_000 }, {});
    expect(states).toHaveLength(2);
    expect(states[0]!.mastered).toBe(true);
    expect(states[1]!.mastered).toBe(false);
  });
});

describe('manual points and aggregate stats', () => {
  it('values junctions, intrinsics, and Star Chart points', () => {
    expect(manualPoints(noExtras)).toBe(0);
    expect(manualPoints({ junctions: 15, intrinsics: 10, starChartPoints: 5_000 })).toBe(35_000);
    expect(manualPoints({ junctions: -5, intrinsics: 0, starChartPoints: 0 })).toBe(0);
  });

  it('aggregates item points, manual points, and completion', () => {
    const items = [itemByName('Excalibur'), itemByName('Braton'), itemByName('Voidrig')];
    const states = computeItemStates(
      items,
      {
        [items[0]!.uniqueName]: 900_000,
        [items[1]!.uniqueName]: 450_000,
      },
      {},
    );
    const stats = computeMasteryStats(states, { junctions: 1, intrinsics: 0, starChartPoints: 0 });
    expect(stats.itemPoints).toBe(6_000 + 3_000);
    expect(stats.manualPoints).toBe(1_000);
    expect(stats.totalPoints).toBe(10_000);
    expect(stats.rank).toBe(2);
    expect(stats.masteredCount).toBe(2);
    expect(stats.totalItems).toBe(3);
    expect(stats.completion).toBeCloseTo(2 / 3);
    expect(stats.totalPossibleItemPoints).toBe(6_000 + 3_000 + 8_000);
    expect(stats.pointsToNext).toBe(pointsForRank(3) - 10_000);
  });

  it('combines item, mission, junction, and profile intrinsic points', () => {
    const item = itemByName('Excalibur');
    const states = computeItemStates([item], { [item.uniqueName]: 900_000 }, {});
    const stats = computeMasteryStats(
      states,
      { junctions: 99, intrinsics: 99, starChartPoints: 0 },
      [
        { tag: 'SolNode63', completes: 1 },
        { tag: 'EarthToVenusJunction', completes: 1 },
      ],
      2,
    );

    expect(stats.itemPoints).toBe(6_000);
    expect(stats.missionPoints).toBe(1_024);
    expect(stats.intrinsicPoints).toBe(3_000);
    expect(stats.manualPoints).toBe(0);
    expect(stats.totalPoints).toBe(10_024);
    expect(stats.completedMissions).toBe(1);
    expect(stats.completedJunctions).toBe(1);
  });
});
