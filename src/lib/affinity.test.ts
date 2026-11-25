import { describe, expect, it } from 'vitest';
import { itemByName } from '@/fixtures/testData';
import { affinityForRank, rankForAffinity } from '@/lib/affinity';

describe('affinity thresholds', () => {
  it('uses quadratic thresholds for ordinary items', () => {
    const frame = itemByName('Excalibur');
    const weapon = itemByName('Braton');
    expect(affinityForRank(30, frame)).toBe(900_000);
    expect(affinityForRank(30, weapon)).toBe(450_000);
    expect(rankForAffinity(449_999, weapon)).toBe(29);
    expect(rankForAffinity(450_000, weapon)).toBe(30);
  });

  it('uses the Forma-cycle thresholds for overlevelled weapons', () => {
    const weapon = itemByName('Kuva Bramma');
    expect(affinityForRank(30, weapon)).toBe(450_000);
    expect(affinityForRank(31, weapon)).toBe(930_500);
    expect(affinityForRank(40, weapon)).toBe(3_710_000);
    expect(rankForAffinity(930_500, weapon)).toBe(31);
  });

  it('uses Necramech rank-40 thresholds', () => {
    const mech = itemByName('Voidrig');
    expect(affinityForRank(30, mech)).toBe(900_000);
    expect(affinityForRank(31, mech)).toBe(1_861_000);
    expect(affinityForRank(40, mech)).toBe(7_420_000);
    expect(rankForAffinity(1_860_999, mech)).toBe(30);
  });
});
