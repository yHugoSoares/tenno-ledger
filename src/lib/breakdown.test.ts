import { describe, expect, it } from 'vitest';
import { itemByName, testItems } from '@/fixtures/testData';
import { categoryBreakdown, computeItemStates, computeMasteryStats } from '@/lib/mastery';

const noExtras = { junctions: 0, intrinsics: 0, starChartPoints: 0 };

describe('category breakdown', () => {
  it('sums every source to the total mastery points', () => {
    const states = computeItemStates(
      testItems,
      {
        [itemByName('Excalibur').uniqueName]: 900_000,
        [itemByName('Braton').uniqueName]: 100_000,
      },
      {},
    );
    const stats = computeMasteryStats(
      states,
      { ...noExtras, starChartPoints: 1_234 },
      [
        { tag: 'SolNode63', completes: 1 },
        { tag: 'EarthToVenusJunction', completes: 1 },
      ],
      2,
    );
    const rows = categoryBreakdown(states, stats);

    expect(rows.reduce((total, row) => total + row.points, 0)).toBe(stats.totalPoints);
    expect(rows.find((row) => row.id === 'nodes')?.points).toBe(24);
    expect(rows.find((row) => row.id === 'junctions')?.points).toBe(1_000);
    expect(rows.find((row) => row.id === 'intrinsics')?.points).toBe(3_000);
    expect(rows.find((row) => row.id === 'starchart')?.points).toBe(1_234);
  });

  it('does not double count manual intrinsics or junctions without profile data', () => {
    const stats = computeMasteryStats([], { junctions: 1, intrinsics: 2, starChartPoints: 0 });
    expect(stats.intrinsicPoints).toBe(3_000);
    expect(stats.junctionPoints).toBe(1_000);
    expect(stats.manualPoints).toBe(1_000);
    expect(stats.totalPoints).toBe(4_000);
  });
});
