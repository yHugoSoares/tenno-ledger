import { describe, expect, it } from 'vitest';
import { rawItems } from '@/fixtures/testData';
import {
  classifyItem,
  isRank40Name,
  itemImageUrl,
  itemsInTab,
  normalizeItems,
  tabCounts,
  toItem,
} from '@/lib/items';

describe('rank-40 detection', () => {
  it('matches Kuva, Tenet, Coda, and Paracesis', () => {
    expect(isRank40Name('Kuva Bramma')).toBe(true);
    expect(isRank40Name('Tenet Arca Plasmor')).toBe(true);
    expect(isRank40Name('Coda Bubonico')).toBe(true);
    expect(isRank40Name('Paracesis')).toBe(true);
  });

  it('does not match ordinary weapons', () => {
    expect(isRank40Name('Braton')).toBe(false);
    expect(isRank40Name('Kuva')).toBe(false);
    expect(isRank40Name('Paracesis Prime')).toBe(false);
  });
});

describe('item classification', () => {
  it('classifies Warframes, weapons, companions, and Archwing', () => {
    expect(classifyItem(rawItems[0]!)).toMatchObject({ tab: 'warframes', points: 6_000, maxRank: 30 });
    expect(classifyItem(rawItems[2]!)).toMatchObject({ tab: 'primary', points: 3_000, maxRank: 40 });
    expect(classifyItem(rawItems[4]!)).toMatchObject({ tab: 'companions', points: 6_000 });
    expect(classifyItem(rawItems[5]!)).toMatchObject({ tab: 'companions', points: 3_000 });
    expect(classifyItem(rawItems[6]!)).toMatchObject({ tab: 'archwing', points: 6_000 });
    expect(classifyItem(rawItems[7]!)).toMatchObject({ tab: 'archwing', points: 3_000 });
  });

  it('classifies Necramechs with an 8,000 point cap', () => {
    expect(classifyItem(rawItems[1]!)).toMatchObject({
      tab: 'necramechs',
      points: 8_000,
      maxRank: 40,
      masteryRank: 40,
    });
  });

  it('classifies K-Drives and modular parts', () => {
    expect(classifyItem(rawItems[8]!)).toMatchObject({ tab: 'other', points: 6_000 });
    expect(classifyItem(rawItems[9]!)).toMatchObject({ tab: 'other', points: 3_000 });
    expect(classifyItem(rawItems[10]!)).toMatchObject({ tab: 'melee', points: 3_000 });
  });
});

describe('toItem', () => {
  it('derives XP caps and image URLs', () => {
    const excalibur = toItem(rawItems[0]!);
    expect(excalibur.maxXp).toBe(900_000);
    expect(excalibur.maxXpForPoints).toBe(900_000);
    expect(excalibur.isRank40).toBe(false);
    expect(excalibur.imageUrl).toContain('excalibur.png');

    const bramma = toItem(rawItems[2]!);
    expect(bramma.maxXp).toBe(3_710_000);
    expect(bramma.maxXpForPoints).toBe(450_000);
    expect(bramma.isRank40).toBe(true);
  });

  it('defaults a missing mastery requirement to zero', () => {
    const item = toItem({ ...rawItems[0]!, masteryReq: undefined });
    expect(item.masteryReq).toBe(0);
  });

  it('returns null image URLs when no image name exists', () => {
    expect(itemImageUrl(undefined)).toBeNull();
    expect(itemImageUrl('ash.png')).toBe('https://cdn.warframestat.us/img/ash.png');
  });
});

describe('normalizeItems', () => {
  it('keeps only masterable items and sorts by name', () => {
    const items = normalizeItems(rawItems);
    expect(items.some((item) => item.name === 'Not Masterable')).toBe(false);
    expect(items).toHaveLength(rawItems.filter((item) => item.masterable).length);
    const names = items.map((item) => item.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it('de-duplicates by uniqueName', () => {
    const items = normalizeItems([rawItems[0]!, rawItems[0]!]);
    expect(items).toHaveLength(1);
  });

  it('rejects malformed payloads', () => {
    expect(() => normalizeItems([{ name: 'Broken' }])).toThrow();
    expect(() => normalizeItems({})).toThrow();
  });
});

describe('tab helpers', () => {
  const items = normalizeItems(rawItems);

  it('counts items per tab', () => {
    const counts = tabCounts(items);
    expect(counts.warframes).toBe(2);
    expect(counts.necramechs).toBe(1);
    expect(counts.companions).toBe(3);
    expect(counts.archwing).toBe(2);
  });

  it('filters items by tab', () => {
    expect(itemsInTab(items, 'primary').every((item) => item.tab === 'primary')).toBe(true);
    expect(itemsInTab(items, 'other')).toHaveLength(2);
  });
});
