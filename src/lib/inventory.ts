/** Counts of items you type in yourself: resources, relics, mods, parts. Stored only in this browser. */
export const INVENTORY_STORAGE_KEY = 'tenno-ledger.inventory.v1';

export type ManualInventory = Record<string, number>;

export type ManualItemType = 'relic' | 'prime' | 'blueprint' | 'resource';

export const MANUAL_TYPE_LABELS: Record<ManualItemType, string> = {
  relic: 'Relic',
  prime: 'Prime part',
  blueprint: 'Blueprint',
  resource: 'Resource',
};

/**
 * Best-effort grouping for entries typed by hand. The profile cannot supply these counts,
 * so names are matched against the relic and reward data we already ship.
 */
export function classifyManualItem(
  name: string,
  relicNames: ReadonlySet<string>,
  rewardNames: ReadonlySet<string>,
): ManualItemType {
  if (relicNames.has(name)) return 'relic';
  if (rewardNames.has(name)) return /blueprint$/i.test(name) ? 'blueprint' : 'prime';
  if (/blueprint$/i.test(name)) return 'blueprint';
  return 'resource';
}

export function sanitizeInventory(value: unknown): ManualInventory {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const result: ManualInventory = {};
  for (const [name, count] of Object.entries(value)) {
    if (typeof count === 'number' && Number.isFinite(count) && count > 0 && name.trim().length > 0) {
      result[name] = Math.floor(count);
    }
  }
  return result;
}

export function loadManualInventory(): ManualInventory {
  try {
    const raw = window.localStorage.getItem(INVENTORY_STORAGE_KEY);
    return raw ? sanitizeInventory(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

export function saveManualInventory(inventory: ManualInventory): void {
  try {
    window.localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(inventory));
  } catch {
    // Storage can be unavailable in private modes. The page keeps working in memory.
  }
}

/** Returns a new inventory with `name` set to `count`. Zero or negative counts remove the entry. */
export function setInventoryCount(inventory: ManualInventory, name: string, count: number): ManualInventory {
  const next = { ...inventory };
  const safe = Number.isFinite(count) ? Math.floor(count) : 0;
  if (safe > 0) next[name] = safe;
  else delete next[name];
  return next;
}
