import {
  ITEMS_CACHE_KEY,
  ITEMS_DATA_VERSION,
  ITEMS_TTL_MS,
  ITEMS_URL,
  WFCD_CATEGORY_FILES,
  WFCD_RAW_BASE,
} from './constants';
import { idbGet, idbSet } from './idb';
import { normalizeItems } from './items';
import type { Item } from './types';

export type ItemSource = 'cache' | 'cache-stale' | 'same-origin' | 'github';

export interface LoadedItems {
  items: Item[];
  source: ItemSource;
  savedAt: number;
  warning?: string;
}

interface CachedItems {
  version: number;
  savedAt: number;
  items: Item[];
}

async function fetchJson(url: string, timeoutMs = 45_000): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-cache',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function parseItemPayload(payload: unknown): Item[] {
  const raw = Array.isArray(payload)
    ? payload
    : typeof payload === 'object' && payload !== null && 'items' in payload
      ? (payload as { items: unknown }).items
      : payload;
  const items = normalizeItems(raw);
  if (items.length === 0) {
    throw new Error('Item payload contained no masterable items');
  }
  return items;
}

async function fetchSameOrigin(): Promise<Item[]> {
  const payload = await fetchJson(ITEMS_URL);
  return parseItemPayload(payload);
}

async function fetchGithubFallback(): Promise<Item[]> {
  const merged: unknown[] = [];
  for (const file of WFCD_CATEGORY_FILES) {
    const payload = await fetchJson(`${WFCD_RAW_BASE}/${file}.json`);
    if (Array.isArray(payload)) {
      merged.push(...payload.filter((item) => {
        return (
          typeof item === 'object' &&
          item !== null &&
          (item as { masterable?: unknown }).masterable === true
        );
      }));
    }
  }
  return parseItemPayload(merged);
}

async function saveCache(items: Item[], savedAt: number): Promise<void> {
  const record: CachedItems = { version: ITEMS_DATA_VERSION, savedAt, items };
  await idbSet(ITEMS_CACHE_KEY, record);
}

export async function loadItems(options: { force?: boolean } = {}): Promise<LoadedItems> {
  const cached = await idbGet<CachedItems>(ITEMS_CACHE_KEY);
  const now = Date.now();
  const cacheUsable =
    cached !== undefined &&
    cached.version === ITEMS_DATA_VERSION &&
    Array.isArray(cached.items) &&
    cached.items.length > 0;

  if (cacheUsable && !options.force && now - cached.savedAt < ITEMS_TTL_MS) {
    return { items: cached.items, source: 'cache', savedAt: cached.savedAt };
  }

  try {
    const items = await fetchSameOrigin();
    await saveCache(items, now);
    return { items, source: 'same-origin', savedAt: now };
  } catch (sameOriginError) {
    try {
      const items = await fetchGithubFallback();
      await saveCache(items, now);
      return {
        items,
        source: 'github',
        savedAt: now,
        warning: 'Loaded item data from the GitHub fallback because the local mirror was unavailable.',
      };
    } catch (githubError) {
      if (cacheUsable) {
        return {
          items: cached.items,
          source: 'cache-stale',
          savedAt: cached.savedAt,
          warning: 'Could not refresh item data. Showing the last cached copy.',
        };
      }
      const detail =
        githubError instanceof Error
          ? githubError.message
          : sameOriginError instanceof Error
            ? sameOriginError.message
            : 'Unknown error';
      throw new Error(`Could not load the Warframe item database. ${detail}`);
    }
  }
}

export async function clearItemCache(): Promise<void> {
  const { idbDelete } = await import('./idb');
  await idbDelete(ITEMS_CACHE_KEY);
}
