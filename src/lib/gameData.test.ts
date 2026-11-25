import { describe, expect, it } from 'vitest';
import { buildRelicIndex, componentDisplayName, type Relic } from '@/lib/gameData';
import { componentNeeds, craftSummary, sortSources } from '@/lib/crafting';
import { classifyManualItem, sanitizeInventory, setInventoryCount } from '@/lib/inventory';

const relics: Relic[] = [
  {
    name: 'Meso A1',
    tier: 'Meso',
    vaulted: false,
    rewards: [
      { name: 'Excalibur Prime Chassis', rarity: 'Uncommon', chance: 11 },
      { name: 'Orokin Cell', rarity: 'Common', chance: 25.33 },
    ],
  },
  {
    name: 'Lith K1',
    tier: 'Lith',
    vaulted: true,
    rewards: [{ name: 'Excalibur Prime Chassis', rarity: 'Rare', chance: 20 }],
  },
];

describe('component names', () => {
  it('uses the full reward name as stored by the sync', () => {
    const part = { name: 'Ash Prime Chassis', uniqueName: '/Lotus/Types/Recipes/WarframeRecipes/AshPrimeChassisComponent', itemCount: 1 };
    expect(componentDisplayName('Ash Prime', part)).toBe('Ash Prime Chassis');
  });
});

describe('relic index', () => {
  it('lists every relic that drops a reward, best chance first', () => {
    const index = buildRelicIndex(relics);
    const sources = index.get('Excalibur Prime Chassis') ?? [];
    expect(sources.map((source) => source.relic.name)).toEqual(['Lith K1', 'Meso A1']);
    expect(index.get('Missing part')).toBeUndefined();
  });

  it('puts vaulted relics after available ones', () => {
    const sources = sortSources(buildRelicIndex(relics).get('Excalibur Prime Chassis') ?? []);
    expect(sources[0]?.relic.vaulted).toBe(false);
    expect(sources[sources.length - 1]?.relic.vaulted).toBe(true);
  });
});

describe('crafting needs', () => {
  const recipe = {
    name: 'Excalibur Prime',
    components: [
      { name: 'Excalibur Prime Chassis', uniqueName: '/Lotus/Types/Recipes/WarframeRecipes/ChassisComponent', itemCount: 1 },
      { name: 'Orokin Cell', uniqueName: '/Lotus/Types/Items/MiscItems/OrokinCell', itemCount: 3 },
    ],
  };

  it('compares what you need with your manual inventory', () => {
    const needs = componentNeeds(recipe, { 'Excalibur Prime Chassis': 1, 'Orokin Cell': 1 });
    expect(needs).toEqual([
      { name: 'Excalibur Prime Chassis', need: 1, have: 1, missing: 0 },
      { name: 'Orokin Cell', need: 3, have: 1, missing: 2 },
    ]);
    expect(craftSummary(needs)).toEqual({ ready: false, missingParts: 1 });
  });

  it('is ready when every component is covered', () => {
    const needs = componentNeeds(recipe, { 'Excalibur Prime Chassis': 2, 'Orokin Cell': 3 });
    expect(craftSummary(needs)).toEqual({ ready: true, missingParts: 0 });
  });
});

describe('manual inventory', () => {
  it('drops invalid stored values', () => {
    expect(sanitizeInventory({ 'Orokin Cell': 4, Bad: 'x', Negative: -2, '': 5, Fraction: 2.7 })).toEqual({
      'Orokin Cell': 4,
      Fraction: 2,
    });
    expect(sanitizeInventory(null)).toEqual({});
  });

  it('removes an entry when its count is set to zero', () => {
    const start = { 'Orokin Cell': 4 };
    expect(setInventoryCount(start, 'Orokin Cell', 0)).toEqual({});
    expect(setInventoryCount(start, 'Forma', 2)).toEqual({ 'Orokin Cell': 4, Forma: 2 });
    expect(start).toEqual({ 'Orokin Cell': 4 });
  });

  it('groups manual entries into useful types', () => {
    const relicNames = new Set(['Axi A1 Relic']);
    const rewardNames = new Set(['Ash Prime Chassis Blueprint', 'Forma Blueprint']);
    expect(classifyManualItem('Axi A1 Relic', relicNames, rewardNames)).toBe('relic');
    expect(classifyManualItem('Ash Prime Chassis Blueprint', relicNames, rewardNames)).toBe('blueprint');
    expect(classifyManualItem('Forma Blueprint', relicNames, rewardNames)).toBe('blueprint');
    expect(classifyManualItem('Orokin Cell', relicNames, rewardNames)).toBe('resource');
  });
});
