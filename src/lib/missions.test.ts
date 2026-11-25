import { describe, expect, it } from 'vitest';
import {
  calculateMissionBreakdown,
  intrinsicPointsFromRanks,
  intrinsicRanksFromSkills,
  TOTAL_JUNCTION_POINTS,
  TOTAL_MISSION_POINTS,
  TRACKED_MISSION_NODES,
} from '@/lib/missions';

describe('mission mastery', () => {
  it('uses first completion only and awards junctions separately', () => {
    const breakdown = calculateMissionBreakdown([
      { tag: 'SolNode63', completes: 1 },
      { tag: 'SolNode63', completes: 12 },
      { tag: 'EarthToVenusJunction', completes: 1 },
      { tag: 'SolNode27', completes: 0 },
    ]);

    expect(breakdown.missionPoints).toBe(24 + 1_000);
    expect(breakdown.completedMissions).toBe(1);
    expect(breakdown.completedJunctions).toBe(1);
    expect(breakdown.totalJunctions).toBe(13);
    expect(breakdown.hasProfileData).toBe(true);
  });

  it('reports unknown completed tags without inventing XP', () => {
    const breakdown = calculateMissionBreakdown([
      { tag: 'SolNodeThatDoesNotExist', completes: 1 },
      { tag: 'ClanNode8', completes: 1 },
    ]);
    expect(breakdown.missionPoints).toBe(0);
    expect(breakdown.unknownCompletedTags).toContain('SolNodeThatDoesNotExist');
    expect(breakdown.unknownCompletedTags).toContain('ClanNode8');
  });

  it('exposes the verified current mission totals', () => {
    expect(TOTAL_MISSION_POINTS).toBe(14_569);
    expect(TOTAL_JUNCTION_POINTS).toBe(13_000);
    expect(TRACKED_MISSION_NODES).toBeGreaterThan(100);
  });
});

describe('intrinsic mastery', () => {
  it('counts only LPS intrinsic fields, not LPP focus pools', () => {
    expect(
      intrinsicRanksFromSkills({
        LPS_DRIFT_RIDING: 2,
        LPS_DRIFT_COMBAT: 3,
        LPP_DRIFTER: 24_000,
      }),
    ).toBe(5);
    expect(intrinsicPointsFromRanks(5)).toBe(7_500);
  });
});
