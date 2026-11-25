import { componentDisplayName, type Recipe, type RelicSource } from './gameData';
import type { ManualInventory } from './inventory';

export interface ComponentNeed {
  name: string;
  need: number;
  have: number;
  missing: number;
}

export function componentNeeds(recipe: Recipe, inventory: ManualInventory): ComponentNeed[] {
  return recipe.components.map((component) => {
    const name = componentDisplayName(recipe.name, component);
    const need = component.itemCount;
    const have = inventory[name] ?? 0;
    return { name, need, have, missing: Math.max(0, need - have) };
  });
}

export function craftSummary(needs: ComponentNeed[]): { ready: boolean; missingParts: number } {
  const missingParts = needs.filter((need) => need.missing > 0).length;
  return { ready: missingParts === 0, missingParts };
}

/** Where a part drops, most likely first. Vaulted relics are returned last. */
export function sortSources(sources: RelicSource[]): RelicSource[] {
  return [...sources].sort((a, b) => {
    if (a.relic.vaulted !== b.relic.vaulted) return a.relic.vaulted ? 1 : -1;
    return b.reward.chance - a.reward.chance;
  });
}
