export interface RecipeComponent {
  name: string;
  uniqueName: string;
  itemCount: number;
}

export interface Recipe {
  name: string;
  category?: string;
  type?: string;
  imageName?: string;
  components: RecipeComponent[];
}

export type RecipeMap = Record<string, Recipe>;

export interface RelicReward {
  name: string;
  rarity: string;
  chance: number;
}

export interface Relic {
  /** Base name including "Relic", for example "Axi A1 Relic". */
  name: string;
  tier: string;
  imageName?: string;
  vaulted: boolean;
  /** Epoch milliseconds when the relic entered the Prime Vault, when known. */
  vaultedAt?: number;
  /** Epoch milliseconds when the relic was first released, when known. */
  introducedAt?: number;
  /** Radiant refinement drop table. */
  rewards: RelicReward[];
}

export interface RelicSource {
  relic: Relic;
  reward: RelicReward;
}

/** Component names are already full reward names (see scripts/sync-game-data.mjs). */
export function componentDisplayName(_parentName: string, component: RecipeComponent): string {
  return component.name;
}

export function buildRelicIndex(relics: Relic[]): Map<string, RelicSource[]> {
  const index = new Map<string, RelicSource[]>();
  for (const relic of relics) {
    for (const reward of relic.rewards) {
      const list = index.get(reward.name) ?? [];
      list.push({ relic, reward });
      index.set(reward.name, list);
    }
  }
  for (const list of index.values()) {
    list.sort((a, b) => b.reward.chance - a.reward.chance);
  }
  return index;
}

let recipesRequest: Promise<RecipeMap> | null = null;
let relicsRequest: Promise<Relic[]> | null = null;

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Could not load ${url} (HTTP ${response.status}).`);
  return (await response.json()) as T;
}

/** Loads once per session. A failed request is retried on the next call. */
export function loadRecipes(): Promise<RecipeMap> {
  recipesRequest ??= getJson<RecipeMap>('/data/recipes.json').catch((error: unknown) => {
    recipesRequest = null;
    throw error;
  });
  return recipesRequest;
}

export function loadRelics(): Promise<Relic[]> {
  relicsRequest ??= getJson<Relic[]>('/data/relics.json').catch((error: unknown) => {
    relicsRequest = null;
    throw error;
  });
  return relicsRequest;
}
